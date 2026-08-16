import { Injectable } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// This class extends the PrismaClient and configures it to use the PostgreSQL adapter with the connection string from the environment variable DATABASE_URL.
// It is marked as Injectable so that it can be injected into other parts of the application using NestJS's dependency injection system.

@Injectable()
export class PostgresService extends PrismaClient {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
    });

    super({ adapter });
  }
}
