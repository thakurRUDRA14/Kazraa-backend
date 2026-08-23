import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSizeTypeDto {
    @IsString()
    @MinLength(1)
    @MaxLength(50)
    name!: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}