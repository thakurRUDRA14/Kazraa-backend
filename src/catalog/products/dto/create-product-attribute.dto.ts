import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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