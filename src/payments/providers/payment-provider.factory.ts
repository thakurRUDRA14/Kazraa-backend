import { Injectable } from '@nestjs/common';
import { PaymentProvider as PrismaPaymentProvider } from '../../../generated/prisma/enums';

import { PaymentProvider } from './payment-provider.interface';
import { CashfreeProvider } from './cashfree/cashfree.provider';

@Injectable()
export class PaymentProviderFactory {
  constructor(
    private readonly cashfreeProvider: CashfreeProvider,
  ) { }
  getProvider(provider: PrismaPaymentProvider): PaymentProvider {
    switch (provider) {
      case PrismaPaymentProvider.CASHFREE:
        return this.cashfreeProvider;

      case PrismaPaymentProvider.RAZORPAY:
        throw new Error('Razorpay provider is not implemented yet');

      default:
        throw new Error(`Unsupported payment provider: ${provider}`);
    }
  }
}