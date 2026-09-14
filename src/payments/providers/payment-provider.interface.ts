import {
    CreatePaymentRequest,
    CreatePaymentResponse,
    PaymentWebhookRequest,
    PaymentWebhookResult,
    RefundPaymentRequest,
    RefundPaymentResponse,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
} from '../types/payment.types';

export interface PaymentProvider {
    createPayment(
        request: CreatePaymentRequest,
    ): Promise<CreatePaymentResponse>;

    verifyPayment(
        request: VerifyPaymentRequest,
    ): Promise<VerifyPaymentResponse>;

    refundPayment(
        request: RefundPaymentRequest,
    ): Promise<RefundPaymentResponse>;

    handleWebhook(
        request: PaymentWebhookRequest,
    ): Promise<PaymentWebhookResult>;
}