import { Module } from '@nestjs/common';
import { CategoriesController } from './categories/categories.controller';
import { CategoriesService } from './categories/categories.service';
import { SizesController } from './sizes/sizes.controller';
import { SizesService } from './sizes/sizes.service';
import { AttributesController } from './attributes/attributes.controller';
import { AttributesService } from './attributes/attributes.service';
import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';

@Module({
    controllers: [CategoriesController, SizesController, AttributesController, ProductsController],
    providers: [CategoriesService, SizesService, AttributesService, ProductsService]
})
export class CatalogModule { }
