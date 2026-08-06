import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';

@Injectable()
export class TeacherService {
  private teacher: any[] = [];

  async validateTeacher(email: string, password: string): Promise<any> {
    const teacher = this.teacher.find((t) => t.email === email);
    if (teacher && (await bcrypt.compare(password, teacher.password))) {
      const { password, confirmPassword, ...result } = teacher;
      return result;
    }
    return null;
  }

  async create(createTeacherDto: CreateTeacherDto) {
    const exists = this.teacher.find(
      (teacher) =>
        teacher.email === createTeacherDto.email ||
        teacher.employeeId === createTeacherDto.employeeId,
    );

    if (exists) {
      throw new ConflictException(
        'Teacher with this email or employee ID already exists.',
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createTeacherDto.password, salt);

    const teacher = {
      id: Date.now().toString(),
      ...createTeacherDto,
      password: hashedPassword,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.teacher.push(teacher);

    // Remove password and confirmPassword from response
    const { password, confirmPassword, ...result } = teacher;
    return {
      message: 'Teacher created successfully',
      data: result,
    };
  }

  findAll() {
    return {
      total: this.teacher.length,
      data: this.teacher.map(({ password, confirmPassword, ...rest }) => rest),
    };
  }

  findOne(id: string) {
    const teacher = this.teacher.find((teacher) => teacher.id === id);

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const { password, confirmPassword, ...result } = teacher;
    return result;
  }

  async update(id: string, updateTeacherDto: UpdateTeacherDto) {
    const index = this.teacher.findIndex((teacher) => teacher.id === id);

    if (index === -1) {
      throw new NotFoundException('Teacher not found');
    }

    // If password is being updated, hash it
    if (updateTeacherDto.password) {
      const salt = await bcrypt.genSalt(10);
      updateTeacherDto.password = await bcrypt.hash(
        updateTeacherDto.password,
        salt,
      );
    }

    this.teacher[index] = {
      ...this.teacher[index],
      ...updateTeacherDto,
      updatedAt: new Date(),
    };

    const { password, confirmPassword, ...result } = this.teacher[index];
    return {
      message: 'Teacher updated successfully',
      data: result,
    };
  }

  remove(id: string) {
    const index = this.teacher.findIndex((teacher) => teacher.id === id);

    if (index === -1) {
      throw new NotFoundException('Teacher not found');
    }

    const deletedTeacher = this.teacher.splice(index, 1);

    const { password, confirmPassword, ...result } = deletedTeacher[0];
    return {
      message: 'Teacher deleted successfully',
      data: result,
    };
  }

  async createBulk(teachers: CreateTeacherDto[]) {
    const createdTeachers: any[] = [];

    for (const teacher of teachers) {
      const exists = this.teacher.find(
        (t) => t.email === teacher.email || t.employeeId === teacher.employeeId,
      );

      if (exists) {
        continue;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(teacher.password, salt);

      // Generate a more unique ID using timestamp + random + index to ensure uniqueness even in fast loops
      const uniqueId =
        Date.now().toString() + Math.random().toString(36).substring(2, 11);

      const newTeacher = {
        id: uniqueId,
        ...teacher,
        password: hashedPassword,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.teacher.push(newTeacher);
      createdTeachers.push(newTeacher);
    }

    // Remove passwords and confirmPassword from response
    const sanitizedTeachers = createdTeachers.map(
      ({ password, confirmPassword, ...rest }) => rest,
    );

    return {
      message: `${sanitizedTeachers.length} teachers created successfully`,
      total: sanitizedTeachers.length,
      data: sanitizedTeachers,
    };
  }
}
