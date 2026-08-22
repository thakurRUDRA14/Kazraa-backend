import { Module } from '@nestjs/common';
import { CategoriesController } from './categories/categories.controller';
import { CategoriesService } from './categories/categories.service';
import { SizesController } from './sizes/sizes.controller';
import { SizesService } from './sizes/sizes.service';
import { AttributesController } from './attributes/attributes.controller';
import { AttributesService } from './attributes/attributes.service';

@Module({
    controllers: [CategoriesController, SizesController, AttributesController],
    providers: [CategoriesService, SizesService, AttributesService]
})
export class CatalogModule { }
