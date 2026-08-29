import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import type { Teacher } from '@prisma/client';
import { Role } from '../auth/enums/role.enum';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

type SafeTeacher = Omit<Teacher, 'password'>;

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
export class TeacherService {
  constructor(private readonly prisma: PrismaService) {}

  async validateTeacher(
    email: string,
    password: string,
  ): Promise<SafeTeacher | null> {
    const teacher = await this.prisma.teacher.findUnique({ where: { email } });

    if (!teacher) {
      return null;
    }

    const isValid = await bcrypt.compare(password, teacher.password);

    if (!isValid) {
      return null;
    }

    if (!teacher.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    return omit(teacher, ['password']);
  }

  async create(createTeacherDto: CreateTeacherDto) {
    const exists = await this.prisma.teacher.findFirst({
      where: {
        OR: [
          { email: createTeacherDto.email },
          { employeeId: createTeacherDto.employeeId },
        ],
      },
      select: { id: true },
    });

    if (exists) {
      throw new ConflictException(
        'Teacher with this email or employee ID already exists.',
      );
    }

    await this.assertEmailAvailableAcrossAccounts(createTeacherDto.email);

    this.assertPasswordsMatch(
      createTeacherDto.password,
      createTeacherDto.confirmPassword,
    );

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createTeacherDto.password, salt);

    const { confirmPassword, ...rest } = createTeacherDto;

    const teacher = await this.prisma.teacher.create({
      data: {
        ...rest,
        dateOfBirth: new Date(rest.dateOfBirth),
        password: hashedPassword,
      },
    });

    return {
      message: 'Teacher created successfully',
      data: omit(teacher, ['password']),
    };
  }

  async findAll() {
    const teachers = await this.prisma.teacher.findMany();

    return {
      total: teachers.length,
      data: teachers.map((teacher) => omit(teacher, ['password'])),
    };
  }

  async findOne(id: string) {
    const teacher = await this.prisma.teacher.findUnique({ where: { id } });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return omit(teacher, ['password']);
  }

  async findOneForRequester(id: string, requester: AuthenticatedUser) {
    if (
      requester.role === Role.ADMIN ||
      (requester.role === Role.TEACHER && requester.id === id)
    ) {
      return this.findOne(id);
    }
    throw new ForbiddenException('You are not allowed to view this teacher');
  }

  async update(
    id: string,
    updateTeacherDto: UpdateTeacherDto,
    requester?: AuthenticatedUser,
  ) {
    this.assertCanManage(id, requester, false);
    const exists = await this.prisma.teacher.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Teacher not found');
    }

    if (updateTeacherDto.email) {
      await this.assertEmailAvailableAcrossAccounts(updateTeacherDto.email, id);
    }

    const { confirmPassword, password, ...rest } = updateTeacherDto;

    const data: Parameters<typeof this.prisma.teacher.update>[0]['data'] = {
      ...rest,
    };

    if (rest.dateOfBirth) {
      data.dateOfBirth = new Date(rest.dateOfBirth);
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(password, salt);
    }

    const teacher = await this.prisma.teacher.update({ where: { id }, data });

    return {
      message: 'Teacher updated successfully',
      data: omit(teacher, ['password']),
    };
  }

  async remove(id: string, requester?: AuthenticatedUser) {
    this.assertCanManage(id, requester, true);
    const exists = await this.prisma.teacher.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Teacher not found');
    }

    const deletedTeacher = await this.prisma.teacher.delete({ where: { id } });

    return {
      message: 'Teacher deleted successfully',
      data: omit(deletedTeacher, ['password']),
    };
  }

  async createBulk(teachers: CreateTeacherDto[]) {
    const createdTeachers: Teacher[] = [];

    for (const teacher of teachers) {
      const exists = await this.prisma.teacher.findFirst({
        where: {
          OR: [{ email: teacher.email }, { employeeId: teacher.employeeId }],
        },
        select: { id: true },
      });

      if (exists) {
        continue;
      }

      this.assertPasswordsMatch(teacher.password, teacher.confirmPassword);

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(teacher.password, salt);

      const { confirmPassword, ...rest } = teacher;

      const newTeacher = await this.prisma.teacher.create({
        data: {
          ...rest,
          dateOfBirth: new Date(rest.dateOfBirth),
          password: hashedPassword,
        },
      });

      createdTeachers.push(newTeacher);
    }

    return {
      message: `${createdTeachers.length} teachers created successfully`,
      total: createdTeachers.length,
      data: createdTeachers.map((teacher) => omit(teacher, ['password'])),
    };
  }

  private assertPasswordsMatch(password: string, confirmPassword?: string) {
    if (confirmPassword !== undefined && confirmPassword !== password) {
      throw new BadRequestException('Passwords do not match');
    }
  }

  private assertCanManage(
    id: string,
    requester: AuthenticatedUser | undefined,
    deleting: boolean,
  ) {
    if (!requester || requester.role === Role.ADMIN) return;
    if (!deleting && requester.role === Role.TEACHER && requester.id === id)
      return;
    throw new ForbiddenException(
      deleting
        ? 'Only administrators can delete teacher accounts'
        : 'You can only update your own teacher profile',
    );
  }

  private async assertEmailAvailableAcrossAccounts(
    email: string,
    ownTeacherId?: string,
  ) {
    const prisma = this.prisma as unknown as {
      student?: {
        findUnique: (args: unknown) => Promise<{ id: string } | null>;
      };
      admin?: { findUnique: (args: unknown) => Promise<{ id: string } | null> };
    };
    const [student, admin] = await Promise.all([
      prisma.student?.findUnique({ where: { email } }) ?? Promise.resolve(null),
      prisma.admin?.findUnique({ where: { email } }) ?? Promise.resolve(null),
    ]);
    if (student || admin) {
      throw new ConflictException('An account with this email already exists.');
    }
    if (ownTeacherId) {
      const otherTeacher = await this.prisma.teacher.findFirst({
        where: { email, id: { not: ownTeacherId } },
        select: { id: true },
      });
      if (otherTeacher) {
        throw new ConflictException(
          'An account with this email already exists.',
        );
      }
    }
  }
}
