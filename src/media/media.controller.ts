import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { MediaService } from './media.service';
import type File from 'multer'
import { UserRole } from '../../generated/prisma/enums';
import { AttachMediaDto } from './dto/attach-media.dto';
import { DetachMediaDto } from './dto/detach-media.dto';
import { JwtAuthGuard } from '../common/jwt/jwt-auth.guard';

import { type AuthenticatedRequest } from '../common/types/authenticated-request';

import { RolesGuard } from '../common/jwt/roles.guard';
import { Roles } from '../common/jwt/roles.decorator';
import { UploadMediaDto } from './dto/upload-media.dto';

@Controller('media')
export class MediaController {
    constructor(private readonly mediaService: MediaService) { }

    // Upload a physical media file.

    /* multipart/form-data:
    * file: <file>
    * purpose: PRODUCT
    */
    @Post('upload')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @UseInterceptors(FileInterceptor('file'))
    async upload(
        @UploadedFile() file: Express.Multer.File,
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

    //Get all media from the media library.
    @Get()
    @UseGuards(JwtAuthGuard)
    findAll() {
        return this.mediaService.findAll();
    }

    // Get one media item with its usages.
    @Get(':id')
    @UseGuards(JwtAuthGuard)
    findOne(@Param('id') id: string) {
        return this.mediaService.findOne(id);
    }

    // Attach media to an entity.
    /* Example:
     *
     * {
     *   "entityType": "PRODUCT",
     *   "entityId": "product-id",
     *   "role": "PRIMARY",
     *   "sortOrder": 0
     * }
     */
    @Post(':mediaId/attach')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async attach(
        @Param('mediaId') mediaId: string,
        @Body() dto: AttachMediaDto,
    ) {
        return this.mediaService.attach({
            mediaId,
            entityType: dto.entityType,
            entityId: dto.entityId,
            role: dto.role,
            sortOrder: dto.sortOrder,
        });
    }

    //  Detach media from an entity.
    /*Example:
     *
     * {
     *   "entityType": "PRODUCT",
     *   "entityId": "product-id",
     *   "role": "GALLERY"
     * }
     */
    @Delete(':mediaId/detach')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async detach(
        @Param('mediaId') mediaId: string,
        @Body() dto: DetachMediaDto,
    ) {
        return this.mediaService.detach(
            mediaId,
            dto.entityType,
            dto.entityId,
            dto.role,
        );
    }

    //  Delete media from storage and soft-delete its DB record.
    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    delete(@Param('id') id: string) {
        return this.mediaService.delete(id);
    }
}