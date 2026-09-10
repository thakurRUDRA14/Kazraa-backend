import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  accessTokenSecret: process.env.JWT_ACCESS_SECRET,
  accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',

  refreshTokenSecret: process.env.JWT_REFRESH_SECRET,
  refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',

  bcryptSaltRounds: process.env.BCRYPT_SALT_ROUNDS ? parseInt(process.env.BCRYPT_SALT_ROUNDS) : 12,
}));
