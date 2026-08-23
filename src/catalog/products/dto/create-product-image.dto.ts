import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import { ImageType } from '../../../../generated/prisma/enums';

export class CreateProductImageDto {
    @IsString()
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