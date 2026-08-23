import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ProductStatus } from '../../../../generated/prisma/enums';

export class UpdateProductDto {
    @IsString()
    @IsOptional()
    categoryId?: string;

    @IsString()
    @IsOptional()
    @MaxLength(200)
    name?: string;

    @IsString()
    @IsOptional()
    @MaxLength(500)
    shortDescription?: string;

    @IsString()
    @IsOptional()
    description?: string;

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
}