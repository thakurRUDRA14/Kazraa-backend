import { MediaPurpose } from '../../../generated/prisma/enums';
import { MediaFile } from './media-file.interface';

export interface UploadMediaInput {
    file: MediaFile;
    purpose: MediaPurpose;
    uploadedById?: string;
}