import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateProductSizeDto {
    @IsString()
    sizeId!: string;

    @IsString()
    @MaxLength(100)
    sku!: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    barcode?: string;

    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    mrp!: number;

    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    sellingPrice!: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    availableStock?: number;

    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @IsOptional()
    weight?: number;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}