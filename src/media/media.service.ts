import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../generated/prisma/client';
import { PostgresService } from '../database/postgres/postgres.service';

import { MediaEntityType, MediaPurpose, MediaRole, MediaStatus, MediaType } from '../../generated/prisma/enums';

import { MEDIA_STORAGE } from './constants/media.tokens';

import { type MediaStorageProvider } from './interfaces/media-storage-provider.interface';
import { MediaFile } from './interfaces/media-file.interface';
import { UploadMediaInput } from './interfaces/media-upload.interface';
import { AttachMediaInput } from './interfaces/media-attach.interface';

@Injectable()
export class MediaService {
    constructor(
        private readonly prisma: PostgresService,
        private readonly configService: ConfigService,

        @Inject(MEDIA_STORAGE)
        private readonly storage: MediaStorageProvider,
    ) { }

    // UPLOAD
    async upload({
        file,
        purpose,
        uploadedById,
    }: UploadMediaInput) {
        this.validateFile(file);

        const mediaType = this.getMediaType(file.mimetype);
        const resourceType = mediaType === MediaType.VIDEO ? 'video' : 'image';

        const folder = this.getStorageFolder(purpose);

        let uploaded: Awaited<ReturnType<MediaStorageProvider['upload']>> | null = null;

        try {
            // 1. Upload physical file
            uploaded = await this.storage.upload(
                file.buffer,
                {
                    folder,
                    fileName: this.generateFileName(file.originalname),
                    mimeType: file.mimetype,
                    resourceType,
                },
            );

            // 2. Create Media record
            const media = await this.prisma.media.create({
                data: {
                    type: mediaType,
                    status: MediaStatus.TEMPORARY,
                    purpose,

                    url: uploaded.url,
                    storageProvider: this.storage.provider,
                    publicId: uploaded.publicId,

                    originalName: file.originalname,
                    mimeType: file.mimetype,
                    size: BigInt(file.size),

                    width: uploaded.width,
                    height: uploaded.height,
                    duration: uploaded.duration,

                    uploadedById,
                },
            });

            return this.serializeMedia(media);

        } catch (error) {

            // Storage succeeded but DB creation failed.
            // Clean up physical file.

            if (uploaded?.publicId) {
                try {
                    await this.storage.delete(uploaded.publicId, resourceType);
                } catch (cleanupError) {
                    // Cleanup failed, but the original error is more important.
                    console.error('Failed to cleanup uploaded media:', cleanupError);
                }
            }

            throw error;
        }
    }

    // FIND ALL
    async findAll() {
        const media = await this.prisma.media.findMany({
            where: {
                status: { not: MediaStatus.DELETED },
            },
            orderBy: { createdAt: 'desc' },
            include: { usages: true },
        });

        return media.map((item) => this.serializeMedia(item));
    }

    // FIND ONE
    async findOne(mediaId: string) {
        const media = await this.prisma.media.findFirst({
            where: {
                id: mediaId,
                status: { not: MediaStatus.DELETED },
            },
            include: { usages: true },
        });

        if (!media) {
            throw new NotFoundException('Media not found');
        }

        return this.serializeMedia(media);
    }

    // GET ENTITY MEDIA
    async getUsages(
        entityType: MediaEntityType,
        entityId: string,
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? this.prisma;

        return db.mediaUsage.findMany({
            where: {
                entityType,
                entityId,
            },

            include: {
                media: true,
            },

            orderBy: {
                sortOrder: 'asc',
            },
        });
    }

    async getUsagesByEntities(
        entityType: MediaEntityType,
        entityIds: string[],
        options?: {
            role?: MediaRole;
            excludeDeleted?: boolean;
        },
        tx?: Prisma.TransactionClient,
    ) {
        if (!entityIds.length) {
            return [];
        }
        const db = tx ?? this.prisma;

        return db.mediaUsage.findMany({
            where: {
                entityType,
                entityId: {
                    in: entityIds,
                },

                ...(options?.role && {
                    role: options.role,
                }),

                ...(options?.excludeDeleted && {
                    media: {
                        status: {
                            not: MediaStatus.DELETED,
                        },
                    },
                }),
            },
            include: {
                media: true,
            },
            orderBy: {
                sortOrder: 'asc',
            },
        });
    }

