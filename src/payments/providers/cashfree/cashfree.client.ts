import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cashfree, CFEnvironment } from 'cashfree-pg';

import { CashfreeCreateOrderRequest, CashfreeCreateOrderResponse, CashfreePaymentResponse, CashfreeRefundRequest, CashfreeRefundResponse } from './cashfree.types';

@Injectable()
export class CashfreeClient {
    private readonly cashfree: Cashfree;

    constructor(private readonly configService: ConfigService) {
        const environment = this.configService.getOrThrow<string>('cashfree.environment');
        const appId = this.configService.getOrThrow<string>('cashfree.appId');
        const secretKey = this.configService.getOrThrow<string>('cashfree.secretKey');

        this.cashfree = new Cashfree(
            environment === 'PRODUCTION' ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX,
            appId,
            secretKey,
        );
    }

    async createOrder(
        request: CashfreeCreateOrderRequest,
    ): Promise<CashfreeCreateOrderResponse> {
        const response = await this.cashfree.PGCreateOrder(request);
        return response.data as CashfreeCreateOrderResponse;
    }

    async fetchOrder(orderId: string): Promise<unknown> {
        const response = await this.cashfree.PGFetchOrder(orderId);
        return response.data;
    }

    async fetchPayments(
        orderId: string,
    ): Promise<CashfreePaymentResponse[]> {
        const response =
            await this.cashfree.PGOrderFetchPayments(orderId);

        return response.data as CashfreePaymentResponse[];
    }

    async fetchPayment(
        orderId: string,
        paymentId: string,
    ): Promise<CashfreePaymentResponse> {
        const response =
            await this.cashfree.PGOrderFetchPayment(
                orderId,
                paymentId,
            );

        return response.data as CashfreePaymentResponse;
    }

    async createRefund(
        orderId: string,
        request: CashfreeRefundRequest,
    ): Promise<CashfreeRefundResponse> {
        const response = await this.cashfree.PGOrderCreateRefund(
            orderId,
            request,
        );

        return response.data as CashfreeRefundResponse;
    }
}