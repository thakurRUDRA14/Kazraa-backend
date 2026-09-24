import { Module } from '@nestjs/common';
import { JwtAuthModule } from '../common/jwt/jwt-auth.module';
import { MediaModule } from '../media/media.module';
import { CategoriesController } from './categories/categories.controller';
import { CategoriesService } from './categories/categories.service';
import { SizesController } from './sizes/sizes.controller';
import { SizesService } from './sizes/sizes.service';
import { SizeTypesController } from './size-types/size-types.controller';
import { SizeTypesService } from './size-types/size-types.service';
import { AttributesController } from './attributes/attributes.controller';
import { AttributesService } from './attributes/attributes.service';
import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';

@Module({
    imports: [JwtAuthModule, MediaModule],
    controllers: [CategoriesController, SizesController, SizeTypesController, AttributesController, ProductsController],
    providers: [CategoriesService, SizesService, SizeTypesService, AttributesService, ProductsService]
})
export class CatalogModule { }
