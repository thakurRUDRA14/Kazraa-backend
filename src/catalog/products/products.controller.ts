import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';

import { UserRole } from '../../../generated/prisma/enums';
import { Roles } from '../../common/jwt/roles.decorator';
import { JwtAuthGuard } from '../../common/jwt/jwt-auth.guard';
import { RolesGuard } from '../../common/jwt/roles.guard';

import { ProductsService } from './products.service';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductMediaDto } from './dto/update-product-media.dto';

import { CreateProductSizeDto } from './dto/create-product-size.dto';
import { UpdateProductSizeDto } from './dto/update-product-size.dto';

import { CreateProductAttributeDto } from './dto/create-product-attribute.dto';
import { UpdateProductAttributeDto } from './dto/update-product-attribute.dto';

@Controller('catalog/products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Get()
    findAll() {
        return this.productsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.productsService.findOne(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    create(@Body() createProductDto: CreateProductDto) {
        return this.productsService.create(createProductDto);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
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
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    remove(@Param('id') id: string) {
        return this.productsService.remove(id);
    }

    @Put(':productId/media')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async updateMedia(
        @Param('productId') productId: string,
        @Body() dto: UpdateProductMediaDto,
    ) {
        return this.productsService.updateMedia(
            productId,
            dto.media,
        );
    }

    @Post(':productId/sizes')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
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
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
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
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
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
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
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
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
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
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
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