    // GET PRIMARY MEDIA
    async getPrimary(
        entityType: MediaEntityType,
        entityId: string,
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? this.prisma;

        const usage =
            await db.mediaUsage.findFirst({
                where: {
                    entityType,
                    entityId,
                    role: MediaRole.PRIMARY,
                },

                include: {
                    media: true,
                },
            });

        return usage?.media ?? null;
    }

    // ATTACH
    // ============================================================
    //
    // INTERNAL METHOD
    //
    // Called by:
    // ProductService
    // CategoryService
    // BannerService
    // CollectionService

    async attach(
        {
            mediaId,
            entityType,
            entityId,
            role,
            sortOrder = 0,
        }: AttachMediaInput,

        tx?: Prisma.TransactionClient,
    ) {

        const db = tx ?? this.prisma;

        const media =
            await db.media.findFirst({
                where: {
                    id: mediaId,
                    status: {
                        in: [MediaStatus.TEMPORARY, MediaStatus.ACTIVE],
                    },
                },
            });

        if (!media) {
            throw new NotFoundException('Media not found');
        }

        // 2. Only images/videos can be attached according
        // to the media type already stored.
        //
        // No entity-specific validation here.
        // Category/Product services can enforce their
        // own business rules if required.

        // 3. Check whether this exact media is already
        // attached to this entity.
        const existing =
            await db.mediaUsage.findFirst({
                where: {
                    mediaId,
                    entityType,
                    entityId,
                },
            });

        // 4. PRIMARY handling
        if (role === MediaRole.PRIMARY) {

            const existingPrimary =
                await db.mediaUsage.findFirst({
                    where: {
                        entityType,
                        entityId,
                        role: MediaRole.PRIMARY,

                        ...(existing ? { NOT: { id: existing.id } } : {}),
                    },
                });

            if (existingPrimary) {
                // Move previous primary to gallery.
                const maxGallery =
                    await db.mediaUsage.aggregate({
                        where: {
                            entityType,
                            entityId,
                            role: MediaRole.GALLERY,
                        },
                        _max: { sortOrder: true },
                    });

                await db.mediaUsage.update({
                    where: { id: existingPrimary.id },
                    data: {
                        role: MediaRole.GALLERY,
                        sortOrder: (maxGallery._max.sortOrder ?? -1) + 1,
                    },
                });
            }

            // PRIMARY always comes first.
            sortOrder = 0;
        }

        // 5. Create/update relationship
        let usage;

        if (existing) {
            usage =
                await db.mediaUsage.update({
                    where: { id: existing.id },
                    data: {
                        role,
                        sortOrder,
                    },
                    include: { media: true },
                });
        } else {
            usage =
                await db.mediaUsage.create({
                    data: {
                        mediaId,
                        entityType,
                        entityId,
                        role,
                        sortOrder,
                    },
                    include: { media: true },
                });
        }

        // 6. Temporary media becomes active once it is actually used.
        if (media.status === MediaStatus.TEMPORARY) {
            await db.media.update({
                where: { id: mediaId },
                data: { status: MediaStatus.ACTIVE },
            });
        }

        return usage;
    }

    // REPLACE PRIMARY MEDIA
    async replacePrimary(
        {
            mediaId,
            entityType,
            entityId,
        }: {
            mediaId: string;
            entityType: MediaEntityType;
            entityId: string;
        },

        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? this.prisma;

        // Validate new media first.
        const media =
            await db.media.findFirst({
                where: {
                    id: mediaId,
                    status: {
                        in: [MediaStatus.TEMPORARY, MediaStatus.ACTIVE],
                    },
                },
            });

        if (!media) {
            throw new NotFoundException('Media not found');
        }

        // ReplacePrimary is generic, so it does not decide
        // whether IMAGE or VIDEO is valid for a particular entity.

        // Remove current PRIMARY relationship.
        await db.mediaUsage.deleteMany({
            where: {
                entityType,
                entityId,
                role: MediaRole.PRIMARY,
            },
        });

        // Attach new primary.
        return this.attach(
            {
                mediaId,
                entityType,
                entityId,
                role: MediaRole.PRIMARY,
                sortOrder: 0,
            },
            tx,
        );
    }

