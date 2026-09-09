import { Module } from '@nestjs/common';
import { JwtAuthModule } from '../common/jwt/jwt-auth.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AddressesController } from './addresses/addresses.controller';
import { AddressesService } from './addresses/addresses.service';

@Module({
  imports: [JwtAuthModule],
  controllers: [UsersController, AddressesController],
  providers: [UsersService, AddressesService],
  exports: [UsersService, AddressesService],
})
export class UsersModule { }