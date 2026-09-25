import { Module } from '@nestjs/common';
import { JwtAuthModule } from '../common/jwt/jwt-auth.module';
import { MediaModule } from '../media/media.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [JwtAuthModule, MediaModule],
  controllers: [CartController],
  providers: [CartService]
})
export class CartModule { }
