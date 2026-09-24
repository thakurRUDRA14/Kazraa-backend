import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

import { MediaRole } from '../../../../generated/prisma/enums';

export class ProductMediaDto {
    @IsString()
    mediaId!: string;

    @IsEnum(MediaRole)
    role!: MediaRole;

    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number;
}