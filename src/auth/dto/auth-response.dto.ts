import { UserRole } from '../../../generated/prisma/enums';

export class AuthUserResponseDto {
  id!: string;
  email!: string;
  phone!: string;
  firstName!: string | null;
  lastName!: string | null;
  role!: UserRole;
  createdAt!: Date;
}

export class AuthResponseDto {
  message!: string;
  user!: AuthUserResponseDto;
  accessToken!: string;
}

export class AccessTokenResponseDto {
  accessToken!: string;
}
