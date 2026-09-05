import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProductAttributeDto {
    @IsString()
    @IsNotEmpty()
    attributeId!: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    optionIds?: string[];

    @IsString()
    @IsOptional()
    value?: string;
}