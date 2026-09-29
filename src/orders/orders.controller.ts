import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../common/jwt/jwt-auth.guard';
import { OrdersService } from './orders.service';
import { CriticalRateLimit, MutationRateLimit, SensitiveRateLimit } from '../common/decorators/rate-limit.decorator';

import { CreateOrderDto } from './dto/create-order.dto';
import { CreateReturnRequestDto } from './dto/create-return-request.dto';
import { CreateRtoDto } from './dto/create-rto.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { RolesGuard } from '../common/jwt/roles.guard';
import { UserRole } from '../../generated/prisma/client';
import { Roles } from '../common/jwt/roles.decorator';

@Controller('/orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    // CUSTOMER
    @Post()
    @SensitiveRateLimit()
    createOrder(
        @Req() req,
        @Body() dto: CreateOrderDto,
    ) {
        return this.ordersService.createOrder(
            req.user.sub,
            dto,
        );
    }

    @Get('me')
    getMyOrders(@Req() req) {
        return this.ordersService.getMyOrders(req.user.sub);
    }

    @Get('me/:id')
    getMyOrder(
        @Req() req,
        @Param('id') orderId: string,
    ) {
        return this.ordersService.getMyOrder(
            req.user.sub,
            orderId,
        );
    }

    // Role is passed to service to check if the user is admin or customer. Admin can cancel any order, customer can only cancel their own order.
    @Patch(':id/cancel')
    @CriticalRateLimit()
    cancelOrder(
        @Req() req,
        @Param('id') orderId: string,
    ) {
        return this.ordersService.cancelOrder(
            req.user.sub,
            req.user.role,
            orderId,
        );
    }

    @Post(':id/return')
    @CriticalRateLimit()
    requestReturn(
        @Req() req,
        @Param('id') orderId: string,
        @Body() dto: CreateReturnRequestDto,
    ) {
        return this.ordersService.requestReturn(
            req.user.sub,
            orderId,
            dto,
        );
    }

    // ADMIN
    @Get()
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    getAllOrders() {
        return this.ordersService.getAllOrders();
    }

    @Get(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    getAdminOrder(@Param('id') orderId: string) {
        return this.ordersService.getAdminOrder(orderId);
    }

    @Patch(':id/status')
    @MutationRateLimit()
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    updateOrderStatus(
        @Param('id') orderId: string,
        @Body() dto: UpdateOrderStatusDto,
    ) {
        return this.ordersService.updateOrderStatus(
            orderId,
            dto,
        );
    }

    @Post(':id/rto')
    @MutationRateLimit()
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    createRto(
        @Param('id') orderId: string,
        @Body() dto: CreateRtoDto,
    ) {
        return this.ordersService.createRto(
            orderId,
            dto,
        );
    }
}   