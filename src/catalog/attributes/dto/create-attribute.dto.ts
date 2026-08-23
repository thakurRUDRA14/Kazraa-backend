import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { AttributeType } from '../../../../generated/prisma/enums';

export class CreateAttributeDto {
    @IsString()
    @MaxLength(100)
    name!: string;

    @IsString()
    @MaxLength(100)
    slug!: string;

    @IsEnum(AttributeType)
    type!: AttributeType;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsBoolean()
    isRequired?: boolean;

    @IsOptional()
    @IsBoolean()
    isFilterable?: boolean;

    @IsOptional()
    @IsBoolean()
    isVariant?: boolean;

    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number;
}