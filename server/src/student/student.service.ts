import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import type { Student } from '@prisma/client';
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

type SafeStudent = Omit<Student, 'password'>;

@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createStudentDto: CreateStudentDto) {
    const exists = await this.prisma.student.findFirst({
      where: {
        OR: [
          { email: createStudentDto.email },
          { rollNumber: createStudentDto.rollNumber },
        ],
      },
      select: { id: true },
    });

    if (exists) {
      throw new ConflictException(
        'Student with this email or roll number already exists.',
      );
    }

    await assertEmailAvailableAcrossAccounts(
      this.prisma,
      createStudentDto.email,
      'student',
    );

    assertPasswordsMatch(
      createStudentDto.password,
      createStudentDto.confirmPassword,
    );

    const hashedPassword = await hashPassword(createStudentDto.password);

    const { confirmPassword, ...rest } = createStudentDto;

    const student = await this.prisma.student.create({
      data: {
        ...rest,
        dateOfBirth: new Date(rest.dateOfBirth),
        password: hashedPassword,
      },
    });

    return {
      message: 'Student created successfully',
      data: omit(student, ['password']),
    };
  }

  async findAll(query: PaginationQuery = {}) {
    const { skip, take } = parsePagination(query);
    const [students, total] = await Promise.all([
      this.prisma.student.findMany({ skip, take }),
      this.prisma.student.count(),
    ]);

    return {
      total,
      ...buildPagination(total, query),
      data: students.map((student) => omit(student, ['password'])),
    };
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({ where: { id } });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return omit(student, ['password']);
  }

  async findOneForRequester(id: string, requester: AuthenticatedUser) {
    if (
      requester.role === Role.ADMIN ||
      (requester.role === Role.STUDENT && requester.id === id)
    ) {
      return this.findOne(id);
    }
    if (requester.role === Role.TEACHER) {
      const enrolledInOwnCourse = await this.prisma.course.findFirst({
        where: { teacherId: requester.id, students: { some: { id } } },
        select: { id: true },
      });
      if (enrolledInOwnCourse) return this.findOne(id);
    }
    throw new ForbiddenException('You are not allowed to view this student');
  }

  async findEnrollable(query: PaginationQuery = {}) {
    const { skip, take } = parsePagination(query);
    const where = { isActive: true };
    const [students, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip,
        take,
        orderBy: { rollNumber: 'asc' },
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      total,
      ...buildPagination(total, query),
      data: students.map((student) => omit(student, ['password'])),
    };
  }

  async validateStudent(
    email: string,
    password: string,
  ): Promise<SafeStudent | null> {
    const student = await this.prisma.student.findUnique({ where: { email } });

    if (!student) {
      return null;
    }

    const isValid = await bcrypt.compare(password, student.password);

    if (!isValid) {
      return null;
    }

    if (!student.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    return omit(student, ['password']);
  }

  async update(
    id: string,
    updateStudentDto: UpdateStudentDto,
    requester?: AuthenticatedUser,
  ) {
    this.assertCanManage(id, requester, false);
    const exists = await this.prisma.student.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Student not found');
    }

    if (updateStudentDto.email) {
      await assertEmailAvailableAcrossAccounts(
        this.prisma,
        updateStudentDto.email,
        'student',
        id,
      );
    }

    const { confirmPassword, password, ...rest } = updateStudentDto;

    const data: Parameters<typeof this.prisma.student.update>[0]['data'] = {
      ...rest,
    };

    if (rest.dateOfBirth) {
      data.dateOfBirth = new Date(rest.dateOfBirth);
    }

    if (password) {
      data.password = await hashPassword(password);
    }

    const student = await this.prisma.student.update({ where: { id }, data });

    return {
      message: 'Student updated successfully',
      data: omit(student, ['password']),
    };
  }

  async remove(id: string, requester?: AuthenticatedUser) {
    this.assertCanManage(id, requester, true);
    const exists = await this.prisma.student.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Student not found');
    }

    const deletedStudent = await this.prisma.student.delete({ where: { id } });

    return {
      message: 'Student deleted successfully',
      data: omit(deletedStudent, ['password']),
    };
  }

  async createBulk(students: CreateStudentDto[]) {
    const createdStudents: Student[] = [];

    for (const student of students) {
      const exists = await this.prisma.student.findFirst({
        where: {
          OR: [{ email: student.email }, { rollNumber: student.rollNumber }],
        },
        select: { id: true },
      });

      if (exists) {
        continue;
      }

      await assertEmailAvailableAcrossAccounts(
        this.prisma,
        student.email,
        'student',
      );
      assertPasswordsMatch(student.password, student.confirmPassword);

      const hashedPassword = await hashPassword(student.password);

      const { confirmPassword, ...rest } = student;

      const newStudent = await this.prisma.student.create({
        data: {
          ...rest,
          dateOfBirth: new Date(rest.dateOfBirth),
          password: hashedPassword,
        },
      });

      createdStudents.push(newStudent);
    }

    return {
      message: `${createdStudents.length} students created successfully`,
      total: createdStudents.length,
      data: createdStudents.map((student) => omit(student, ['password'])),
    };
  }

  private assertCanManage(
    id: string,
    requester: AuthenticatedUser | undefined,
    deleting: boolean,
  ) {
    if (!requester) return;
    if (requester.role === Role.ADMIN) return;
    if (!deleting && requester.role === Role.STUDENT && requester.id === id)
      return;
    throw new ForbiddenException(
      deleting
        ? 'Only administrators can delete student accounts'
        : 'You can only update your own student profile',
    );
  }
}
