import { registerAs } from "@nestjs/config";

export default registerAs('media', () => ({
    maxImageSizeMb: Number(process.env.MEDIA_MAX_IMAGE_SIZE_MB ?? 10),
    maxVideoSizeMb: Number(process.env.MEDIA_MAX_VIDEO_SIZE_MB ?? 50),
}));