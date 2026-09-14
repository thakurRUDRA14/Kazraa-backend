import { registerAs } from '@nestjs/config';

export default registerAs('payment', () => ({
    returnURL: process.env.PAYMENT_RETURN_URL,
    webhookURL: process.env.PAYMENT_WEBHOOK_URL,
}));
