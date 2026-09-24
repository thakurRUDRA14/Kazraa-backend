import {
    IsArray,
    ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

import { ProductMediaDto } from './product-media.dto';

export class UpdateProductMediaDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ProductMediaDto)
    media!: ProductMediaDto[];
}