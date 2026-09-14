import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { appConfig, authConfig, paymentConfig, cashfreeConfig } from './config';

import { AuthModule } from './auth/auth.module';
import { PostgresModule } from './database/postgres/postgres.module';
import { UsersModule } from './users/users.module';
import { CatalogModule } from './catalog/catalog.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,     // Make the configuration available globally
    cache: true,
    load: [appConfig, authConfig, paymentConfig, cashfreeConfig], // Load the configuration from the appConfig and authConfig files
  }),
    PostgresModule,
    UsersModule,
    AuthModule,
    CatalogModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
