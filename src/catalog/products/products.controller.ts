import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';

import { ProductsService } from './products.service';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';

import { CreateProductSizeDto } from './dto/create-product-size.dto';
import { UpdateProductSizeDto } from './dto/update-product-size.dto';

import { CreateProductAttributeDto } from './dto/create-product-attribute.dto';
import { UpdateProductAttributeDto } from './dto/update-product-attribute.dto';

@Controller('catalog/products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Post()
    create(@Body() createProductDto: CreateProductDto) {
        return this.productsService.create(createProductDto);
    }

    @Get()
    findAll() {
        return this.productsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.productsService.findOne(id);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateProductDto: UpdateProductDto,
    ) {
        return this.productsService.update(
            id,
            updateProductDto,
        );
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.productsService.remove(id);
    }

    @Post(':productId/images')
    createImage(
        @Param('productId') productId: string,
        @Body() createImageDto: CreateProductImageDto,
    ) {
        return this.productsService.createImage(
            productId,
            createImageDto,
        );
    }

    @Patch(':productId/images/:imageId')
    updateImage(
        @Param('productId') productId: string,
        @Param('imageId') imageId: string,
        @Body() updateImageDto: UpdateProductImageDto,
    ) {
        return this.productsService.updateImage(
            productId,
            imageId,
            updateImageDto,
        );
    }

    @Delete(':productId/images/:imageId')
    removeImage(
        @Param('productId') productId: string,
        @Param('imageId') imageId: string,
    ) {
        return this.productsService.removeImage(
            productId,
            imageId,
        );
    }

    @Post(':productId/sizes')
    createSize(
        @Param('productId') productId: string,
        @Body() createSizeDto: CreateProductSizeDto,
    ) {
        return this.productsService.createSize(
            productId,
            createSizeDto,
        );
    }

    @Patch(':productId/sizes/:productSizeId')
    updateSize(
        @Param('productId') productId: string,
        @Param('productSizeId') productSizeId: string,
        @Body() updateSizeDto: UpdateProductSizeDto,
    ) {
        return this.productsService.updateSize(
            productId,
            productSizeId,
            updateSizeDto,
        );
    }

    @Delete(':productId/sizes/:productSizeId')
    removeSize(
        @Param('productId') productId: string,
        @Param('productSizeId') productSizeId: string,
    ) {
        return this.productsService.removeSize(
            productId,
            productSizeId,
        );
    }

    @Post(':productId/attributes')
    createAttribute(
        @Param('productId') productId: string,
        @Body()
        createAttributeDto: CreateProductAttributeDto,
    ) {
        return this.productsService.createAttribute(
            productId,
            createAttributeDto,
        );
    }

    @Patch(':productId/attributes/:attributeId')
    updateAttribute(
        @Param('productId') productId: string,
        @Param('attributeId') attributeId: string,
        @Body()
        updateAttributeDto: UpdateProductAttributeDto,
    ) {
        return this.productsService.updateAttribute(
            productId,
            attributeId,
            updateAttributeDto,
        );
    }

    @Delete(':productId/attributes/:attributeId')
    removeAttribute(
        @Param('productId') productId: string,
        @Param('attributeId') attributeId: string,
    ) {
        return this.productsService.removeAttribute(
            productId,
            attributeId,
        );
    }
}