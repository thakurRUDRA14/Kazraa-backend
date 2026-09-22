import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

import {
    MediaStorageProvider,
    MediaUploadOptions,
    MediaUploadResult,
} from '../interfaces/media-storage-provider.interface';
import { StorageProvider } from '../../../generated/prisma/client';

@Injectable()
export class CloudinaryStorage implements MediaStorageProvider {

    readonly provider = StorageProvider.CLOUDINARY;

    constructor(private readonly configService: ConfigService) {
        cloudinary.config({
            cloud_name: this.configService.getOrThrow<string>('cloudinary.cloudName'),
            api_key: this.configService.getOrThrow<string>('cloudinary.apiKey'),
            api_secret: this.configService.getOrThrow<string>('cloudinary.apiSecret'),
            secure: true,
        });
    }

    async upload(
        file: Buffer,
        options: MediaUploadOptions,
    ): Promise<MediaUploadResult> {
        const resourceType = options.resourceType ?? 'image';

        const publicId = options.fileName
            ? this.buildPublicId(options.folder, options.fileName)
            : undefined;

        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: resourceType,

                    ...(publicId && {
                        public_id: publicId,
                    }),

                    ...(options.folder && {
                        folder: options.folder,
                    }),
                },
                (error, result) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    if (!result) {
                        reject(new Error('Cloudinary upload returned no result'));
                        return;
                    }

                    resolve(this.mapUploadResult(result));
                },
            );

            uploadStream.end(file);
        });
    }

    async delete(
        publicId: string,
        resourceType: 'image' | 'video' | 'raw' = 'image',
    ): Promise<void> {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
            invalidate: true,
        });

        if (result.result !== 'ok' && result.result !== 'not found') {
            throw new Error(`Failed to delete Cloudinary asset: ${result.result}`);
        }
    }

    getUrl(publicId: string): string {
        return cloudinary.url(publicId, { secure: true });
    }

    private buildPublicId(
        folder?: string,
        fileName?: string,
    ): string {
        if (!fileName) {
            throw new Error('fileName is required when building publicId');
        }

        const cleanFileName = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '-');

        return folder ? `${folder}/${cleanFileName}` : cleanFileName;
    }

    private mapUploadResult(result: UploadApiResponse): MediaUploadResult {
        return {
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            duration: result.duration,
        };
    }
}