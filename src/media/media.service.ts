import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { PostgresService } from '../database/postgres/postgres.service';

import { MediaEntityType, MediaPurpose, MediaRole, MediaStatus, MediaType, StorageProvider } from '../../generated/prisma/enums';

import { type MediaStorageProvider } from './interfaces/media-storage-provider.interface';
import { MEDIA_STORAGE } from './constants/media.tokens';
import { ConfigService } from '@nestjs/config';

interface UploadMediaInput {
    file: Express.Multer.File;
    purpose: MediaPurpose;
    uploadedById?: string;
}

interface AttachMediaInput {
    mediaId: string;
    entityType: MediaEntityType;
    entityId: string;
    role: MediaRole;
    sortOrder?: number;
}

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
            // If storage upload succeeded but DB creation failed,
            // clean up the uploaded asset.
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

    // DELETE
    async delete(mediaId: string) {
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

        // Don't allow deletion of media that is currently used.
        if (media.usages.length > 0) {
            throw new ConflictException('Media is currently being used and cannot be deleted');
        }

        // Delete physical file from storage first.
        if (media.publicId) {
            const resourceType = media.type === MediaType.VIDEO ? 'video' : 'image';

            await this.storage.delete(media.publicId, resourceType);
        }

        // Soft delete database record.
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

    // ATTACH
    async attach({
        mediaId,
        entityType,
        entityId,
        role,
        sortOrder = 0,
    }: AttachMediaInput) {
        // 1. Find media
        const media = await this.prisma.media.findFirst({
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

        await this.validateEntity(entityType, entityId);

        return this.prisma.$transaction(async (tx) => {

            // If setting as primary
            if (role === MediaRole.PRIMARY) {

                const existingPrimary =
                    await tx.mediaUsage.findFirst({
                        where: {
                            entityType,
                            entityId,
                            role: MediaRole.PRIMARY,
                        },
                    });

                if (existingPrimary) {

                    const maxGallery =
                        await tx.mediaUsage.aggregate({
                            where: {
                                entityType,
                                entityId,
                                role: MediaRole.GALLERY,
                            },
                            _max: { sortOrder: true },
                        });

                    await tx.mediaUsage.update({
                        where: { id: existingPrimary.id },
                        data: {
                            role: MediaRole.GALLERY,
                            sortOrder: (maxGallery._max.sortOrder ?? -1) + 1,
                        },
                    });
                }

                // Primary should have a fixed sortOrder
                sortOrder = 0;
            }

            const usage = await tx.mediaUsage.create({
                data: {
                    mediaId,
                    entityType,
                    entityId,
                    role,
                    sortOrder,
                },
                include: { media: true, },
            });

            if (media.status === MediaStatus.TEMPORARY) {
                await tx.media.update({
                    where: { id: mediaId },
                    data: { status: MediaStatus.ACTIVE },
                });
            }

            return usage;
        });
    }

    // DETACH
    async detach(
        mediaId: string,
        entityType: MediaEntityType,
        entityId: string,
        role: MediaRole,
    ) {
        const usage =
            await this.prisma.mediaUsage.findFirst({
                where: {
                    mediaId,
                    entityType,
                    entityId,
                    role,
                },
            });

        if (!usage) {
            throw new NotFoundException('Media usage not found');
        }

        await this.prisma.mediaUsage.delete({
            where: { id: usage.id },
        });

        return { success: true };
    }

    // VALIDATION
    private validateFile(file: Express.Multer.File) {
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

    private getStorageFolder(purpose: MediaPurpose): string {
        return `kazraa/${purpose.toLowerCase().replace(/_/g, '-')}`;
    }

    private generateFileName(originalName: string): string {
        const extension =
            originalName.includes('.')
                ? originalName.substring(originalName.lastIndexOf('.'))
                : '';

        return `${crypto.randomUUID()}${extension}`;
    }

    // ENTITY VALIDATION
    private async validateEntity(
        entityType: MediaEntityType,
        entityId: string,
    ) {
        switch (entityType) {
            case MediaEntityType.PRODUCT:
                await this.ensureExists(
                    () =>
                        this.prisma.product.findUnique({
                            where: { id: entityId },
                            select: { id: true },
                        }),
                    'Product',
                );
                break;

            case MediaEntityType.CATEGORY:
                await this.ensureExists(
                    () =>
                        this.prisma.category.findUnique({
                            where: { id: entityId },
                            select: { id: true },
                        }),
                    'Category',
                );
                break;

            case MediaEntityType.COLLECTION:
                await this.ensureExists(
                    () =>
                        this.prisma.collection.findUnique({
                            where: { id: entityId },
                            select: { id: true },
                        }),
                    'Collection',
                );
                break;

            case MediaEntityType.BANNER:
                await this.ensureExists(
                    () =>
                        this.prisma.banner.findUnique({
                            where: { id: entityId },
                            select: { id: true },
                        }),
                    'Banner',
                );
                break;

            case MediaEntityType.USER:
                await this.ensureExists(
                    () =>
                        this.prisma.user.findUnique({
                            where: { id: entityId },
                            select: { id: true },
                        }),
                    'User',
                );
                break;

            case MediaEntityType.REVIEW:
                await this.ensureExists(
                    () =>
                        this.prisma.review.findUnique({
                            where: { id: entityId },
                            select: { id: true },
                        }),
                    'Review',
                );
                break;

            default:
                // Add validation when these entities are implemented.
                throw new BadRequestException(
                    `Entity type ${entityType} is not supported yet`,
                );
        }
    }

    private async ensureExists(
        query: () => Promise<unknown>,
        entityName: string,
    ) {
        const entity = await query();

        if (!entity) {
            throw new NotFoundException(`${entityName} not found`);
        }
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