import { Controller, Delete, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt/jwt-auth.guard';
import { UsersService } from './users.service';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CriticalRateLimit, MutationRateLimit } from '../common/decorators/rate-limit.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('me')
    getMe(@Req() req: AuthenticatedRequest) {
        return this.usersService.getMe(req.user.sub);
    }

    @Patch('me')
    @MutationRateLimit()
    updateMe(
        @Req() req: AuthenticatedRequest,
        @Body() dto: UpdateUserDto,
    ) {
        return this.usersService.updateMe(req.user.sub, dto);
    }

    @Delete('me')
    @CriticalRateLimit()
    deleteMe(@Req() req: AuthenticatedRequest) {
        return this.usersService.deleteMe(req.user.sub);
    }

    @Patch('me/password')
    @CriticalRateLimit()
    changePassword(
        @Req() req,
        @Body() dto: ChangePasswordDto,
    ) {
        return this.usersService.changePassword(req.user.sub, dto);
    }
}