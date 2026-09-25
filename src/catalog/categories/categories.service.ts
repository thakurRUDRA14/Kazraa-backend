import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaEntityType, MediaRole } from '../../../generated/prisma/enums';

import { PostgresService } from '../../database/postgres/postgres.service';
import { MediaService } from '../../media/media.service';

import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { generateSlug } from '../../common/utils/slug.util';

@Injectable()
export class CategoriesService {
    constructor(
        private readonly prisma: PostgresService,
        private readonly mediaService: MediaService,
    ) { }

    // POST /catalog/categories
    async create(createCategoryDto: CreateCategoryDto) {
        const { name, description, parentId, isActive, mediaId } = createCategoryDto;

        const slug = generateSlug(name);

        // 1. Check duplicate slug
        const existingCategory =
            await this.prisma.category.findUnique({
                where: { slug },
            });

        if (existingCategory && !existingCategory.deletedAt) {
            throw new ConflictException('A category with this slug already exists');
        }

        // 2. Validate parent
        if (parentId) {
            const parentCategory =
                await this.prisma.category.findFirst({
                    where: {
                        id: parentId,
                        deletedAt: null,
                    },
                });

            if (!parentCategory) {
                throw new NotFoundException('Parent category not found');
            }
        }

        // 3. Create category + media usage atomically
        return this.prisma.$transaction(async (tx) => {
            const category =
                await tx.category.create({
                    data: {
                        name,
                        slug,
                        description,
                        parentId,
                        isActive: isActive ?? true,
                    },
                    include: { parent: true },
                });

            // 4. Attach category image
            if (mediaId) {
                await this.mediaService.attach(
                    {
                        mediaId,
                        entityType: MediaEntityType.CATEGORY,
                        entityId: category.id,
                        role: MediaRole.PRIMARY,
                        sortOrder: 0,
                    },
                    tx,
                );
            }

            // 5. Return category + image
            const mediaUsage =
                await tx.mediaUsage.findFirst({
                    where: {
                        entityType: MediaEntityType.CATEGORY,
                        entityId: category.id,
                        role: MediaRole.PRIMARY,
                    },
                    include: { media: true },
                });

            return {
                ...category,
                media: mediaUsage?.media ?? null,
            };
        });
    }

    // GET /catalog/categories
    async findAll() {
        // GET /catalog/categories?parentId=...       pending implementation for filtering by parentId if needed in the future
        const categories =
            await this.prisma.category.findMany({
                where: { deletedAt: null },
                orderBy: { name: 'asc' },
                include: {
                    parent: true,
                    _count: {
                        select: {
                            products: true,
                            children: true,
                        },
                    },
                },
            });

        if (!categories.length) {
            return [];
        }

        const categoryIds = categories.map((category) => category.id);

        const mediaUsages =
            await this.mediaService.getUsagesByEntities(
                MediaEntityType.CATEGORY,
                categoryIds,
                {
                    role: MediaRole.PRIMARY,
                    excludeDeleted: true,
                },
            );

        const mediaByCategory =
            new Map(
                mediaUsages.map(
                    (usage) => [
                        usage.entityId,
                        usage.media,
                    ],
                ),
            );

        return categories.map(
            (category) => ({
                ...category,
                media: mediaByCategory.get(category.id) ?? null,
            }),
        );
    }

    // GET /catalog/categories/:id
    async findOne(id: string) {
        const category =
            await this.prisma.category.findFirst({
                where: {
                    id,
                    deletedAt: null,
                },
                include: {
                    parent: true,
                    children: {
                        where: { deletedAt: null },
                        orderBy: { name: 'asc' },
                    },
                    _count: {
                        select: {
                            products: true,
                            children: true,
                        },
                    },
                },
            });

        if (!category) {
            throw new NotFoundException('Category not found');
        }

        const mediaUsage =
            await this.prisma.mediaUsage.findFirst({
                where: {
                    entityType: MediaEntityType.CATEGORY,
                    entityId: id,
                    role: MediaRole.PRIMARY,
                },

                include: { media: true },
            });

        return {
            ...category,
            media: mediaUsage?.media ?? null,
        };
    }

