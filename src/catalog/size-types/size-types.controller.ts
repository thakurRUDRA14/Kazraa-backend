import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';

import { SizeTypesService } from './size-types.service';

import { CreateSizeTypeDto } from './dto/create-size-type.dto';
import { UpdateSizeTypeDto } from './dto/update-size-type.dto';

@Controller('catalog/size-types')
export class SizeTypesController {
    constructor(private readonly sizeTypesService: SizeTypesService) { }

    // POST /catalog/size-types
    @Post()
    create(@Body() createSizeTypeDto: CreateSizeTypeDto) {
        return this.sizeTypesService.create(
            createSizeTypeDto,
        );
    }

    // GET /catalog/size-types
    @Get()
    findAll() {
        return this.sizeTypesService.findAll();
    }

    // GET /catalog/size-types/:id
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.sizeTypesService.findOne(id);
    }

    // PATCH /catalog/size-types/:id
    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateSizeTypeDto: UpdateSizeTypeDto,
    ) {
        return this.sizeTypesService.update(
            id,
            updateSizeTypeDto,
        );
    }

    // DELETE /catalog/size-types/:id
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.sizeTypesService.remove(id);
    }
}