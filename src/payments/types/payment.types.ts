import { PaymentMethod, PaymentProvider, PaymentStatus } from '../../../generated/prisma/enums';
import { Decimal } from '../../../generated/prisma/internal/prismaNamespace';


export interface CreatePaymentRequest {
    orderId: string;
    amount: Decimal;
    method: PaymentMethod;
    customerId: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone: string;
}

export interface CreatePaymentResponse {
    provider: PaymentProvider;
    providerOrderId: string;
    paymentSessionId?: string;
    checkoutUrl?: string;
    status: PaymentStatus;
}

export interface VerifyPaymentRequest {
    providerOrderId: string;
    providerPaymentId?: string;
}

export interface VerifyPaymentResponse {
    providerPaymentId?: string;
    providerOrderId: string;
    status: PaymentStatus;
    amount?: Decimal;
    paidAt?: Date;
    rawResponse?: unknown;
}

export interface RefundPaymentRequest {
    orderId: string;
    providerOrderId: string;
    amount: Decimal;
    refundId: string;
    note?: string;
}

export interface RefundPaymentResponse {
    refundId: string;
    status: string;
    amount: Decimal;
    rawResponse?: unknown;
}

export interface PaymentWebhookRequest {
    payload: unknown;
    signature: string;
    timestamp: string;
    rawBody: string;
}

export interface PaymentWebhookResult {
    providerOrderId: string;
    providerPaymentId?: string;
    status: PaymentStatus;
    amount?: Decimal;
    paidAt?: Date;
    event?: string;
    rawResponse?: unknown;
}