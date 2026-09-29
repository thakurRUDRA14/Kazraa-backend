import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { appConfig, authConfig, paymentConfig, cashfreeConfig, cloudinaryConfig, mediaConfig } from './config';

import { AuthModule } from './auth/auth.module';
import { JwtAuthModule } from './common/jwt/jwt-auth.module';
import { PostgresModule } from './database/postgres/postgres.module';
import { UsersModule } from './users/users.module';
import { CatalogModule } from './catalog/catalog.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { MediaModule } from './media/media.module';
import { minutes, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,     // Make the configuration available globally
      cache: true,
      load: [appConfig, authConfig, paymentConfig, cashfreeConfig, mediaConfig, cloudinaryConfig], // Load the configuration from the appConfig and authConfig files
    }),
    ThrottlerModule.forRoot([
      {
        limit: 100,  // max 100 requests
        ttl: minutes(1), // 60 seconds
      },
    ]),
    JwtAuthModule,
    PostgresModule,
    UsersModule,
    AuthModule,
    CatalogModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    MediaModule,
  ],
  controllers: [AppController],
  providers: [AppService, {
    provide: APP_GUARD,
    useClass: ThrottlerGuard,
  }],
})
export class AppModule { }
