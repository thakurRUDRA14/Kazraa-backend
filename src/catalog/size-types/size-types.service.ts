import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { PostgresService } from '../../database/postgres/postgres.service';

import { CreateSizeTypeDto } from './dto/create-size-type.dto';
import { UpdateSizeTypeDto } from './dto/update-size-type.dto';

@Injectable()
export class SizeTypesService {
    constructor(private readonly prisma: PostgresService) { }

    // POST /catalog/size-types
    async create(createSizeTypeDto: CreateSizeTypeDto) {
        const { name, isActive } = createSizeTypeDto;

        // Check duplicate
        const existingSizeType =
            await this.prisma.sizeType.findFirst({
                where: {
                    name,
                    deletedAt: null,
                },
            });

        if (existingSizeType) {
            throw new ConflictException('A size type with this name already exists');
        }

        // Create
        return this.prisma.sizeType.create({
            data: {
                name,
                isActive: isActive ?? true,
            },
        });
    }

    // GET /catalog/size-types
    async findAll() {
        return this.prisma.sizeType.findMany({
            where: {
                deletedAt: null,
            },

            include: {
                _count: {
                    select: {
                        sizes: true,
                    },
                },
            },

            orderBy: {
                name: 'asc',
            },
        });
    }

    // GET /catalog/size-types/:id
    async findOne(id: string) {
        const sizeType =
            await this.prisma.sizeType.findFirst({
                where: {
                    id,
                    deletedAt: null,
                },
                include: {
                    sizes: {
                        where: { deletedAt: null },
                        orderBy: [
                            {
                                sortOrder: 'asc',
                            },
                            {
                                name: 'asc',
                            },
                        ],
                    },
                },
            });

        if (!sizeType) {
            throw new NotFoundException('Size type not found');
        }

        return sizeType;
    }

    // PATCH /catalog/size-types/:id
    async update(
        id: string,
        updateSizeTypeDto: UpdateSizeTypeDto,
    ) {
        const existingSizeType =
            await this.prisma.sizeType.findFirst({
                where: {
                    id,
                    deletedAt: null,
                },
            });

        if (!existingSizeType) {
            throw new NotFoundException('Size type not found');
        }

        const { name } = updateSizeTypeDto;

        // Check duplicate name
        if (name) {
            const duplicateSizeType =
                await this.prisma.sizeType.findFirst({
                    where: {
                        name,
                        deletedAt: null,
                        NOT: { id },
                    },
                });

            if (duplicateSizeType) {
                throw new ConflictException('A size type with this name already exists');
            }
        }

        // Update
        return this.prisma.sizeType.update({
            where: { id },

            data: updateSizeTypeDto,
        });
    }

    // DELETE /catalog/size-types/:id
    async remove(id: string) {
        const sizeType =
            await this.prisma.sizeType.findFirst({
                where: {
                    id,
                    deletedAt: null,
                },
                include: {
                    _count: {
                        select: {
                            sizes: true,
                        },
                    },
                },
            });

        if (!sizeType) {
            throw new NotFoundException('Size type not found');
        }

        // Prevent deleting used size type
        if (sizeType._count.sizes > 0) {
            throw new ConflictException('Cannot delete a size type that contains sizes');
        }

        // Soft delete
        return this.prisma.sizeType.update({
            where: { id },
            data: {
                isActive: false,
                deletedAt: new Date(),
            },
        });
    }
}