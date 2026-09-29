import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';

import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../../common/jwt/jwt-auth.guard';
import { MutationRateLimit } from '../../common/decorators/rate-limit.decorator';

@Controller('users/me/addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
    constructor(private readonly addressesService: AddressesService) { }

    @Get()
    async findAll(@Req() req: any) {
        return this.addressesService.findAll(req.user.sub);
    }

    @Post()
    @MutationRateLimit()
    async create(
        @Req() req: any,
        @Body() dto: CreateAddressDto,
    ) {
        return this.addressesService.create(
            req.user.sub,
            dto,
        );
    }

    @Patch(':id')
    @MutationRateLimit()
    async update(
        @Req() req: any,
        @Param('id') id: string,
        @Body() dto: UpdateAddressDto,
    ) {
        return this.addressesService.update(
            req.user.sub,
            id,
            dto,
        );
    }

    @Delete(':id')
    @MutationRateLimit()
    async remove(
        @Req() req: any,
        @Param('id') id: string,
    ) {
        return this.addressesService.remove(
            req.user.sub,
            id,
        );
    }
}