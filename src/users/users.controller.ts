import { Controller, Delete, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/jwt/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('me')
    getMe(@Req() req: AuthenticatedRequest) {
        return this.usersService.getMe(req.user.sub);
    }

    @Patch('me')
    updateMe(
        @Req() req: AuthenticatedRequest,
        @Body() dto: UpdateUserDto,
    ) {
        return this.usersService.updateMe(req.user.sub, dto);
    }

    @Delete('me')
    deleteMe(@Req() req: AuthenticatedRequest) {
        return this.usersService.deleteMe(req.user.sub);
    }
}