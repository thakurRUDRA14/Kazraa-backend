import { MediaEntityType, MediaRole } from '../../../generated/prisma/enums';

export interface AttachMediaInput {
    mediaId: string;
    entityType: MediaEntityType;
    entityId: string;
    role: MediaRole;
    sortOrder?: number;
}