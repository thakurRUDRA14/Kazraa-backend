import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { PostgresService } from '../../database/postgres/postgres.service';

import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { CreateAttributeOptionDto } from './dto/create-attribute-option.dto';
import { UpdateAttributeOptionDto } from './dto/update-attribute-option.dto';
import { generateSlug } from '../../common/utils/slug.util';

@Injectable()
export class AttributesService {
    constructor(private readonly prisma: PostgresService) { }

    // POST /catalog/attributes
    async create(createAttributeDto: CreateAttributeDto) {
        const { name, type, description, isRequired, isFilterable, isActive, sortOrder } = createAttributeDto;
        const slug = generateSlug(name);

        const existingName = await this.prisma.attribute.findUnique({
            where: {
                name,
            },
        });

        if (existingName) {
            throw new ConflictException(
                `Attribute with name "${name}" already exists`,
            );
        }

        const existingSlug = await this.prisma.attribute.findUnique({
            where: {
                slug,
            },
        });

        if (existingSlug) {
            throw new ConflictException(
                `Attribute with slug "${slug}" already exists`,
            );
        }

        return this.prisma.attribute.create({
            data: {
                name,
                slug,
                type,
                description,
                isRequired,
                isFilterable,
                isActive: isActive ?? true,
                sortOrder,
            },
        });
    }

    // GET /catalog/attributes
    async findAll() {
        return this.prisma.attribute.findMany({
            where: {
                deletedAt: null,
                isActive: true,
            },
            include: {
                options: {
                    where: {
                        isActive: true,
                    },
                    orderBy: {
                        sortOrder: 'asc',
                    },
                },
            },
            orderBy: {
                sortOrder: 'asc',
            },
        });
    }

    // GET /catalog/attributes/:id
    async findOne(id: string) {
        const attribute = await this.prisma.attribute.findFirst({
            where: {
                id,
                deletedAt: null,
                isActive: true,
            },
            include: {
                options: {
                    where: {
                        isActive: true,
                    },
                    orderBy: {
                        sortOrder: 'asc',
                    },
                },
            },
        });

        if (!attribute) {
            throw new NotFoundException(
                `Attribute with ID "${id}" not found`,
            );
        }

        return attribute;
    }

    // PATCH /catalog/attributes/:id
    async update(
        id: string,
        updateAttributeDto: UpdateAttributeDto,
    ) {
        const existingAttribute = await this.prisma.attribute.findFirst({
            where: {
                id,
                deletedAt: null,
                isActive: true,
            },
        });

        if (!existingAttribute) {
            throw new NotFoundException(
                `Attribute with ID "${id}" not found`,
            );
        }

        let slug = existingAttribute.slug;

        // If name is changed, generate a new slug
        if (
            updateAttributeDto.name &&
            updateAttributeDto.name !== existingAttribute.name
        ) {
            const newSlug = generateSlug(updateAttributeDto.name);

            // Check whether generated slug already belongs to another attribute
            const slugExists = await this.prisma.attribute.findFirst({
                where: {
                    slug: newSlug,
                    id: {
                        not: id,
                    },
                },
            });

            if (slugExists) {
                throw new ConflictException(
                    `An attribute with name "${updateAttributeDto.name}" already exists`,
                );
            }

            slug = newSlug;
        }

        return this.prisma.attribute.update({
            where: {
                id,
            },
            data: {
                ...updateAttributeDto,
                slug,
            },
        });
    }

    // DELETE /catalog/attributes/:id
    async remove(id: string) {
        const attribute = await this.prisma.attribute.findFirst({
            where: {
                id,
                deletedAt: null,
            },
        });

        if (!attribute) {
            throw new NotFoundException(
                `Attribute with ID "${id}" not found`,
            );
        }

        return this.prisma.attribute.update({
            where: {
                id,
            },
            data: {
                deletedAt: new Date(),
                isActive: false,
            },
        });
    }

    // POST /catalog/attributes/:attributeId/options
    async createOption(
        attributeId: string,
        createOptionDto: CreateAttributeOptionDto,
    ) {
        const attribute = await this.prisma.attribute.findFirst({
            where: {
                id: attributeId,
                deletedAt: null,
            },
        });

        if (!attribute) {
            throw new NotFoundException('Attribute not found');
        }

        const value = generateSlug(createOptionDto.label);

        const existingOption =
            await this.prisma.attributeOption.findUnique({
                where: {
                    attributeId_value: {
                        attributeId,
                        value,
                    },
                },
            });

        if (existingOption) {
            throw new ConflictException('An option with this label already exists for this attribute');
        }

        return this.prisma.attributeOption.create({
            data: {
                attributeId,
                label: createOptionDto.label,
                value,
                sortOrder: createOptionDto.sortOrder ?? 0,
                isActive: createOptionDto.isActive ?? true,
            },
        });
    }

    // PATCH /catalog/attributes/:attributeId/options/:optionId
    async updateOption(
        attributeId: string,
        optionId: string,
        updateOptionDto: UpdateAttributeOptionDto,
    ) {
        const option = await this.prisma.attributeOption.findFirst({
            where: {
                id: optionId,
                attributeId,
            },
        });

        if (!option) {
            throw new NotFoundException('Attribute option not found');
        }

        let value = option.value;

        // Generate a new value only when label changes
        if (
            updateOptionDto.label !== undefined &&
            updateOptionDto.label !== option.label
        ) {
            value = generateSlug(updateOptionDto.label);

            const duplicateOption =
                await this.prisma.attributeOption.findUnique({
                    where: {
                        attributeId_value: {
                            attributeId,
                            value,
                        },
                    },
                });

            if (
                duplicateOption &&
                duplicateOption.id !== optionId
            ) {
                throw new ConflictException('An option with this label already exists for this attribute');
            }
        }

        return this.prisma.attributeOption.update({
            where: {
                id: optionId,
            },
            data: {
                ...(updateOptionDto.label !== undefined && {
                    label: updateOptionDto.label,
                }),

                value,

                ...(updateOptionDto.sortOrder !== undefined && {
                    sortOrder: updateOptionDto.sortOrder,
                }),

                ...(updateOptionDto.isActive !== undefined && {
                    isActive: updateOptionDto.isActive,
                }),
            },
        });
    }


    // DELETE /catalog/attributes/:attributeId/options/:optionId
    async removeOption(
        attributeId: string,
        optionId: string,
    ) {
        const option = await this.prisma.attributeOption.findFirst({
            where: {
                id: optionId,
                attributeId,
            },
        });

        if (!option) {
            throw new NotFoundException('Attribute option not found');
        }

        return this.prisma.attributeOption.delete({
            where: {
                id: optionId,
            },
        });
    }
}