import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthResponseDto, AuthTokensResponseDto } from './dto/auth-response.dto';
import { RegisterDto } from './dto/register.dto';
import { LogInDto } from './dto/login.dto';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('logIn')
  async logIn(
    @Body() logInDto: LogInDto,
  ): Promise<AuthTokensResponseDto> {
    return this.authService.logIn(logInDto);
  }
}
