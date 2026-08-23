import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { PostgresService } from '../../database/postgres/postgres.service';

import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { generateSlug } from '../../common/utils/slug.util';

@Injectable()
export class CategoriesService {
    constructor(private readonly prisma: PostgresService) { }

    // POST /catalog/categories
    async create(createCategoryDto: CreateCategoryDto) {
        const { name, description, imageUrl, parentId, isActive } = createCategoryDto;
        const slug = generateSlug(name);

        // Check duplicate slug
        const existingCategory = await this.prisma.category.findUnique({
            where: { slug },
        });

        if (existingCategory && !existingCategory.deletedAt) {
            throw new ConflictException('A category with this slug already exists');
        }

        // Validate parent category
        if (parentId) {
            const parentCategory = await this.prisma.category.findFirst({
                where: {
                    id: parentId,
                    deletedAt: null,
                },
            });

            if (!parentCategory) {
                throw new NotFoundException('Parent category not found');
            }
        }

        return this.prisma.category.create({
            data: {
                name,
                slug,
                description,
                imageUrl,
                parentId,
                isActive: isActive ?? true,
            },
            include: {
                parent: true,
            },
        });
    }

    // GET /catalog/categories
    async findAll() {

        // GET /catalog/categories?parentId=...       pending implementation for filtering by parentId if needed in the future
        return this.prisma.category.findMany({
            where: {
                deletedAt: null,
            },
            orderBy: {
                name: 'asc',
            },
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
    }

    // GET /catalog/categories/:id
    async findOne(id: string) {
        const category = await this.prisma.category.findFirst({
            where: {
                id,
                deletedAt: null,
            },
            include: {
                parent: true,
                children: {
                    where: {
                        deletedAt: null,
                    },
                    orderBy: {
                        name: 'asc',
                    },
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

        return category;
    }

    // PATCH /catalog/categories/:id
    async update(id: string, updateCategoryDto: UpdateCategoryDto) {
        const existingCategory = await this.prisma.category.findFirst({
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

        if (
            updateCategoryDto.name &&
            updateCategoryDto.name !== existingCategory.name
        ) {
            const newSlug = generateSlug(updateCategoryDto.name);

            const duplicateCategory = await this.prisma.category.findFirst({
                where: {
                    OR: [
                        {
                            name: updateCategoryDto.name,
                        },
                        {
                            slug: newSlug,
                        },
                    ],
                    id: {
                        not: id,
                    },
                    deletedAt: null,
                },
            });

            if (duplicateCategory) {
                throw new ConflictException(
                    'A category with this name already exists',
                );
            }

            slug = newSlug;
        }

        // Validate parent
        if (updateCategoryDto.parentId) {
            if (updateCategoryDto.parentId === id) {
                throw new ConflictException(
                    'A category cannot be its own parent',
                );
            }

            const parentCategory = await this.prisma.category.findFirst({
                where: {
                    id: updateCategoryDto.parentId,
                    deletedAt: null,
                },
            });

            if (!parentCategory) {
                throw new NotFoundException(
                    'Parent category not found',
                );
            }
        }

        return this.prisma.category.update({
            where: {
                id,
            },
            data: {
                ...updateCategoryDto,
                slug,
            },
            include: {
                parent: true,
            },
        });
    }

    // DELETE /catalog/categories/:id
    async remove(id: string) {
        const category = await this.prisma.category.findFirst({
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

        /*
         * Don't physically delete the category.
         * Your schema already has deletedAt for soft deletion.
         */

        if (category._count.products > 0) {
            throw new ConflictException(
                'Cannot delete a category that contains products',
            );
        }

        if (category._count.children > 0) {
            throw new ConflictException(
                'Cannot delete a category that contains child categories',
            );
        }

        return this.prisma.category.update({
            where: {
                id,
            },
            data: {
                deletedAt: new Date(),
                isActive: false,
            },
        });
    }
}