import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../common/jwt/jwt-auth.guard';
import { CartService } from './cart.service';

import { type AuthenticatedRequest } from '../common/types/authenticated-request';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { MutationRateLimit } from '../common/decorators/rate-limit.decorator';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
    constructor(private readonly cartService: CartService) { }

    @Get()
    async getCart(@Req() req: AuthenticatedRequest) {
        return this.cartService.getCart(req.user.sub);
    }

    @Post('items')
    @MutationRateLimit()
    async addItem(
        @Req() req: AuthenticatedRequest,
        @Body() dto: AddCartItemDto,
    ) {
        return this.cartService.addItem(
            req.user.sub,
            dto,
        );
    }

    @Patch('items/:id')
    @MutationRateLimit()
    async updateItem(
        @Req() req: AuthenticatedRequest,
        @Param('id') itemId: string,
        @Body() dto: UpdateCartItemDto,
    ) {
        return this.cartService.updateItem(
            req.user.sub,
            itemId,
            dto,
        );
    }

    @Delete('items/:id')
    @MutationRateLimit()
    async removeItem(
        @Req() req: AuthenticatedRequest,
        @Param('id') itemId: string,
    ) {
        return this.cartService.removeItem(
            req.user.sub,
            itemId,
        );
    }

    @Delete()
    @MutationRateLimit()
    async clearCart(@Req() req: AuthenticatedRequest) {
        return this.cartService.clearCart(req.user.sub);
    }
}