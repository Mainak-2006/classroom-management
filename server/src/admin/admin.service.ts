import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import type { Admin } from '@prisma/client';

type SafeAdmin = Omit<Admin, 'password'>;

function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async validateAdmin(
    email: string,
    password: string,
  ): Promise<SafeAdmin | null> {
    const admin = await this.prisma.admin.findUnique({ where: { email } });

    if (admin && (await bcrypt.compare(password, admin.password))) {
      return omit(admin, ['password']);
    }

    return null;
  }

  async create(createAdminDto: CreateAdminDto) {
    const exists = await this.prisma.admin.findUnique({
      where: { email: createAdminDto.email },
      select: { id: true },
    });

    if (exists) {
      throw new ConflictException('Admin with this email already exists.');
    }

    await this.assertEmailAvailableAcrossAccounts(createAdminDto.email);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createAdminDto.password, salt);

    const { confirmPassword, ...rest } = createAdminDto;

    const admin = await this.prisma.admin.create({
      data: {
        ...rest,
        dateOfBirth: new Date(rest.dateOfBirth),
        password: hashedPassword,
      },
    });

    return {
      message: 'Admin created successfully',
      data: omit(admin, ['password']),
    };
  }

  async findAll() {
    const admins = await this.prisma.admin.findMany();

    return {
      total: admins.length,
      data: admins.map((admin) => omit(admin, ['password'])),
    };
  }

  async findOne(id: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id } });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    return omit(admin, ['password']);
  }

  async update(id: string, updateAdminDto: UpdateAdminDto) {
    const exists = await this.prisma.admin.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Admin not found');
    }

    if (updateAdminDto.email) {
      await this.assertEmailAvailableAcrossAccounts(updateAdminDto.email, id);
    }

    const { confirmPassword, password, ...rest } = updateAdminDto;

    const data: Parameters<typeof this.prisma.admin.update>[0]['data'] = {
      ...rest,
    };

    if (rest.dateOfBirth) {
      data.dateOfBirth = new Date(rest.dateOfBirth);
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(password, salt);
    }

    const admin = await this.prisma.admin.update({ where: { id }, data });

    return {
      message: 'Admin updated successfully',
      data: omit(admin, ['password']),
    };
  }

  async remove(id: string) {
    const exists = await this.prisma.admin.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Admin not found');
    }

    const deletedAdmin = await this.prisma.admin.delete({ where: { id } });

    return {
      message: 'Admin deleted successfully',
      data: omit(deletedAdmin, ['password']),
    };
  }

  async createBulk(admins: CreateAdminDto[]) {
    const createdAdmins: Admin[] = [];

    for (const admin of admins) {
      const exists = await this.prisma.admin.findUnique({
        where: { email: admin.email },
        select: { id: true },
      });

      if (exists) {
        continue;
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(admin.password, salt);

      const { confirmPassword, ...rest } = admin;

      const newAdmin = await this.prisma.admin.create({
        data: {
          ...rest,
          dateOfBirth: new Date(rest.dateOfBirth),
          password: hashedPassword,
        },
      });

      createdAdmins.push(newAdmin);
    }

    return {
      message: `${createdAdmins.length} admins created successfully`,
      total: createdAdmins.length,
      data: createdAdmins.map((admin) => omit(admin, ['password'])),
    };
  }

  private async assertEmailAvailableAcrossAccounts(email: string, ownAdminId?: string) {
    const prisma = this.prisma as unknown as {
      student?: { findUnique: (args: unknown) => Promise<{ id: string } | null> };
      teacher?: { findUnique: (args: unknown) => Promise<{ id: string } | null> };
    };
    const [student, teacher] = await Promise.all([
      prisma.student?.findUnique({ where: { email } }) ?? Promise.resolve(null),
      prisma.teacher?.findUnique({ where: { email } }) ?? Promise.resolve(null),
    ]);
    if (student || teacher) throw new ConflictException('An account with this email already exists.');
    if (ownAdminId) {
      const otherAdmin = await (this.prisma.admin.findFirst
        ? this.prisma.admin.findFirst({ where: { email, id: { not: ownAdminId } }, select: { id: true } })
        : Promise.resolve(null));
      if (otherAdmin) throw new ConflictException('An account with this email already exists.');
    }
  }
}
