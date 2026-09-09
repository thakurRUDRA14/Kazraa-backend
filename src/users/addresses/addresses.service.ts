import { Injectable, NotFoundException } from '@nestjs/common';

import { PostgresService } from '../../database/postgres/postgres.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
    constructor(private readonly prisma: PostgresService) { }

    // GET /users/me/addresses
    async findAll(userId: string) {
        const [addresses, user] = await Promise.all([
            this.prisma.address.findMany({
                where: {
                    userId,
                    deletedAt: null,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            }),

            this.prisma.user.findUnique({
                where: {
                    id: userId,
                },
                select: {
                    defaultAddressId: true,
                },
            }),
        ]);

        return addresses.map((address) => ({
            ...address,
            isDefault: address.id === user?.defaultAddressId,
        }));
    }

    // POST /users/me/addresses
    async create(userId: string, dto: CreateAddressDto) {
        const isDefault = dto.isDefault ?? false;

        return this.prisma.$transaction(async (tx) => {
            const address = await tx.address.create({
                data: {
                    userId,

                    fullName: dto.fullName,
                    phone: dto.phone,

                    addressLine1: dto.addressLine1,
                    addressLine2: dto.addressLine2,

                    landmark: dto.landmark,

                    city: dto.city,
                    district: dto.district,

                    state: dto.state,
                    country: dto.country ?? 'India',

                    postalCode: dto.postalCode,
                },
            });

            //  If this is the first address, make it default automatically.
            //  This is important because a user should normally have a default address once they have created an address.
            const existingDefault = await tx.user.findUnique({
                where: { id: userId },
                select: { defaultAddressId: true },
            });

            const shouldBeDefault = isDefault || !existingDefault?.defaultAddressId;

            if (shouldBeDefault) {
                await tx.user.update({
                    where: { id: userId },
                    data: { defaultAddressId: address.id },
                });
            }

            return { ...address, isDefault: shouldBeDefault };
        });
    }

    // PATCH /users/me/addresses/:id
    async update(
        userId: string,
        addressId: string,
        dto: UpdateAddressDto,
    ) {
        return this.prisma.$transaction(async (tx) => {
            const address = await tx.address.findFirst({
                where: {
                    id: addressId,
                    userId,
                    deletedAt: null,
                },
            });

            if (!address) {
                throw new NotFoundException('Address not found');
            }

            //  Update address fields only.
            //   isDefault is NOT sent to Prisma because it no longer exists on Address.
            const updatedAddress = await tx.address.update({
                where: { id: addressId },
                data: {
                    ...(dto.fullName !== undefined && {
                        fullName: dto.fullName,
                    }),

                    ...(dto.phone !== undefined && {
                        phone: dto.phone,
                    }),

                    ...(dto.addressLine1 !== undefined && {
                        addressLine1: dto.addressLine1,
                    }),

                    ...(dto.addressLine2 !== undefined && {
                        addressLine2: dto.addressLine2,
                    }),

                    ...(dto.landmark !== undefined && {
                        landmark: dto.landmark,
                    }),

                    ...(dto.city !== undefined && {
                        city: dto.city,
                    }),

                    ...(dto.district !== undefined && {
                        district: dto.district,
                    }),

                    ...(dto.state !== undefined && {
                        state: dto.state,
                    }),

                    ...(dto.country !== undefined && {
                        country: dto.country,
                    }),

                    ...(dto.postalCode !== undefined && {
                        postalCode: dto.postalCode,
                    }),
                },
            });

            //  Make this address the default.
            //  There is no need to unset another address because defaultAddressId can point to only one address.

            if (dto.isDefault === true) {
                await tx.user.update({
                    where: { id: userId },
                    data: { defaultAddressId: addressId },
                });
            }

            //  If the current default is explicitly changed to false, clear the user's default address.

            if (dto.isDefault === false) {
                const user = await tx.user.findUnique({
                    where: { id: userId },
                    select: { defaultAddressId: true },
                });

                if (user?.defaultAddressId === addressId) {
                    await tx.user.update({
                        where: { id: userId },
                        data: { defaultAddressId: null },
                    });
                }
            }

            const user = await tx.user.findUnique({
                where: { id: userId },
                select: { defaultAddressId: true },
            });

            return { ...updatedAddress, isDefault: user?.defaultAddressId === updatedAddress.id };
        });
    }

    // DELETE /users/me/addresses/:id
    async remove(userId: string, addressId: string) {
        return this.prisma.$transaction(async (tx) => {
            const address = await tx.address.findFirst({
                where: {
                    id: addressId,
                    userId,
                    deletedAt: null,
                },
            });

            if (!address) {
                throw new NotFoundException('Address not found');
            }

            // Check whether this is currently the default address.

            const user = await tx.user.findUnique({
                where: { id: userId },
                select: { defaultAddressId: true },
            });

            const isDefault = user?.defaultAddressId === addressId;

            // Soft delete the address.

            await tx.address.update({
                where: { id: addressId },
                data: { deletedAt: new Date() },
            });

            //  If deleted address was the default, clear User.defaultAddressId.

            if (isDefault) {
                await tx.user.update({
                    where: { id: userId },
                    data: { defaultAddressId: null },
                });
            }

            return { message: 'Address deleted successfully' };
        });
    }
}