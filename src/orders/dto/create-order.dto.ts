import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '../../../generated/prisma/enums';

export class CreateOrderDto {
    @IsString()
    addressId!: string;

    @IsEnum(PaymentMethod)
    paymentMethod!: PaymentMethod;

    @IsOptional()
    @IsString()
    notes?: string;
}