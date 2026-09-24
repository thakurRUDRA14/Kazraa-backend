import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { MediaRole } from '../../generated/prisma/enums';
import { PostgresService } from '../database/postgres/postgres.service';

import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
    constructor(private readonly prisma: PostgresService) { }

    // Get or create the user's active cart
    private async getOrCreateCart(userId: string) {
        let cart = await this.prisma.cart.findFirst({
            where: {
                userId,
                status: 'ACTIVE',
            },
        });

        if (!cart) {
            cart = await this.prisma.cart.create({
                data: {
                    userId,
                    status: 'ACTIVE',
                },
            });
        }

        return cart;
    }

    //GET /cart
    async getCart(userId: string) {
        const cart = await this.getOrCreateCart(userId);

        const items = await this.prisma.cartItem.findMany({
            where: { cartId: cart.id },
            include: {
                productSize: {
                    include: {
                        size: true,
                        product: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        const productIds = items.map(
            (item) => item.productSize.product.id,
        );

        const mediaUsages =
            productIds.length
                ? await this.prisma.mediaUsage.findMany({
                    where: {
                        entityType: 'PRODUCT',
                        entityId: { in: productIds },
                        role: MediaRole.PRIMARY,
                        media: {
                            status: { not: 'DELETED' },
                        },
                    },
                    include: { media: true },
                    orderBy: { sortOrder: 'asc' },
                })
                : [];

        const mediaByProduct = new Map<string, typeof mediaUsages>();

        for (const usage of mediaUsages) {
            const existing = mediaByProduct.get(usage.entityId) ?? [];

            existing.push(usage);

            mediaByProduct.set(
                usage.entityId,
                existing,
            );
        }

        const subtotal = items.reduce((total, item) => total + Number(item.productSize.sellingPrice) * item.quantity, 0);
        const totalItems = items.reduce((total, item) => total + item.quantity, 0);

        return {
            id: cart.id,
            status: cart.status,

            items: items.map((item) => {
                const product = item.productSize.product;

                const media = mediaByProduct.get(product.id) ?? [];

                return {
                    id: item.id,
                    quantity: item.quantity,

                    productSizeId: item.productSizeId,

                    product: {
                        id: product.id,
                        name: product.name,
                        slug: product.slug,
                    },

                    size: {
                        id: item.productSize.size.id,
                        name: item.productSize.size.name,
                        shortCode: item.productSize.size.shortCode,
                    },

                    sku: item.productSize.sku,
                    mrp: Number(item.productSize.mrp),
                    sellingPrice: Number(item.productSize.sellingPrice),
                    availableStock: item.productSize.availableStock,

                    total: Number(item.productSize.sellingPrice) * item.quantity,

                    media: media.map(
                        (usage) => ({
                            id: usage.media.id,
                            url: usage.media.url,
                            type: usage.media.type,
                            role: usage.role,
                            sortOrder: usage.sortOrder,
                            altText: usage.media.altText,
                        }),
                    ),
                };
            }),

            summary: {
                totalItems,
                subtotal,
            },

            createdAt: cart.createdAt,
            updatedAt: cart.updatedAt,
        };
    }

    // POST /cart/items
    async addItem(
        userId: string,
        dto: AddCartItemDto,
    ) {
        const cart = await this.getOrCreateCart(userId);

        const productSize =
            await this.prisma.productSize.findFirst({
                where: {
                    id: dto.productSizeId,
                    isActive: true,
                    deletedAt: null,
                    product: {
                        status: 'ACTIVE',
                        deletedAt: null,
                    },
                },
            });

        if (!productSize) {
            throw new NotFoundException('Product size not found or unavailable');
        }

        if (productSize.availableStock <= 0) {
            throw new BadRequestException('Product is out of stock');
        }

        if (dto.quantity > productSize.availableStock) {
            throw new BadRequestException(`Only ${productSize.availableStock} items are available`);
        }

        const existingItem =
            await this.prisma.cartItem.findUnique({
                where: {
                    cartId_productSizeId: {
                        cartId: cart.id,
                        productSizeId: dto.productSizeId,
                    },
                },
            });

        if (existingItem) {
            const newQuantity = existingItem.quantity + dto.quantity;
            if (newQuantity > productSize.availableStock) {
                throw new BadRequestException(`Only ${productSize.availableStock} items are available`);
            }

            await this.prisma.cartItem.update({
                where: { id: existingItem.id },
                data: { quantity: newQuantity },
            });
        } else {
            await this.prisma.cartItem.create({
                data: {
                    cartId: cart.id,
                    productSizeId: dto.productSizeId,
                    quantity: dto.quantity,
                },
            });
        }

        return this.getCart(userId);
    }

    // PATCH /cart/items/:id
    async updateItem(
        userId: string,
        itemId: string,
        dto: UpdateCartItemDto,
    ) {
        const item = await this.prisma.cartItem.findFirst({
            where: {
                id: itemId,
                cart: {
                    userId,
                    status: 'ACTIVE',
                },
            },
            include: { productSize: true },
        });

        if (!item) {
            throw new NotFoundException('Cart item not found');
        }

        if (!item.productSize.isActive || item.productSize.deletedAt) {
            throw new BadRequestException('Product size is no longer available');
        }

        if (item.productSize.availableStock < dto.quantity) {
            throw new BadRequestException(`Only ${item.productSize.availableStock} items are available`);
        }

        await this.prisma.cartItem.update({
            where: { id: itemId },
            data: { quantity: dto.quantity },
        });

        return this.getCart(userId);
    }

    // DELETE /cart/items/:id
    async removeItem(
        userId: string,
        itemId: string,
    ) {
        const item = await this.prisma.cartItem.findFirst({
            where: {
                id: itemId,
                cart: {
                    userId,
                    status: 'ACTIVE',
                },
            },
        });

        if (!item) {
            throw new NotFoundException('Cart item not found');
        }

        await this.prisma.cartItem.delete({
            where: { id: itemId },
        });

        return this.getCart(userId);
    }

    // DELETE /cart
    async clearCart(userId: string) {
        const cart = await this.prisma.cart.findFirst({
            where: {
                userId,
                status: 'ACTIVE',
            },
        });

        if (!cart) {
            return { message: 'Cart is already empty' };
        }

        await this.prisma.cartItem.deleteMany({
            where: { cartId: cart.id },
        });

        return { message: 'Cart cleared successfully' };
    }
}