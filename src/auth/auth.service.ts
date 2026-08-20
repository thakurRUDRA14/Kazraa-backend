import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { TokenService } from './services/token.service';
import { RegisterDto } from './dto/register.dto';
import { LogInDto } from './dto/login.dto';
import { AuthTokens, RegisterAuthResult } from './types/auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
  ) { }

  async register(registerDto: RegisterDto): Promise<RegisterAuthResult> {
    const { email, phone, password } = registerDto;

    // 1. Check whether email already exists
    const existingEmail = await this.usersService.findByEmail(email);

    if (existingEmail) {
      throw new ConflictException('Email is already registered');
    }

    // 2. Check whether phone already exists
    const existingPhone = await this.usersService.findByPhone(phone);

    if (existingPhone) {
      throw new ConflictException('Phone number is already registered');
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    try {
      // 4. Create user
      const user = await this.usersService.createUser({
        email,
        phone,
        password: hashedPassword,
      });

      // 5. Generate authentication tokens
      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      const [accessToken, refreshToken] =
        await Promise.all([
          this.tokenService.generateAccessToken(payload),
          this.tokenService.generateRefreshToken(payload),
        ]);

      // 6. Return response
      return {
        message: 'User registered successfully',
        user,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      // Handle race condition / unique constraint
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email or phone number is already registered');
      }

      throw error;
    }
  }

  async logIn(logInDto: LogInDto): Promise<AuthTokens> {
    const { identifier, password } = logInDto;

    const user = await this.usersService.findByEmailOrPhone(identifier);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = await this.tokenService.generateRefreshToken({ sub: user.id, email: user.email, role: user.role });
    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshAccessToken(refreshToken: string) {
    let payload;

    try {
      payload = await this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const accessToken = await this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
    };
  }
}
