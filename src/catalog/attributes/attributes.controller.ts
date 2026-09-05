import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { UserRole } from '../../../generated/prisma/enums';
import { JwtAuthGuard } from '../../common/jwt/jwt-auth.guard';
import { RolesGuard } from '../../common/jwt/roles.guard';
import { Roles } from '../../common/jwt/roles.decorator';

import { AttributesService } from './attributes.service';

import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { CreateAttributeOptionDto } from './dto/create-attribute-option.dto';
import { UpdateAttributeOptionDto } from './dto/update-attribute-option.dto';

@Controller('catalog/attributes')
export class AttributesController {
    constructor(
        private readonly attributesService: AttributesService,
    ) { }

    @Get()
    findAll() {
        return this.attributesService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.attributesService.findOne(id);
    }


    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    create(@Body() createAttributeDto: CreateAttributeDto) {
        return this.attributesService.create(createAttributeDto);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    update(
        @Param('id') id: string,
        @Body() updateAttributeDto: UpdateAttributeDto,
    ) {
        return this.attributesService.update(
            id,
            updateAttributeDto,
        );
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    remove(@Param('id') id: string) {
        return this.attributesService.remove(id);
    }

    @Post(':attributeId/options')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    createOption(
        @Param('attributeId') attributeId: string,
        @Body() createOptionDto: CreateAttributeOptionDto,
    ) {
        return this.attributesService.createOption(
            attributeId,
            createOptionDto,
        );
    }

    @Patch(':attributeId/options/:optionId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    updateOption(
        @Param('attributeId') attributeId: string,
        @Param('optionId') optionId: string,
        @Body() updateOptionDto: UpdateAttributeOptionDto,
    ) {
        return this.attributesService.updateOption(
            attributeId,
            optionId,
            updateOptionDto,
        );
    }

    @Delete(':attributeId/options/:optionId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    removeOption(
        @Param('attributeId') attributeId: string,
        @Param('optionId') optionId: string,
    ) {
        return this.attributesService.removeOption(
            attributeId,
            optionId,
        );
    }
}