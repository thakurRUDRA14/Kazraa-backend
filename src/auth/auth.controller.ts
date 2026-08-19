import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RegisterUserDto } from './dto/register-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  async registerUser(
    @Body() registerUserDto: RegisterUserDto,
  ): Promise<AuthResponseDto> {
    return this.authService.register(registerUserDto);
  }
}
