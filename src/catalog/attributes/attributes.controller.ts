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

@Controller('catalog/attributes')
export class AttributesController {
    constructor(
        private readonly attributesServices: AttributesService,
    ) { }

    @Post()
    create(@Body() createAttributeDto: CreateAttributeDto) {
        return this.attributesServices.create(createAttributeDto);
    }

    @Get()
    findAll() {
        return this.attributesServices.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.attributesServices.findOne(id);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateAttributeDto: UpdateAttributeDto,
    ) {
        return this.attributesServices.update(
            id,
            updateAttributeDto,
        );
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.attributesServices.remove(id);
    }
}