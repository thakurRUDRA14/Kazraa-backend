import { Module } from '@nestjs/common';
import { JwtAuthModule } from '../common/jwt/jwt-auth.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [JwtAuthModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule { }