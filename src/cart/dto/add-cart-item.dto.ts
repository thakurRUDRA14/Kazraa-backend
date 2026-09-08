import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class AddCartItemDto {
    @IsString()
    @IsNotEmpty()
    productSizeId!: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    quantity!: number;
}