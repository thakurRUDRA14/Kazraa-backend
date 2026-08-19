import { Global, Module } from '@nestjs/common';
import { PostgresService } from './postgres.service';

@Global() // This decorator makes the PostgresService available globally across the application, so you don't need to import the PostgresModule in every module where you want to use the PostgresService.
@Module({
  providers: [PostgresService],
  exports: [PostgresService],
})
export class PostgresModule {}
