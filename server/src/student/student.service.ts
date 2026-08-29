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
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import type { Student } from '@prisma/client';
import { Role } from '../auth/enums/role.enum';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

type SafeStudent = Omit<Student, 'password'>;

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

    await this.assertEmailAvailableAcrossAccounts(createStudentDto.email);

    this.assertPasswordsMatch(
      createStudentDto.password,
      createStudentDto.confirmPassword,
    );

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createStudentDto.password, salt);

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

  async findAll() {
    const students = await this.prisma.student.findMany();

    return {
      total: students.length,
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
      await this.assertEmailAvailableAcrossAccounts(updateStudentDto.email, id);
    }

    const { confirmPassword, password, ...rest } = updateStudentDto;

    const data: Parameters<typeof this.prisma.student.update>[0]['data'] = {
      ...rest,
    };

    if (rest.dateOfBirth) {
      data.dateOfBirth = new Date(rest.dateOfBirth);
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(password, salt);
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

      this.assertPasswordsMatch(student.password, student.confirmPassword);

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(student.password, salt);

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

  private async assertEmailAvailableAcrossAccounts(
    email: string,
    ownStudentId?: string,
  ) {
    const prisma = this.prisma as unknown as {
      teacher?: {
        findUnique: (args: unknown) => Promise<{ id: string } | null>;
      };
      admin?: { findUnique: (args: unknown) => Promise<{ id: string } | null> };
    };
    const [teacher, admin] = await Promise.all([
      prisma.teacher?.findUnique({ where: { email } }) ?? Promise.resolve(null),
      prisma.admin?.findUnique({ where: { email } }) ?? Promise.resolve(null),
    ]);
    if (teacher || admin) {
      throw new ConflictException('An account with this email already exists.');
    }
    if (ownStudentId) {
      const otherStudent = await this.prisma.student.findFirst({
        where: { email, id: { not: ownStudentId } },
        select: { id: true },
      });
      if (otherStudent) {
        throw new ConflictException(
          'An account with this email already exists.',
        );
      }
    }
  }
}
