import { IsEnum, IsString } from 'class-validator';
import { MediaEntityType, MediaRole } from '../../../generated/prisma/enums';

export class DetachMediaDto {

    @IsEnum(MediaEntityType)
    entityType!: MediaEntityType;

    @IsString()
    entityId!: string;

    @IsEnum(MediaRole)
    role!: MediaRole;
}