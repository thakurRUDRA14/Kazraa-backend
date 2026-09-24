import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from '../../../../generated/prisma/enums';
import { ProductMediaDto } from './product-media.dto';
import { CreateProductSizeDto } from './create-product-size.dto';
import { CreateProductAttributeDto } from './create-product-attribute.dto';

export class CreateProductDto {
    @IsString()
    @IsNotEmpty()
    categoryId!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    name!: string;

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
    @Type(() => ProductMediaDto)
    @IsOptional()
    media?: ProductMediaDto[];

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