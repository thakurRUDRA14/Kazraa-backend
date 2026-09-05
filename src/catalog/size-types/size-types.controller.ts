import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { UserRole } from '../../../generated/prisma/enums';
import { JwtAuthGuard } from '../../common/jwt/jwt-auth.guard';
import { RolesGuard } from '../../common/jwt/roles.guard';
import { Roles } from '../../common/jwt/roles.decorator';

import { SizeTypesService } from './size-types.service';

import { CreateSizeTypeDto } from './dto/create-size-type.dto';
import { UpdateSizeTypeDto } from './dto/update-size-type.dto';

@Controller('catalog/size-types')
export class SizeTypesController {
    constructor(private readonly sizeTypesService: SizeTypesService) { }

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

    // POST /catalog/size-types
    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    create(@Body() createSizeTypeDto: CreateSizeTypeDto) {
        return this.sizeTypesService.create(
            createSizeTypeDto,
        );
    }

    // PATCH /catalog/size-types/:id
    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
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
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    remove(@Param('id') id: string) {
        return this.sizeTypesService.remove(id);
    }
}