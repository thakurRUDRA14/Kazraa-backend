import { AuthUserResponseDto } from '../dto/auth-response.dto';

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface RegisterAuthResult extends AuthTokens {
    message: string;
    user: AuthUserResponseDto;
}