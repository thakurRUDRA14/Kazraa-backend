import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateSizeDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    name!: string;

    @IsString()
    @IsOptional()
    @MaxLength(20)
    shortCode?: string;

    @IsInt()
    @Min(0)
    @IsOptional()
    sortOrder?: number;

    @IsString()
    sizeTypeId!: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}