import type { Request } from 'express';
import type { JwtPayload } from '../jwt/jwt-auth.guard';

export type AuthenticatedRequest = Request & {
    user: JwtPayload;
};