import { Injectable } from '@nestjs/common';
import { PostgresService } from '../database/postgres/postgres.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PostgresService) { }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByPhone(phone: string) {
    return this.prisma.user.findUnique({
      where: { phone },
    });
  }

  async createUser(data: {
    email: string;
    phone: string;
    password: string;
  }) {
    return this.prisma.user.create({
      data,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });
  }
}
