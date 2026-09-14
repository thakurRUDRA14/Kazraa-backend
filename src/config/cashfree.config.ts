import { registerAs } from '@nestjs/config';

export default registerAs('cashfree', () => ({
    environment: process.env.CASHFREE_ENVIRONMENT,
    appId: process.env.CASHFREE_APP_ID,
    secretKey: process.env.CASHFREE_SECRET_KEY,
}));
