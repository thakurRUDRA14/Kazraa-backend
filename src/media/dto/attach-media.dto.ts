import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { MediaEntityType, MediaRole } from '../../../generated/prisma/enums';

export class AttachMediaDto {

    @IsEnum(MediaEntityType)
    entityType!: MediaEntityType;

    @IsString()
    entityId!: string;

    @IsEnum(MediaRole)
    role!: MediaRole;

    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number;
}