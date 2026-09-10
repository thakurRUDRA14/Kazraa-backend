import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PostgresService } from '../database/postgres/postgres.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PostgresService) { }

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: {
        email,
        isDeleted: false,
      },
    });
  }

  async findByPhone(phone: string) {
    return this.prisma.user.findFirst({
      where: {
        phone,
        isDeleted: false,
      },
    });
  }

  async findByEmailOrPhone(identifier: string) {
    return this.prisma.user.findFirst({
      where: {
        isDeleted: false,
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
        isDeleted: false,
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
        isDeleted: false,
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
        isDeleted: false,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: {
        id: userId,
        isDeleted: false,
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

    const hashedPassword = await bcrypt.hash(dto.newPassword, process.env.BCRYPT_SALT_ROUNDS ? parseInt(process.env.BCRYPT_SALT_ROUNDS) : 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  async deleteMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return {
      message: 'Account deleted successfully',
    };
  }
}
