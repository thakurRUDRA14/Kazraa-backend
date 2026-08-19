export class AuthUserResponseDto {
  id!: string;
  email!: string;
  phone!: string;
  firstName!: string | null;
  lastName!: string | null;
  role!: string;
  createdAt!: Date;
}

export class AuthTokensResponseDto {
  accessToken!: string;
  refreshToken!: string;
}

export class AuthResponseDto {
  message!: string;
  user!: AuthUserResponseDto;
  tokens!: AuthTokensResponseDto;
}