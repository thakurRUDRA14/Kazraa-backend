import { IsEnum, IsString } from 'class-validator';
import { PaymentMethod } from '../../../generated/prisma/enums';

export class CreatePaymentDto {
    @IsString()
    orderId!: string;

    @IsEnum(PaymentMethod)
    method!: PaymentMethod;
}