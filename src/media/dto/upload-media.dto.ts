import { IsEnum } from 'class-validator';

import { MediaPurpose } from '../../../generated/prisma/enums';

export class UploadMediaDto {

    @IsEnum(MediaPurpose)
    purpose!: MediaPurpose;
}