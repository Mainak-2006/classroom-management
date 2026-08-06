import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentService {
  private student: any[] = [];

  async create(createStudentDto: CreateStudentDto) {
    const exists = this.student.find(
      (student) =>
        student.email === createStudentDto.email ||
        student.rollNumber === createStudentDto.rollNumber,
    );

    if (exists) {
      throw new ConflictException(
        'Student with this email or roll number already exists.',
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createStudentDto.password, salt);

    const student = {
      id: Date.now().toString(),
      ...createStudentDto,
      password: hashedPassword,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.student.push(student);

    // Remove password and confirmPassword from response
    const { password, confirmPassword, ...result } = student;
    return {
      message: 'Student created successfully',
      data: result,
    };
  }

  findAll() {
    return {
      total: this.student.length,
      data: this.student.map(({ password, confirmPassword, ...rest }) => rest),
    };
  }

  findOne(id: string) {
    const student = this.student.find((student) => student.id === id);

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const { password, confirmPassword, ...result } = student;
    return result;
  }

  async validateStudent(email: string, password: string): Promise<any> {
    const student = this.student.find((student) => student.email === email);
    if (!student) {
      return null;
    }

    const isValid = await bcrypt.compare(password, student.password);
    if (isValid) {
      const { password, confirmPassword, ...result } = student;
      return result;
    }
    return null;
  }

  async update(id: string, updateStudentDto: UpdateStudentDto) {
    const index = this.student.findIndex((student) => student.id === id);

    if (index === -1) {
      throw new NotFoundException('Student not found');
    }

    // If password is being updated, hash it
    if (updateStudentDto.password) {
      const salt = await bcrypt.genSalt(10);
      updateStudentDto.password = await bcrypt.hash(
        updateStudentDto.password,
        salt,
      );
    }

    this.student[index] = {
      ...this.student[index],
      ...updateStudentDto,
      updatedAt: new Date(),
    };

    const { password, confirmPassword, ...result } = this.student[index];
    return {
      message: 'Student updated successfully',
      data: result,
    };
  }

  remove(id: string) {
    const index = this.student.findIndex((student) => student.id === id);

    if (index === -1) {
      throw new NotFoundException('Student not found');
    }

    const deletedStudent = this.student.splice(index, 1);

    const { password, confirmPassword, ...result } = deletedStudent[0];
    return {
      message: 'Student deleted successfully',
      data: result,
    };
  }

  async createBulk(students: CreateStudentDto[]) {
    const createdStudents: any[] = [];

    for (const student of students) {
      const exists = this.student.find(
        (s) => s.email === student.email || s.rollNumber === student.rollNumber,
      );

      if (exists) {
        continue;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(student.password, salt);

      // Generate a more unique ID using timestamp + random + index to ensure uniqueness even in fast loops
      const uniqueId =
        Date.now().toString() + Math.random().toString(36).substring(2, 11);

      const newStudent = {
        id: uniqueId,
        ...student,
        password: hashedPassword,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.student.push(newStudent);
      createdStudents.push(newStudent);
    }

    // Remove passwords and confirmPassword from response
    const sanitizedStudents = createdStudents.map(
      ({ password, confirmPassword, ...rest }) => rest,
    );

    return {
      message: `${sanitizedStudents.length} students created successfully`,
      total: sanitizedStudents.length,
      data: sanitizedStudents,
    };
  }
}
