import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { AuthenticatedRequest } from '../types/authenticated-request';

export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

        const token = this.extractToken(request);

        if (!token) {
            throw new UnauthorizedException('Access token is required');
        }

        try {
            const payload = await this.jwtService.verifyAsync<JwtPayload>(
                token,
            );

            request.user = payload;

            return true;
        } catch {
            throw new UnauthorizedException('Invalid or expired access token');
        }
    }

    private extractToken(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];

        return type === 'Bearer' ? token : undefined;
    }
}