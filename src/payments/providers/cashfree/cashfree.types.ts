export interface CashfreeCreateOrderRequest {
    order_amount: number;
    order_currency: string;
    order_id: string;

    customer_details: {
        customer_id: string;
        customer_name?: string;
        customer_email?: string;
        customer_phone: string;
    };

    order_meta?: {
        return_url?: string;
        notify_url?: string;
    };
}

export interface CashfreeCreateOrderResponse {
    cf_order_id: string;
    order_id: string;
    order_amount: number;
    order_currency: string;
    order_status: string;
    payment_session_id: string;
    created_at: string;
}

export interface CashfreePaymentResponse {
    cf_payment_id: string;
    order_id: string;
    payment_status: string;
    payment_amount: number;
    payment_time?: string;
    payment_completion_time?: string;
}

export interface CashfreeRefundRequest {
    refund_amount: number;
    refund_id: string;
    refund_note?: string;
    refund_speed?: 'STANDARD' | 'INSTANT';
}

export interface CashfreeRefundResponse {
    cf_payment_id: string | number;
    cf_refund_id: string;
    refund_id: string;
    order_id: string;
    refund_amount: number;
    refund_status: string;
    created_at?: string;
    processed_at?: string;
}