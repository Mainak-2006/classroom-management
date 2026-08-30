import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import type { Admin } from '@prisma/client';
import { omit } from '../common/omit';
import { assertPasswordsMatch, hashPassword } from '../common/passwords';
import { assertEmailAvailableAcrossAccounts } from '../common/email';
import {
  buildPagination,
  parsePagination,
  type PaginationQuery,
} from '../common/pagination';

type SafeAdmin = Omit<Admin, 'password'>;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async validateAdmin(
    email: string,
    password: string,
  ): Promise<SafeAdmin | null> {
    const admin = await this.prisma.admin.findUnique({ where: { email } });

    if (!admin) {
      return null;
    }

    const isValid = await bcrypt.compare(password, admin.password);

    if (!isValid) {
      return null;
    }

    if (!admin.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    return omit(admin, ['password']);
  }

  async create(createAdminDto: CreateAdminDto) {
    const exists = await this.prisma.admin.findUnique({
      where: { email: createAdminDto.email },
      select: { id: true },
    });

    if (exists) {
      throw new ConflictException('Admin with this email already exists.');
    }

    await assertEmailAvailableAcrossAccounts(
      this.prisma,
      createAdminDto.email,
      'admin',
    );

    assertPasswordsMatch(
      createAdminDto.password,
      createAdminDto.confirmPassword,
    );

    const hashedPassword = await hashPassword(createAdminDto.password);

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

  async findAll(query: PaginationQuery = {}) {
    const { skip, take } = parsePagination(query);
    const [admins, total] = await Promise.all([
      this.prisma.admin.findMany({ skip, take }),
      this.prisma.admin.count(),
    ]);

    return {
      total,
      ...buildPagination(total, query),
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
      await assertEmailAvailableAcrossAccounts(
        this.prisma,
        updateAdminDto.email,
        'admin',
        id,
      );
    }

    const { confirmPassword, password, ...rest } = updateAdminDto;

    const data: Parameters<typeof this.prisma.admin.update>[0]['data'] = {
      ...rest,
    };

    if (rest.dateOfBirth) {
      data.dateOfBirth = new Date(rest.dateOfBirth);
    }

    if (password) {
      data.password = await hashPassword(password);
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

      await assertEmailAvailableAcrossAccounts(
        this.prisma,
        admin.email,
        'admin',
      );
      assertPasswordsMatch(admin.password, admin.confirmPassword);

      const hashedPassword = await hashPassword(admin.password);

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
}
