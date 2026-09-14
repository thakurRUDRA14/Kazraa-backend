import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../common/jwt/jwt-auth.guard';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    createPayment(
        @Req() req: any,
        @Body() dto: CreatePaymentDto,
    ) {
        return this.paymentsService.createPayment(
            dto.orderId,
            req.user.id,
        );
    }

    @Post('verify')
    @UseGuards(JwtAuthGuard)
    verifyPayment(
        @Req() req: any,
        @Body() dto: VerifyPaymentDto,
    ) {
        return this.paymentsService.verifyPayment(
            dto.orderId,
            req.user.id,
        );
    }

    @Post(':orderId/refund')
    @UseGuards(JwtAuthGuard)
    refundPayment(
        @Param('orderId') orderId: string,
        @Body() dto: RefundPaymentDto,
    ) {
        return this.paymentsService.refundPayment(
            orderId,
            dto.amount,
            dto.note,
        );
    }

    @Post('webhook/cashfree')
    handleCashfreeWebhook(@Req() req: Request & { rawBody: Buffer }) {
        return this.paymentsService.handleCashfreeWebhook({
            rawBody: req.rawBody,
            payload: req.body,
            signature: req.headers['x-webhook-signature'],
            timestamp: req.headers['x-webhook-timestamp'],
        });
    }
}