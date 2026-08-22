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
            shortCode,
            sortOrder,
            isActive,
        } = createSizeDto;

        const existingSize = await this.prisma.size.findFirst({
            where: {
                OR: [
                    { name },
                    ...(shortCode ? [{ shortCode }] : []),
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

        return this.prisma.size.create({
            data: {
                name,
                shortCode,
                sortOrder: sortOrder ?? 0,
                isActive: isActive ?? true,
            },
        });
    }

    // GET /catalog/sizes
    async findAll() {
        return this.prisma.size.findMany({
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
        const size = await this.prisma.size.findUnique({
            where: { id },
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
        const existingSize = await this.prisma.size.findUnique({
            where: { id },
        });

        if (!existingSize) {
            throw new NotFoundException('Size not found');
        }

        const { name, shortCode } = updateSizeDto;

        if (name || shortCode) {
            const duplicateSize = await this.prisma.size.findFirst({
                where: {
                    OR: [
                        ...(name ? [{ name }] : []),
                        ...(shortCode ? [{ shortCode }] : []),
                    ],
                    NOT: {
                        id,
                    },
                },
            });

            if (duplicateSize) {
                if (name && duplicateSize.name === name) {
                    throw new ConflictException('A size with this name already exists');
                }

                if (shortCode && duplicateSize.shortCode === shortCode) {
                    throw new ConflictException('A size with this short code already exists');
                }
            }
        }

        return this.prisma.size.update({
            where: {
                id,
            },
            data: updateSizeDto,
        });
    }

    // DELETE /catalog/sizes/:id
    async remove(id: string) {
        const size = await this.prisma.size.findUnique({
            where: {
                id,
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

        return this.prisma.size.delete({
            where: { id },
        });
    }
}