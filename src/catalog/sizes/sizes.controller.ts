import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';

import { CreateSizeDto } from './dto/create-size.dto';
import { UpdateSizeDto } from './dto/update-size.dto';

import { SizesService } from './sizes.service';

@Controller('catalog/sizes')
export class SizesController {
    constructor(
        private readonly sizesService: SizesService,
    ) { }

    @Post()
    create(@Body() createSizeDto: CreateSizeDto) {
        return this.sizesService.create(createSizeDto);
    }

    @Get()
    findAll() {
        return this.sizesService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.sizesService.findOne(id);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateSizeDto: UpdateSizeDto,
    ) {
        return this.sizesService.update(
            id,
            updateSizeDto,
        );
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.sizesService.remove(id);
    }
}