import { Module } from '@nestjs/common';
import { CategoriesController } from './categories/categories.controller';
import { CategoriesService } from './categories/categories.service';
import { SizesController } from './sizes/sizes.controller';
import { SizesService } from './sizes/sizes.service';

@Module({
    controllers: [CategoriesController, SizesController],
    providers: [CategoriesService, SizesService]
})
export class CatalogModule { }
