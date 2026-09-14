import { IsOptional, IsString } from 'class-validator';

export class VerifyPaymentDto {
    @IsString()
    orderId!: string;
}