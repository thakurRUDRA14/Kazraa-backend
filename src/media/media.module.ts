import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { CloudinaryStorage } from './providers/cloudinary.storage';
import { MEDIA_STORAGE } from './constants/media.tokens';

@Module({
  providers: [
    MediaService,

    {
      provide: MEDIA_STORAGE,
      useClass: CloudinaryStorage,
    },
  ],
  controllers: [MediaController],
  exports: [MediaService],
})
export class MediaModule { }