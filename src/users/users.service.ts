import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { PostgresService } from '../database/postgres/postgres.service';
import { UserStatus } from '../../generated/prisma/enums';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PostgresService,
    private readonly configService: ConfigService
  ) { }

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
    });
  }

  async findByPhone(phone: string) {
    return this.prisma.user.findFirst({
      where: {
        phone,
        deletedAt: null,
      },
    });
  }

  async findByEmailOrPhone(identifier: string) {
    return this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { email: identifier },
          { phone: identifier },
        ],
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
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

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: {
        id: userId,
        deletedAt: null,
      },
      data: dto,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const isSamePassword = await bcrypt.compare(
      dto.newPassword,
      user.password,
    );

    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, this.configService.getOrThrow<string>('auth.bcryptSaltRounds'));

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  async deleteMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.INACTIVE,
        deletedAt: new Date(),
      },
    });

    return { message: 'Account deleted successfully' };
  }
}
