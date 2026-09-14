import { PaymentStatus } from '../../../../generated/prisma/enums';
import { Prisma } from '../../../../generated/prisma/client';

import {
    CashfreePaymentResponse,
    CashfreeRefundResponse,
} from './cashfree.types';

export class CashfreeMapper {
    static mapPaymentStatus(
        status: string,
    ): PaymentStatus {
        switch (status.toUpperCase()) {
            case 'SUCCESS':
            case 'PAID':
                return PaymentStatus.PAID;

            case 'FAILED':
            case 'CANCELLED':
                return PaymentStatus.FAILED;

            case 'PENDING':
            case 'USER_DROPPED':
            case 'NOT_ATTEMPTED':
                return PaymentStatus.PENDING;

            default:
                return PaymentStatus.PENDING;
        }
    }

    static mapPayment(
        payment: CashfreePaymentResponse,
    ) {
        return {
            providerPaymentId: String(payment.cf_payment_id),
            providerOrderId: payment.order_id,
            status: this.mapPaymentStatus(payment.payment_status),
            amount: new Prisma.Decimal(payment.payment_amount),
            paidAt:
                payment.payment_completion_time ||
                    payment.payment_time
                    ? new Date(
                        payment.payment_completion_time ??
                        payment.payment_time!,
                    )
                    : undefined,
            rawResponse: payment,
        };
    }

    static mapRefund(
        refund: CashfreeRefundResponse,
    ) {
        return {
            refundId: refund.refund_id,
            status: refund.refund_status,
            amount: new Prisma.Decimal(refund.refund_amount),
            rawResponse: refund,
        };
    }
}