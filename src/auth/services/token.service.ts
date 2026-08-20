import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { StringValue } from 'ms';

@Injectable()
export class TokenService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async generateAccessToken(payload: {
        sub: string;
        email: string;
        role: string;
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
        role: string;
    }): Promise<string> {
        return this.jwtService.signAsync(payload, {
            secret: this.configService.getOrThrow<string>('auth.refreshTokenSecret'),
            expiresIn: this.configService.get<StringValue>(
                'auth.refreshTokenExpiresIn',
                '7d',
            ),
        });
    }

    async verifyRefreshToken(token: string) {
        return this.jwtService.verifyAsync(token, {
            secret: this.configService.getOrThrow<string>(
                'JWT_REFRESH_SECRET',
            ),
        });
    }
}
