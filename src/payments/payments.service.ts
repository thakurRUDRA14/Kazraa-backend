import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethod, PaymentProvider, PaymentStatus } from '../../generated/prisma/enums';
import { PostgresService } from '../database/postgres/postgres.service';
import { PaymentProviderFactory } from './providers/payment-provider.factory';

@Injectable()
export class PaymentsService {
    constructor(
        private readonly prisma: PostgresService,
        private readonly providerFactory: PaymentProviderFactory,
    ) { }

    async createPayment(
        orderId: string,
        userId: string,
        provider: PaymentProvider = PaymentProvider.CASHFREE,
    ) {
        const order = await this.prisma.order.findFirst({
            where: {
                id: orderId,
                userId,
            },
            include: {
                payment: true,
                user: true,
                shippingAddress: true,
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        if (!order.payment) {
            throw new NotFoundException('Payment not found');
        }

        if (order.payment.status === PaymentStatus.PAID) {
            throw new BadRequestException('Order is already paid');
        }

        // COD does not use a payment provider
        if (order.payment.method === PaymentMethod.COD) {
            return order.payment;
        }

        const paymentProvider =
            this.providerFactory.getProvider(provider);

        try {
            const result =
                await paymentProvider.createPayment({
                    orderId: order.id,
                    amount: order.total,
                    method: order.payment.method,
                    customerId: order.user.id,
                    customerName:
                        `${order.user.firstName ?? ''} ${order.user.lastName ?? ''}`.trim(),
                    customerEmail: order.user.email,
                    customerPhone: order.user.phone,
                });

            return await this.prisma.payment.update({
                where: {
                    id: order.payment.id,
                },
                data: {
                    provider,
                    providerOrderId: result.providerOrderId,
                    providerResponse: result as any,
                },
            });
        } catch (error) {
            throw error;
        }
    }

    async verifyPayment(
        orderId: string,
        userId: string,
    ) {
        const payment =
            await this.prisma.payment.findFirst({
                where: {
                    orderId,
                    order: { userId },
                },
            });

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        if (!payment.provider) {
            throw new BadRequestException('This payment does not use a payment provider');
        }

        if (!payment.providerOrderId) {
            throw new BadRequestException('Provider order has not been created');
        }

        const provider = this.providerFactory.getProvider(payment.provider);

        const result =
            await provider.verifyPayment({
                providerOrderId: payment.providerOrderId,
                providerPaymentId: payment.providerPaymentId ?? undefined,
            });

        return this.prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: result.status,
                providerPaymentId:
                    result.providerPaymentId,
                paidAt: result.paidAt,
                providerResponse:
                    result.rawResponse as any,
            },
        });
    }

    async refundPayment(
        orderId: string,
        amount: number,
        note?: string,
    ) {
        const payment =
            await this.prisma.payment.findUnique({
                where: {
                    orderId,
                },
            });

        if (!payment) {
            throw new NotFoundException(
                'Payment not found',
            );
        }

        if (!payment.provider) {
            throw new BadRequestException(
                'COD payment cannot be refunded through a payment provider',
            );
        }

        if (!payment.providerOrderId) {
            throw new BadRequestException(
                'Provider order ID is missing',
            );
        }

        if (payment.status !== PaymentStatus.PAID) {
            throw new BadRequestException(
                'Only paid payments can be refunded',
            );
        }

        if (amount <= 0 || amount > Number(payment.amount)) {
            throw new BadRequestException(
                'Invalid refund amount',
            );
        }

        const provider =
            this.providerFactory.getProvider(
                payment.provider,
            );

        return provider.refundPayment({
            orderId,
            providerOrderId:
                payment.providerOrderId,
            amount: payment.amount,
            refundId: `refund_${orderId}_${Date.now()}`,
            note,
        });
    }

    async handleCashfreeWebhook(request: {
        rawBody: Buffer;
        payload: unknown;
        signature: string;
        timestamp: string;
    }) {
        const provider = this.providerFactory.getProvider(PaymentProvider.CASHFREE);

        const result =
            await provider.handleWebhook({
                rawBody: request.rawBody.toString('utf8'),
                payload: request.payload,
                signature: request.signature,
                timestamp: request.timestamp,
            });

        const payment =
            await this.prisma.payment.findFirst({
                where: {
                    providerOrderId: result.providerOrderId,
                },
            });

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        // Never downgrade a successful payment.
        if (payment.status === PaymentStatus.PAID && result.status !== PaymentStatus.PAID) {
            return {
                success: true,
                ignored: true,
            };
        }

        await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: result.status,
                providerPaymentId: result.providerPaymentId,
                paidAt: result.paidAt,
                providerResponse: result.rawResponse as any,
            },
        });

        return { success: true };
    }
}