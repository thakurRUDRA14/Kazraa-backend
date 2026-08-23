import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PostgresService } from '../../database/postgres/postgres.service';
import { createHash } from 'node:crypto';
import ms, { StringValue } from 'ms';
import { UserRole } from '../../../generated/prisma/enums';

@Injectable()
export class TokenService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly prisma: PostgresService,
    ) { }

    private hashToken(token: string): string {
        return createHash('sha256')
            .update(token)
            .digest('hex');
    }

    async generateAccessToken(payload: {
        sub: string;
        email: string;
        role: UserRole;
    }): Promise<string> {
        return this.jwtService.signAsync(payload, {
            secret: this.configService.getOrThrow<string>('auth.accessTokenSecret'),
            expiresIn: this.configService.get<StringValue>(
                'auth.accessTokenExpiresIn',
                '15m',
            ),
        });
    }

    async generateRefreshToken(payload: {
        sub: string;
        email: string;
        role: UserRole;
    }): Promise<string> {
        return this.jwtService.signAsync(payload, {
            secret: this.configService.getOrThrow<string>('auth.refreshTokenSecret'),
            expiresIn: this.configService.get<StringValue>(
                'auth.refreshTokenExpiresIn',
                '7d',
            ),
        });
    }

    getRefreshTokenExpiration(): Date {
        const expiresIn = this.configService.getOrThrow<StringValue>(
            'auth.refreshTokenExpiresIn',
        );

        return new Date(Date.now() + ms(expiresIn));
    }

    async verifyRefreshToken(token: string) {
        return this.jwtService.verifyAsync(token, {
            secret: this.configService.getOrThrow<string>(
                'JWT_REFRESH_SECRET',
            ),
        });
    }

    async validateStoredRefreshToken(
        refreshToken: string,
    ): Promise<string> {
        const tokenHash = this.hashToken(refreshToken);

        const storedToken = await this.prisma.refreshToken.findUnique({
            where: {
                tokenHash,
            },
        });

        if (!storedToken) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        if (storedToken.revokedAt) {
            throw new UnauthorizedException('Refresh token has been revoked');
        }

        if (storedToken.expiresAt <= new Date()) {
            throw new UnauthorizedException('Refresh token has expired');
        }

        return storedToken.userId;
    }

    async storeRefreshToken(
        userId: string,
        refreshToken: string,
        expiresAt: Date,
    ): Promise<void> {
        const tokenHash = this.hashToken(refreshToken);

        await this.prisma.refreshToken.create({
            data: {
                userId,
                tokenHash,
                expiresAt,
            },
        });
    }

    async revokeRefreshToken(refreshToken: string): Promise<void> {
        const tokenHash = this.hashToken(refreshToken);
        await this.prisma.refreshToken.deleteMany({
            where: {
                tokenHash,
            },
        });
    }
}
