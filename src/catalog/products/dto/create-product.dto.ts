import { IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ImageType, ProductStatus } from '../../../../generated/prisma/enums';

export class CreateProductImageDto {
    @IsString()
    @IsNotEmpty()
    mediaId!: string;

    @IsEnum(ImageType)
    @IsOptional()
    type?: ImageType;

    @IsString()
    @IsOptional()
    @MaxLength(255)
    altText?: string;

    @IsBoolean()
    @IsOptional()
    isPrimary?: boolean;

    @IsInt()
    @Min(0)
    @IsOptional()
    sortOrder?: number;
}

export class CreateProductSizeDto {
    @IsString()
    @IsNotEmpty()
    sizeId!: string;

    @IsString()
    @IsNotEmpty()
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

export class CreateProductAttributeDto {
    @IsString()
    @IsNotEmpty()
    attributeId!: string;

    @IsString()
    @IsOptional()
    optionId?: string;

    @IsString()
    @IsOptional()
    value?: string;
}

export class CreateProductDto {
    @IsString()
    @IsNotEmpty()
    categoryId!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    name!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(220)
    slug!: string;

    @IsString()
    @IsOptional()
    @MaxLength(500)
    shortDescription?: string;

    @IsString()
    @IsNotEmpty()
    description!: string;

    @IsString()
    @IsOptional()
    @MaxLength(200)
    seoTitle?: string;

    @IsString()
    @IsOptional()
    @MaxLength(500)
    seoDescription?: string;

    @IsString()
    @IsOptional()
    seoKeywords?: string;

    @IsEnum(ProductStatus)
    @IsOptional()
    status?: ProductStatus;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateProductImageDto)
    @IsOptional()
    images?: CreateProductImageDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateProductSizeDto)
    @IsOptional()
    sizes?: CreateProductSizeDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateProductAttributeDto)
    @IsOptional()
    attributes?: CreateProductAttributeDto[];
}