    // DETACH
    async detach(
        mediaId: string,
        entityType: MediaEntityType,
        entityId: string,
        role?: MediaRole,
        tx?: Prisma.TransactionClient,
    ) {

        const db = tx ?? this.prisma;

        const usage =
            await db.mediaUsage.findFirst({
                where: {
                    mediaId,
                    entityType,
                    entityId,
                    ...(role ? { role } : {}),
                },
            });

        if (!usage) {
            throw new NotFoundException('Media usage not found');
        }

        await db.mediaUsage.delete({
            where: { id: usage.id },
        });

        return { success: true };
    }

    // DELETE MEDIA
    async delete(mediaId: string) {
        const media =
            await this.prisma.media.findFirst({
                where: {
                    id: mediaId,
                    status: { not: MediaStatus.DELETED },
                },

                include: { usages: true },
            });

        if (!media) {
            throw new NotFoundException('Media not found');
        }

        if (media.usages.length > 0) {
            throw new ConflictException('Media is currently being used and cannot be deleted');
        }

        if (media.publicId) {
            const resourceType = media.type === MediaType.VIDEO ? 'video' : 'image';

            await this.storage.delete(
                media.publicId,
                resourceType,
            );
        }

        const deletedMedia =
            await this.prisma.media.update({
                where: { id: media.id },

                data: {
                    status: MediaStatus.DELETED,
                    deletedAt: new Date(),
                },
            });

        return this.serializeMedia(deletedMedia);
    }

    // DELETE IF UNUSED
    async deleteIfUnused(mediaId: string) {
        const usageCount =
            await this.prisma.mediaUsage.count({
                where: { mediaId },
            });

        if (usageCount > 0) {
            return {
                deleted: false,
                reason: 'MEDIA_IN_USE',
            };
        }

        await this.delete(mediaId);

        return { deleted: true };
    }

    // VALIDATE FILE
    private validateFile(file: MediaFile) {
        if (!file) {
            throw new BadRequestException('File is required');
        }

        if (!file.buffer?.length) {
            throw new BadRequestException('File is empty');
        }

        if (!file.mimetype) {
            throw new BadRequestException('File MIME type is missing');
        }

        const allowedTypes = [
            // Images
            'image/jpeg',
            'image/png',
            'image/webp',

            // Videos
            'video/mp4',
            'video/webm',
            'video/quicktime',
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
        }

        const maxSizeMb = file.mimetype.startsWith('video/')
            ? this.configService.getOrThrow<number>('media.maxVideoSizeMb')
            : this.configService.getOrThrow<number>('media.maxImageSizeMb');

        const maxSizeBytes = maxSizeMb * 1024 * 1024;

        if (file.size > maxSizeBytes) {
            throw new BadRequestException(`File size cannot exceed ${maxSizeMb} MB`);
        }
    }

    // MEDIA TYPE
    private getMediaType(
        mimeType: string,
    ): MediaType {
        if (mimeType.startsWith('video/')) {
            return MediaType.VIDEO;
        }

        if (mimeType.startsWith('image/')) {
            return MediaType.IMAGE;
        }

        throw new BadRequestException(`Unsupported media type: ${mimeType}`);
    }

    // STORAGE FOLDER
    private getStorageFolder(purpose: MediaPurpose): string {
        return `kazraa/${purpose.toLowerCase().replace(/_/g, '-')}`;
    }

    // FILE NAME
    private generateFileName(originalName: string): string {
        const extension =
            originalName.includes('.')
                ? originalName.substring(originalName.lastIndexOf('.'))
                : '';

        return `${crypto.randomUUID()}${extension}`;
    }

    // SERIALIZATION
    private serializeMedia<T extends { size?: bigint | number | null }>(media: T) {
        return {
            ...media,
            size:
                media.size !== null &&
                    media.size !== undefined
                    ? Number(media.size) : null,
        };
    }
}