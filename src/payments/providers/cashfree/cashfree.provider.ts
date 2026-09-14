import { Injectable } from '@nestjs/common';
import { PaymentProvider, PaymentStatus } from '../../../../generated/prisma/enums';
import { PaymentProvider as PaymentProviderInterface } from '../payment-provider.interface';
import { CashfreeClient } from './cashfree.client';
import { CashfreeMapper } from './cashfree.mapper';

import {
    CreatePaymentRequest,
    CreatePaymentResponse,
    PaymentWebhookRequest,
    PaymentWebhookResult,
    RefundPaymentRequest,
    RefundPaymentResponse,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
} from '../../types/payment.types';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CashfreeProvider implements PaymentProviderInterface {
    constructor(
        private readonly client: CashfreeClient,
        private readonly configService: ConfigService,
    ) { }

    async createPayment(
        request: CreatePaymentRequest,
    ): Promise<CreatePaymentResponse> {
        const providerOrderId = `kazraa_${request.orderId}`;

        const response = await this.client.createOrder({
            order_id: providerOrderId,
            order_amount: Number(request.amount),
            order_currency: 'INR',

            customer_details: {
                customer_id: request.customerId,
                customer_name: request.customerName,
                customer_email: request.customerEmail,
                customer_phone: request.customerPhone,
            },

            order_meta: {
                return_url: this.configService.getOrThrow<string>('payment.returnURL'),
                notify_url: this.configService.getOrThrow<string>('payment.webhookURL'),
            },
        });

        return {
            provider: PaymentProvider.CASHFREE,
            providerOrderId: response.order_id,
            paymentSessionId: response.payment_session_id,
            status: PaymentStatus.PENDING,
        };
    }

    async verifyPayment(
        request: VerifyPaymentRequest,
    ): Promise<VerifyPaymentResponse> {
        const payments = await this.client.fetchPayments(
            request.providerOrderId,
        );

        if (!payments.length) {
            return {
                providerOrderId: request.providerOrderId,
                status: PaymentStatus.PENDING,
            };
        }

        const payment = request.providerPaymentId
            ? payments.find(
                (item) =>
                    String(item.cf_payment_id) ===
                    request.providerPaymentId,
            )
            : payments[payments.length - 1];

        if (!payment) {
            return {
                providerOrderId: request.providerOrderId,
                status: PaymentStatus.PENDING,
            };
        }

        return CashfreeMapper.mapPayment(payment);
    }

    async refundPayment(
        request: RefundPaymentRequest,
    ): Promise<RefundPaymentResponse> {
        const response = await this.client.createRefund(
            request.providerOrderId,
            {
                refund_amount: Number(request.amount),
                refund_id: request.refundId,
                refund_note: request.note,
                refund_speed: 'STANDARD',
            },
        );

        return CashfreeMapper.mapRefund(response);
    }

    async handleWebhook(
        request: PaymentWebhookRequest,
    ): Promise<PaymentWebhookResult> {
        // Signature verification should happen before this point
        // or inside the client/provider boundary.

        const payload = request.payload as Record<string, any>;

        const orderId =
            payload?.data?.order?.order_id ??
            payload?.order_id;

        const payment =
            payload?.data?.payment ??
            payload?.payment;

        const status =
            payment?.payment_status ??
            payload?.payment_status;

        return {
            providerOrderId: orderId,
            providerPaymentId: payment?.cf_payment_id
                ? String(payment.cf_payment_id)
                : undefined,
            status: CashfreeMapper.mapPaymentStatus(status),
            amount: payment?.payment_amount,
            paidAt: payment?.payment_time
                ? new Date(payment.payment_time)
                : undefined,
            event: payload?.type,
            rawResponse: payload,
        };
    }
}