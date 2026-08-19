import { Injectable, ConflictException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { TokenService } from './services/token.service';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
  ) { }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
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
        tokens: {
          accessToken,
          refreshToken,
        },
      };
    } catch (error) {
      // Handle race condition / unique constraint
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email or phone number is already registered');
      }

      throw error;
    }
  }
}
