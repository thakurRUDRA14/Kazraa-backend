import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { UserRole } from '../../../generated/prisma/enums';
import { JwtAuthGuard } from '../../common/jwt/jwt-auth.guard';
import { RolesGuard } from '../../common/jwt/roles.guard';
import { Roles } from '../../common/jwt/roles.decorator';

import { SizesService } from './sizes.service';

import { CreateSizeDto } from './dto/create-size.dto';
import { UpdateSizeDto } from './dto/update-size.dto';

@Controller('catalog/sizes')
export class SizesController {
    constructor(
        private readonly sizesService: SizesService,
    ) { }

    @Get()
    findAll() {
        return this.sizesService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.sizesService.findOne(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    create(@Body() createSizeDto: CreateSizeDto) {
        return this.sizesService.create(createSizeDto);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
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
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    remove(@Param('id') id: string) {
        return this.sizesService.remove(id);
    }
}