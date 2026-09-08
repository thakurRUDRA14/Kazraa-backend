import { Module } from '@nestjs/common';
import { JwtAuthModule } from '../common/jwt/jwt-auth.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [JwtAuthModule],
  controllers: [CartController],
  providers: [CartService]
})
export class CartModule { }
