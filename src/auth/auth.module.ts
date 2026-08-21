import { Module } from '@nestjs/common';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TokenService } from './services/token.service';
import { UsersModule } from '../users/users.module';
import { JwtAuthModule } from '../common/jwt/jwt-auth.module';

@Module({
  imports: [
    UsersModule,
    JwtAuthModule,
  ],
  controllers: [AuthController],
  providers: [
    TokenService,
    AuthService,
  ],
  exports: [
    AuthService,
    TokenService,
  ],
})
export class AuthModule { }