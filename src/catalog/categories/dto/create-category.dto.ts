import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateCategoryDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name!: string;

    @IsString()
    @IsOptional()
    @MaxLength(500)
    description?: string;

    @IsUrl()
    @IsOptional()
    imageUrl?: string;

    @IsString()
    @IsOptional()
    parentId?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}