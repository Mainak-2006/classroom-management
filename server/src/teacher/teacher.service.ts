import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import type { Teacher } from '@prisma/client';
import { Role } from '../auth/enums/role.enum';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { omit } from '../common/omit';
import { assertPasswordsMatch, hashPassword } from '../common/passwords';
import { assertEmailAvailableAcrossAccounts } from '../common/email';
import {
  buildPagination,
  parsePagination,
  type PaginationQuery,
} from '../common/pagination';

type SafeTeacher = Omit<Teacher, 'password'>;

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

    await assertEmailAvailableAcrossAccounts(
      this.prisma,
      createTeacherDto.email,
      'teacher',
    );

    assertPasswordsMatch(
      createTeacherDto.password,
      createTeacherDto.confirmPassword,
    );

    const hashedPassword = await hashPassword(createTeacherDto.password);

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

  async findAll(query: PaginationQuery = {}) {
    const { skip, take } = parsePagination(query);
    const [teachers, total] = await Promise.all([
      this.prisma.teacher.findMany({ skip, take }),
      this.prisma.teacher.count(),
    ]);

    return {
      total,
      ...buildPagination(total, query),
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
      await assertEmailAvailableAcrossAccounts(
        this.prisma,
        updateTeacherDto.email,
        'teacher',
        id,
      );
    }

    const { confirmPassword, password, ...rest } = updateTeacherDto;

    const data: Parameters<typeof this.prisma.teacher.update>[0]['data'] = {
      ...rest,
    };

    if (rest.dateOfBirth) {
      data.dateOfBirth = new Date(rest.dateOfBirth);
    }

    if (password) {
      data.password = await hashPassword(password);
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

      await assertEmailAvailableAcrossAccounts(
        this.prisma,
        teacher.email,
        'teacher',
      );
      assertPasswordsMatch(teacher.password, teacher.confirmPassword);

      const hashedPassword = await hashPassword(teacher.password);

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
}
