import { IsNotEmpty, IsString } from 'class-validator';

export class LogInDto {
  @IsString()
  @IsNotEmpty()
  identifier!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}