import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { MediaService } from './media.service';
import { UploadMediaDto } from './dto/upload-media.dto';

import { JwtAuthGuard } from '../common/jwt/jwt-auth.guard';
import { RolesGuard } from '../common/jwt/roles.guard';
import { Roles } from '../common/jwt/roles.decorator';
import { UserRole } from '../../generated/prisma/enums';

import { type AuthenticatedRequest } from '../common/types/authenticated-request';
import { type MediaFile } from './interfaces/media-file.interface';
import { MutationRateLimit, SensitiveRateLimit } from '../common/decorators/rate-limit.decorator';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
    constructor(private readonly mediaService: MediaService) { }

    /* Upload physical file.
     * multipart/form-data:
     * file: <file>
     * purpose: PRODUCT
     */
    @Post('upload')
    @SensitiveRateLimit()
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @UseInterceptors(FileInterceptor('file'))
    async upload(
        @UploadedFile() file: MediaFile,
        @Body() dto: UploadMediaDto,
        @Req() req: AuthenticatedRequest,
    ) {
        if (!file) { throw new BadRequestException('File is required') }

        return this.mediaService.upload({
            file,
            purpose: dto.purpose,
            uploadedById: req.user.sub,
        });
    }

    //Get media library.
    @Get()
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    findAll() {
        return this.mediaService.findAll();
    }

    // Get media details.

    @Get(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    findOne(@Param('id') id: string) {
        return this.mediaService.findOne(id);
    }

    //  Delete media from storage and soft-delete its DB record.
    @Delete(':id')
    @MutationRateLimit()
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    delete(@Param('id') id: string) {
        return this.mediaService.delete(id);
    }
}