    // PATCH /catalog/categories/:id
    async update(
        id: string,
        updateCategoryDto: UpdateCategoryDto,
    ) {
        const existingCategory =
            await this.prisma.category.findFirst({
                where: {
                    id,
                    deletedAt: null,
                },
            });

        if (!existingCategory) {
            throw new NotFoundException('Category not found');
        }

        // Generate new slug when name changes
        let slug = existingCategory.slug;

        if (updateCategoryDto.name && updateCategoryDto.name !== existingCategory.name) {
            const newSlug = generateSlug(updateCategoryDto.name);

            const duplicateCategory =
                await this.prisma.category.findFirst({
                    where: {
                        OR: [
                            { name: updateCategoryDto.name },
                            { slug: newSlug },
                        ],
                        id: { not: id },
                        deletedAt: null,
                    },
                });

            if (duplicateCategory) {
                throw new ConflictException('A category with this name already exists');
            }

            slug = newSlug;
        }

        // Validate parent
        if (updateCategoryDto.parentId !== undefined) {
            if (updateCategoryDto.parentId === id) {
                throw new ConflictException('A category cannot be its own parent');
            }

            if (updateCategoryDto.parentId !== null) {
                const parentCategory =
                    await this.prisma.category.findFirst({
                        where: {
                            id: updateCategoryDto.parentId,
                            deletedAt: null,
                        },
                    });

                if (!parentCategory) {
                    throw new NotFoundException('Parent category not found');
                }
            }
        }

        return this.prisma.category.update({
            where: { id },

            data: {
                ...updateCategoryDto,
                slug,
            },

            include: { parent: true },
        });
    }

    // DELETE /catalog/categories/:id
    async remove(id: string) {
        const category =
            await this.prisma.category.findFirst({
                where: {
                    id,
                    deletedAt: null,
                },

                include: {
                    _count: {
                        select: {
                            products: true,
                            children: true,
                        },
                    },
                },
            });

        if (!category) {
            throw new NotFoundException('Category not found');
        }

        if (category._count.products > 0) {
            throw new ConflictException('Cannot delete a category that contains products');
        }

        if (category._count.children > 0) {
            throw new ConflictException('Cannot delete a category that contains child categories');
        }

        return this.prisma.$transaction(
            async (tx) => {
                // Remove relationship only.
                // Do NOT delete centralized media.
                await tx.mediaUsage.deleteMany({
                    where: {
                        entityType: MediaEntityType.CATEGORY,
                        entityId: id,
                    },
                });

                return tx.category.update({
                    where: { id },

                    data: {
                        deletedAt: new Date(),
                        isActive: false,
                    },
                });
            },
        );
    }

    // PUT /catalog/categories/:id/media
    //
    // Replaces the category's single image.
    async updateMedia(
        categoryId: string,
        mediaId: string,
    ) {
        const category =
            await this.prisma.category.findFirst({
                where: {
                    id: categoryId,
                    deletedAt: null,
                },
                select: { id: true },
            });

        if (!category) {
            throw new NotFoundException('Category not found');
        }

        const usage =
            await this.mediaService.replacePrimary({
                mediaId,
                entityType: MediaEntityType.CATEGORY,
                entityId: categoryId,
            });

        return usage.media;
    }

    // DELETE /catalog/categories/:id/media
    async removeMedia(categoryId: string) {
        const category =
            await this.prisma.category.findFirst({
                where: {
                    id: categoryId,
                    deletedAt: null,
                },
                select: { id: true },
            });

        if (!category) {
            throw new NotFoundException('Category not found');
        }

        const usage =
            await this.prisma.mediaUsage.findFirst({
                where: {
                    entityType: MediaEntityType.CATEGORY,
                    entityId: categoryId,
                    role: MediaRole.PRIMARY,
                },
            });

        if (!usage) {
            throw new NotFoundException('Category image not found');
        }

        await this.prisma.mediaUsage.delete({
            where: { id: usage.id },
        });

        return { success: true };
    }
}