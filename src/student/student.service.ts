import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import type { Student } from '@prisma/client';

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

  async validateStudent(
    email: string,
    password: string,
  ): Promise<SafeStudent | null> {
    const student = await this.prisma.student.findUnique({ where: { email } });

    if (!student) {
      return null;
    }

    const isValid = await bcrypt.compare(password, student.password);

    if (isValid) {
      return omit(student, ['password']);
    }

    return null;
  }

  async update(id: string, updateStudentDto: UpdateStudentDto) {
    const exists = await this.prisma.student.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Student not found');
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

  async remove(id: string) {
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
}
