import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { PostgresService } from '../../database/postgres/postgres.service';

import { CreateSizeDto } from './dto/create-size.dto';
import { UpdateSizeDto } from './dto/update-size.dto';

@Injectable()
export class SizesService {
    constructor(private readonly prisma: PostgresService) { }

    // POST /catalog/sizes
    async create(createSizeDto: CreateSizeDto) {
        const {
            name,
            sizeTypeId,
            shortCode,
            sortOrder,
            isActive,
        } = createSizeDto;

        // Check size type
        const sizeType =
            await this.prisma.sizeType.findFirst({
                where: {
                    id: sizeTypeId,
                    deletedAt: null
                },
            });

        if (!sizeType) {
            throw new NotFoundException('Size type not found');
        }

        // Check duplicate size
        const existingSize =
            await this.prisma.size.findFirst({
                where: {
                    sizeTypeId,
                    OR: [
                        { name },
                        ...(shortCode
                            ? [{ shortCode }]
                            : []),
                    ],
                },
            });

        if (existingSize) {
            if (existingSize.name === name) {
                throw new ConflictException('A size with this name already exists');
            }

            if (shortCode && existingSize.shortCode === shortCode) {
                throw new ConflictException('A size with this short code already exists');
            }
        }

        // Create
        return this.prisma.size.create({
            data: {
                name,
                sizeTypeId,
                shortCode,
                sortOrder: sortOrder ?? 0,
                isActive: isActive ?? true,
            },
            include: {
                sizeType: true,
            },
        });
    }

    // GET /catalog/sizes
    async findAll(sizeTypeId?: string) {
        return this.prisma.size.findMany({
            where: {
                deletedAt: null,
                ...(sizeTypeId && {
                    sizeTypeId,
                }),
            },

            include: {
                sizeType: true,
            },

            orderBy: [
                {
                    sortOrder: 'asc',
                },
                {
                    name: 'asc',
                },
            ],
        });
    }

    // GET /catalog/sizes/:id
    async findOne(id: string) {
        const size =
            await this.prisma.size.findFirst({
                where: {
                    id,
                    deletedAt: null,
                },
                include: {
                    sizeType: true,
                },
            });

        if (!size) {
            throw new NotFoundException('Size not found');
        }

        return size;
    }

    // PATCH /catalog/sizes/:id
    async update(
        id: string,
        updateSizeDto: UpdateSizeDto,
    ) {
        const existingSize =
            await this.prisma.size.findFirst({
                where: {
                    id,
                    deletedAt: null
                },
            });

        if (!existingSize) {
            throw new NotFoundException('Size not found');
        }

        const {
            name,
            sizeTypeId,
            shortCode,
        } = updateSizeDto;

        // Determine final size type

        const finalSizeTypeId = sizeTypeId ?? existingSize.sizeTypeId;

        // Check size type
        if (sizeTypeId) {
            const sizeType =
                await this.prisma.sizeType.findFirst({
                    where: {
                        id: sizeTypeId,
                        deletedAt: null,
                    },
                });

            if (!sizeType) {
                throw new NotFoundException('Size type not found');
            }
        }

        // Check duplicate
        if (name || shortCode || sizeTypeId) {
            const duplicateSize =
                await this.prisma.size.findFirst({
                    where: {
                        sizeTypeId: finalSizeTypeId,

                        OR: [
                            ...(name
                                ? [{ name }]
                                : []),

                            ...(shortCode
                                ? [{ shortCode }]
                                : []),
                        ],

                        NOT: {
                            id,
                        },
                    },
                });

            if (duplicateSize) {
                if (name && duplicateSize.name === name) {
                    throw new ConflictException('A size with this name already exists in this size type');
                }

                if (shortCode && duplicateSize.shortCode === shortCode) {
                    throw new ConflictException('A size with this short code already exists in this size type');
                }
            }
        }

        // Update
        return this.prisma.size.update({
            where: {
                id,
                deletedAt: null,
            },
            data: updateSizeDto,
            include: {
                sizeType: true,
            },
        });
    }

    // DELETE /catalog/sizes/:id
    async remove(id: string) {
        const size =
            await this.prisma.size.findFirst({
                where: {
                    id,
                    deletedAt: null,
                },
                include: {
                    _count: {
                        select: {
                            productSizes: true,
                        },
                    },
                },
            });

        if (!size) {
            throw new NotFoundException('Size not found');
        }

        /*
         * A size is referenced by ProductSize.
         * Do not physically delete it if products are using it.
         */

        if (size._count.productSizes > 0) {
            throw new ConflictException('Cannot delete a size that is being used by products');
        }

        return this.prisma.size.update({
            where: {
                id,
            },
            data: {
                isActive: false,
                deletedAt: new Date(),
            },
        });
    }
}