import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
    imports: [
        ConfigModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.getOrThrow<string>(
                    'auth.accessTokenSecret',
                ),
                signOptions: {
                    expiresIn: configService.getOrThrow<StringValue>(
                        'auth.accessTokenExpiresIn',
                    ),
                },
            }),
        }),
    ],
    providers: [JwtAuthGuard],
    exports: [
        JwtAuthGuard,
        JwtModule,
    ],
})
export class JwtAuthModule { }