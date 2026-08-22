import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
} from '@nestjs/common';

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

    @Post()
    create(@Body() createAttributeDto: CreateAttributeDto) {
        return this.attributesService.create(createAttributeDto);
    }

    @Get()
    findAll() {
        return this.attributesService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.attributesService.findOne(id);
    }

    @Patch(':id')
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
    remove(@Param('id') id: string) {
        return this.attributesService.remove(id);
    }

    @Post(':attributeId/options')
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