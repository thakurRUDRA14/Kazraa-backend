import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateAttributeOptionDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    label!: string;

    @IsInt()
    @Min(0)
    @IsOptional()
    sortOrder?: number;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}