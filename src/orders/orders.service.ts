import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client';
import { CartStatus, MediaEntityType, MediaRole, MediaStatus, OrderStatus, PaymentMethod, PaymentStatus, ProductStatus, UserRole } from '../../generated/prisma/enums';

import { PostgresService } from '../database/postgres/postgres.service';

import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CreateRtoDto } from './dto/create-rto.dto';
import { CreateReturnRequestDto } from './dto/create-return-request.dto';

@Injectable()
export class OrdersService {
    constructor(private readonly prisma: PostgresService) { }

    // CREATE ORDER
    async createOrder(
        userId: string,
        dto: CreateOrderDto,
    ) {
        return this.prisma.$transaction(async (tx) => {
            // 1. Get user's active cart
            const cart = await tx.cart.findFirst({
                where: {
                    userId,
                    status: CartStatus.ACTIVE,
                },
                include: {
                    items: {
                        include: {
                            productSize: {
                                include: {
                                    product: {
                                        include: {
                                            category: true,
                                        },
                                    },
                                    size: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!cart) {
                throw new BadRequestException('Active cart not found');
            }

            if (cart.items.length === 0) {
                throw new BadRequestException('Cart is empty');
            }

            // 2. Get shipping address
            const address = await tx.address.findFirst({
                where: {
                    id: dto.addressId,
                    userId,
                    deletedAt: null,
                },
            });

            if (!address) {
                throw new NotFoundException('Address not found');
            }

            // 3. Get primary media for all products
            const productIds = [...new Set(cart.items.map((item) => item.productSize.product.id))];

            const productMedia =
                await tx.mediaUsage.findMany({
                    where: {
                        entityType: MediaEntityType.PRODUCT,
                        entityId: { in: productIds },
                        role: MediaRole.PRIMARY,
                        media: { status: MediaStatus.ACTIVE },
                    },

                    include: { media: true },
                });

            const primaryMediaByProduct =
                new Map(
                    productMedia.map((usage) => [
                        usage.entityId,
                        usage.media,
                    ]),
                );

            // 4. Validate stock + calculate subtotal
            let subtotal = new Prisma.Decimal(0);

            const orderItemsData: Prisma.OrderItemCreateWithoutOrderInput[] = [];

            for (const cartItem of cart.items) {
                const productSize = cartItem.productSize;
                const product = productSize.product;

                // Product validation
                if (!product || product.status !== ProductStatus.ACTIVE || product.deletedAt
                ) {
                    throw new BadRequestException(`Product ${product?.name ?? ''} is no longer available`);
                }

                // Product size validation
                if (!productSize.isActive || productSize.deletedAt) {
                    throw new BadRequestException(`Product size ${productSize.sku} is no longer available`);
                }

                // Stock validation
                if (productSize.availableStock < cartItem.quantity) {
                    throw new BadRequestException(`Insufficient stock for ${product.name} - ${productSize.size.name}`,);
                }

                const itemTotal = productSize.sellingPrice.mul(cartItem.quantity);

                subtotal = subtotal.add(itemTotal);

                const primaryMedia = primaryMediaByProduct.get(product.id);

                // Product snapshot
                const productSnapshot = {
                    productId: product.id,
                    name: product.name,
                    slug: product.slug,
                    sku: productSize.sku,
                    size: {
                        id: productSize.size.id,
                        name: productSize.size.name,
                    },
                    mediaId: primaryMedia?.id ?? null,
                };

                orderItemsData.push({
                    productSize: {
                        connect: {
                            id: productSize.id,
                        },
                    },
                    productSnapshot,
                    quantity: cartItem.quantity,
                    mrp: productSize.mrp,
                    sellingPrice: productSize.sellingPrice,
                    total: itemTotal,
                });
            }

            // 5. Calculate charges
            const shippingCharge = subtotal.greaterThanOrEqualTo(999) ? new Prisma.Decimal(0) : new Prisma.Decimal(99);

            const tax = new Prisma.Decimal(0);

            const total = subtotal.add(shippingCharge).add(tax);

            // 6. Generate order number
            const orderNumber = await this.generateOrderNumber(tx);

            // 7. Create order
            const order = await tx.order.create({
                data: {
                    orderNumber,
                    userId,
                    status: dto.paymentMethod === PaymentMethod.COD ? OrderStatus.CONFIRMED : OrderStatus.PENDING,

                    subtotal,
                    shippingCharge,
                    tax,
                    total,

                    notes: dto.notes,

                    shippingAddress: {
                        create: {
                            name: address.fullName,
                            phone: address.phone,
                            addressLine1: address.addressLine1,
                            addressLine2: address.addressLine2,
                            landmark: address.landmark,
                            city: address.city,
                            district: address.district,
                            state: address.state,
                            country: address.country,
                            postalCode: address.postalCode,
                        },
                    },

                    items: { create: orderItemsData },

                    payment: {
                        create: {
                            method: dto.paymentMethod,
                            status: PaymentStatus.PENDING,
                            amount: total,
                        },
                    },
                },

                include: {
                    shippingAddress: true,
                    items: true,
                    payment: true,
                },
            });

            // 8. Reduce stock
            for (const cartItem of cart.items) {
                const updated = await tx.productSize.updateMany({
                    where: {
                        id: cartItem.productSizeId,
                        availableStock: { gte: cartItem.quantity },
                    },
                    data: {
                        availableStock: { decrement: cartItem.quantity },
                    },
                });

                if (updated.count !== 1) {
                    throw new BadRequestException('Stock changed while placing order. Please try again.');
                }
            }

            // 9. Convert cart
            await tx.cart.update({
                where: { id: cart.id },
                data: { status: CartStatus.CONVERTED },
            });

            return order;
        });
    }

    // GET MY ORDERS
    async getMyOrders(userId: string) {
        return this.prisma.order.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                items: {
                    include: {
                        productSize: {
                            include: { size: true },
                        },
                    },
                },

                payment: true,
                shippingAddress: true,
                returnRequest: true,
            },
        });
    }

    // GET MY ORDER
    async getMyOrder(
        userId: string,
        orderId: string,
    ) {
        const order =
            await this.prisma.order.findFirst({
                where: {
                    id: orderId,
                    userId,
                },

                include: {
                    items: {
                        include: {
                            productSize: {
                                include: { size: true },
                            },
                            review: true,
                        },
                    },

                    shippingAddress: true,
                    payment: true,
                    returnRequest: true,
                },
            });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        return order;
    }

    // CANCEL ORDER
    async cancelOrder(
        userId: string,
        role: UserRole,
        orderId: string,
    ) {
        return this.prisma.$transaction(
            async (tx) => {
                const order =
                    await tx.order.findFirst({
                        where: {
                            id: orderId,
                            ...(role === UserRole.CUSTOMER
                                ? { userId }
                                : {}),
                        },
                        include: {
                            items: true,
                            payment: true,
                        },
                    });

                if (!order) {
                    throw new NotFoundException('Order not found');
                }

                const customerCancellableStatuses: OrderStatus[] = [
                    OrderStatus.PENDING,
                    OrderStatus.CONFIRMED,
                    OrderStatus.PROCESSING,
                ];

                const adminCancellableStatuses: OrderStatus[] = [
                    OrderStatus.PENDING,
                    OrderStatus.CONFIRMED,
                    OrderStatus.PROCESSING,
                    OrderStatus.PACKED,
                ];

                const cancellableStatuses = role === UserRole.ADMIN ? adminCancellableStatuses : customerCancellableStatuses;

                if (!cancellableStatuses.includes(order.status)) {
                    throw new BadRequestException(`Order cannot be cancelled when status is ${order.status}`);
                }

                // Change order status first
                const updatedOrder =
                    await tx.order.updateMany({
                        where: {
                            id: order.id,
                            userId,
                            status: {
                                in: cancellableStatuses,
                            },
                        },

                        data: { status: OrderStatus.CANCELLED },
                    });

                if (updatedOrder.count !== 1) {
                    throw new BadRequestException('Order could not be cancelled');
                }

                // Restore stock
                for (const item of order.items) {
                    await tx.productSize.update({
                        where: { id: item.productSizeId },

                        data: {
                            availableStock: { increment: item.quantity },
                        },
                    });
                }

                return tx.order.findUnique({
                    where: {
                        id: order.id,
                    },

                    include: {
                        items: true,
                        shippingAddress: true,
                        payment: true,
                        returnRequest: true,
                    },
                });
            },
        );
    }

    // REQUEST RETURN
    async requestReturn(
        userId: string,
        orderId: string,
        dto: CreateReturnRequestDto,
    ) {
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findFirst({
                where: {
                    id: orderId,
                    userId,
                },
            });

            if (!order) {
                throw new NotFoundException('Order not found');
            }

            if (order.status !== OrderStatus.DELIVERED) {
                throw new BadRequestException('Only delivered orders can be returned');
            }

            // Prevent duplicate return request
            const existingReturn =
                await tx.returnRequest.findUnique({
                    where: { orderId, },
                });

            if (existingReturn) {
                throw new BadRequestException('Return request already exists for this order');
            }

            const returnRequest =
                await tx.returnRequest.create({
                    data: {
                        orderId,
                        type: 'CUSTOMER_RETURN',
                        status: 'REQUESTED',
                        reason: dto.reason,
                    },
                });

            return returnRequest;
        });
    }

    // ADMIN - GET ALL ORDERS
    async getAllOrders() {
        return this.prisma.order.findMany({
            orderBy: { createdAt: 'desc' },

            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },

                items: true,
                payment: true,
                shippingAddress: true,
                returnRequest: true,
            },
        });
    }

    // ADMIN - GET ONE ORDER
    async getAdminOrder(orderId: string) {
        const order =
            await this.prisma.order.findUnique({
                where: { id: orderId },

                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                        },
                    },

                    items: {
                        include: {
                            productSize: {
                                include: {
                                    product: true,
                                    size: true,
                                },
                            },
                        },
                    },

                    shippingAddress: true,
                    payment: true,
                    returnRequest: true,
                },
            });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        return order;
    }

    // ADMIN - UPDATE STATUS
    async updateOrderStatus(
        orderId: string,
        dto: UpdateOrderStatusDto,
    ) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        this.validateStatusTransition(
            order.status,
            dto.status,
        );

        return this.prisma.order.update({
            where: { id: orderId },
            data: { status: dto.status },
            include: {
                items: true,
                shippingAddress: true,
                returnRequest: true,
                payment: true,
            },
        });
    }

    async createRto(
        orderId: string,
        dto: CreateRtoDto,
    ) {
        return this.prisma.$transaction(async (tx) => {
            const order =
                await tx.order.findUnique({
                    where: { id: orderId },
                });

            if (!order) {
                throw new NotFoundException('Order not found');
            }

            const allowedStatuses: OrderStatus[] = [
                OrderStatus.SHIPPED,
                OrderStatus.OUT_FOR_DELIVERY,
            ];

            if (
                !allowedStatuses.includes(order.status)
            ) {
                throw new BadRequestException(`RTO cannot be initiated when order status is ${order.status}`);
            }

            const existingReturn =
                await tx.returnRequest.findUnique({
                    where: { orderId },
                });

            if (existingReturn) {
                throw new BadRequestException('Return request already exists for this order');
            }

            const returnRequest =
                await tx.returnRequest.create({
                    data: {
                        orderId,
                        type: 'RTO',
                        status: 'REQUESTED',
                        reason: dto.reason,
                    },
                });

            await tx.order.update({
                where: { id: orderId },
                data: { status: OrderStatus.RTO },
            });

            return returnRequest;
        });
    }

    // STATUS TRANSITION VALIDATION
    private validateStatusTransition(
        current: OrderStatus,
        next: OrderStatus,
    ) {
        const transitions: Record<OrderStatus, OrderStatus[]> = {
            [OrderStatus.PENDING]: [OrderStatus.CONFIRMED],
            [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING],
            [OrderStatus.PROCESSING]: [OrderStatus.PACKED],
            [OrderStatus.PACKED]: [OrderStatus.SHIPPED],
            [OrderStatus.SHIPPED]: [OrderStatus.OUT_FOR_DELIVERY],
            [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
            [OrderStatus.DELIVERED]: [],
            [OrderStatus.RTO]: [],
            [OrderStatus.CANCELLED]: [],
        };

        if (current === next) {
            throw new BadRequestException(`Order is already ${current}`);
        }

        if (!transitions[current]?.includes(next)) {
            throw new BadRequestException(`Invalid order status transition: ${current} → ${next}`);
        }
    }

    // ORDER NUMBER
    private async generateOrderNumber(tx: Prisma.TransactionClient,) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        const dateString = `${year}${month}${day}`;
        const prefix = `KAZ-${dateString}`;

        // Prevent two concurrent transactions from generating
        // the same order number for the same date.
        const lockKey = Number(dateString);

        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

        const lastOrder = await tx.order.findFirst({
            where: { orderNumber: { startsWith: prefix } },
            orderBy: { createdAt: 'desc' },
            select: { orderNumber: true },
        });

        let sequence = 1;

        if (lastOrder) {
            const lastSequence = Number(lastOrder.orderNumber.split('-')[2]);
            sequence = lastSequence + 1;
        }

        return `${prefix}-${String(sequence).padStart(4, '0')}`;
    }
}