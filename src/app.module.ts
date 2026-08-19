import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { appConfig, authConfig } from './config';
import { PostgresModule } from './database/postgres/postgres.module';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,     // Make the configuration available globally
    cache: true,
    load: [appConfig, authConfig],
  }),
    PostgresModule,
    UsersModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
