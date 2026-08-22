import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { PostgresService } from '../../database/postgres/postgres.service';

import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';

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
}