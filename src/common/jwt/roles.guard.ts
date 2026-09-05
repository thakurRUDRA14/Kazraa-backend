import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../../generated/prisma/enums';

import { ROLES_KEY } from './roles.decorator';
import type { AuthenticatedRequest } from '../types/authenticated-request';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
    ) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
            ROLES_KEY,
            [
                context.getHandler(),
                context.getClass(),
            ],
        );

        // No @Roles() decorator means no role restriction.
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const request =
            context.switchToHttp().getRequest<AuthenticatedRequest>();

        const user = request.user;

        // JwtAuthGuard should normally run before RolesGuard.
        if (!user) {
            throw new ForbiddenException(
                'Authenticated user is required',
            );
        }
        // currently we are only allowing one role per user, so we can check if the user's role is in the required roles.
        // in future if we allow multiple roles per user, we can change this to check if any of the user's roles are in the required roles.
        if (!requiredRoles.includes(user.role)) {
            throw new ForbiddenException(
                'You do not have permission to access this resource',
            );
        }

        return true;
    }
}