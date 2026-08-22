import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { PostgresService } from '../../database/postgres/postgres.service';

import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { CreateAttributeOptionDto } from './dto/create-attribute-option.dto';
import { UpdateAttributeOptionDto } from './dto/update-attribute-option.dto';

@Injectable()
export class AttributesService {
    constructor(private readonly prisma: PostgresService) { }

    // POST /catalog/attributes
    async create(createAttributeDto: CreateAttributeDto) {
        const {
            name,
            slug,
            type,
            description,
            isRequired,
            isFilterable,
            isVariant,
            sortOrder,
        } = createAttributeDto;

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
                isVariant,
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

        if (
            updateAttributeDto.name &&
            updateAttributeDto.name !== existingAttribute.name
        ) {
            const nameExists = await this.prisma.attribute.findUnique({
                where: {
                    name: updateAttributeDto.name,
                },
            });

            if (nameExists && nameExists.id !== id) {
                throw new ConflictException(
                    `Attribute with name "${updateAttributeDto.name}" already exists`,
                );
            }
        }

        if (
            updateAttributeDto.slug &&
            updateAttributeDto.slug !== existingAttribute.slug
        ) {
            const slugExists = await this.prisma.attribute.findUnique({
                where: {
                    slug: updateAttributeDto.slug,
                },
            });

            if (slugExists && slugExists.id !== id) {
                throw new ConflictException(
                    `Attribute with slug "${updateAttributeDto.slug}" already exists`,
                );
            }
        }

        return this.prisma.attribute.update({
            where: {
                id,
            },
            data: updateAttributeDto,
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
        const attribute = await this.prisma.attribute.findUnique({
            where: {
                id: attributeId,
            },
        });

        if (!attribute) {
            throw new NotFoundException('Attribute not found');
        }

        const existingOption =
            await this.prisma.attributeOption.findUnique({
                where: {
                    attributeId_value: {
                        attributeId,
                        value: createOptionDto.value,
                    },
                },
            });

        if (existingOption) {
            throw new ConflictException(
                'An option with this value already exists for this attribute',
            );
        }

        return this.prisma.attributeOption.create({
            data: {
                attributeId,
                label: createOptionDto.label,
                value: createOptionDto.value,
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

        if (
            updateOptionDto.value &&
            updateOptionDto.value !== option.value
        ) {
            const duplicateOption =
                await this.prisma.attributeOption.findUnique({
                    where: {
                        attributeId_value: {
                            attributeId,
                            value: updateOptionDto.value,
                        },
                    },
                });

            if (duplicateOption) {
                throw new ConflictException(
                    'An option with this value already exists for this attribute',
                );
            }
        }

        return this.prisma.attributeOption.update({
            where: {
                id: optionId,
            },
            data: updateOptionDto,
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