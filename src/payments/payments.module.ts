import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtAuthModule } from '../common/jwt/jwt-auth.module';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

import { PaymentProviderFactory } from './providers/payment-provider.factory';

import { CashfreeClient } from './providers/cashfree/cashfree.client';
import { CashfreeProvider } from './providers/cashfree/cashfree.provider';

@Module({
  imports: [JwtAuthModule, ConfigModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentProviderFactory, CashfreeClient, CashfreeProvider],
  exports: [PaymentsService],
})
export class PaymentsModule { }