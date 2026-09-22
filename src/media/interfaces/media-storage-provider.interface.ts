import { StorageProvider } from "../../../generated/prisma/client";

export interface MediaUploadOptions {
    folder?: string;
    fileName?: string;
    mimeType?: string;
    resourceType?: 'image' | 'video' | 'raw';
}

export interface MediaUploadResult {
    url: string;
    publicId: string;

    width?: number;
    height?: number;
    duration?: number;
}

export interface MediaStorageProvider {
    readonly provider: StorageProvider;

    upload(
        file: Buffer,
        options: MediaUploadOptions,
    ): Promise<MediaUploadResult>;

    delete(
        publicId: string,
        resourceType?: 'image' | 'video' | 'raw',
    ): Promise<void>;

    getUrl(publicId: string): string;
}