import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import type { Attendance } from '@prisma/client';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { CourseService } from '../course/course.service';
import { StudentService } from '../student/student.service';

function dayRange(date: Date) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courseService: CourseService,
    private readonly studentService: StudentService,
  ) {}

  private async validateReferences(
    studentId: string,
    courseId: string,
    skipStudentId?: string,
  ) {
    await this.courseService.findOne(courseId);

    if (studentId !== skipStudentId) {
      await this.studentService.findOne(studentId);
    }
  }

  private async assertNoDuplicate(
    studentId: string,
    courseId: string,
    date: Date,
    excludeId?: string,
  ) {
    const { start, end } = dayRange(date);

    const exists = await this.prisma.attendance.findFirst({
      where: {
        id: excludeId ? { not: excludeId } : undefined,
        studentId,
        courseId,
        date: { gte: start, lt: end },
      },
      select: { id: true },
    });

    if (exists) {
      throw new ConflictException(
        'Attendance record already exists for this student, course and date',
      );
    }
  }

  async create(createAttendanceDto: CreateAttendanceDto) {
    await this.validateReferences(
      createAttendanceDto.studentId,
      createAttendanceDto.courseId,
    );

    const date = new Date(createAttendanceDto.date);

    await this.assertNoDuplicate(
      createAttendanceDto.studentId,
      createAttendanceDto.courseId,
      date,
    );

    const record = await this.prisma.attendance.create({
      data: {
        studentId: createAttendanceDto.studentId,
        courseId: createAttendanceDto.courseId,
        date,
        status: createAttendanceDto.status ?? 'PRESENT',
        notes: createAttendanceDto.notes,
      },
    });

    return {
      message: 'Attendance marked successfully',
      data: record,
    };
  }

  async createBulk(records: CreateAttendanceDto[]) {
    const createdRecords: Attendance[] = [];

    for (const createAttendanceDto of records) {
      await this.validateReferences(
        createAttendanceDto.studentId,
        createAttendanceDto.courseId,
      );

      const date = new Date(createAttendanceDto.date);

      await this.assertNoDuplicate(
        createAttendanceDto.studentId,
        createAttendanceDto.courseId,
        date,
      );

      const record = await this.prisma.attendance.create({
        data: {
          studentId: createAttendanceDto.studentId,
          courseId: createAttendanceDto.courseId,
          date,
          status: createAttendanceDto.status ?? 'PRESENT',
          notes: createAttendanceDto.notes,
        },
      });

      createdRecords.push(record);
    }

    return {
      message: `${createdRecords.length} attendance records created successfully`,
      total: createdRecords.length,
      data: createdRecords,
    };
  }

  async findAll() {
    const records = await this.prisma.attendance.findMany();

    return {
      total: records.length,
      data: records,
    };
  }

  async findOne(id: string) {
    const record = await this.prisma.attendance.findUnique({ where: { id } });

    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }

    return record;
  }

  async update(id: string, updateAttendanceDto: UpdateAttendanceDto) {
    const existing = await this.prisma.attendance.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Attendance record not found');
    }

    const studentId = updateAttendanceDto.studentId ?? existing.studentId;
    const courseId = updateAttendanceDto.courseId ?? existing.courseId;

    await this.validateReferences(studentId, courseId, existing.studentId);

    const date = updateAttendanceDto.date
      ? new Date(updateAttendanceDto.date)
      : existing.date;

    await this.assertNoDuplicate(studentId, courseId, date, id);

    const record = await this.prisma.attendance.update({
      where: { id },
      data: {
        studentId: updateAttendanceDto.studentId,
        courseId: updateAttendanceDto.courseId,
        date,
        status: updateAttendanceDto.status,
        notes: updateAttendanceDto.notes,
      },
    });

    return {
      message: 'Attendance updated successfully',
      data: record,
    };
  }

  async remove(id: string) {
    const existing = await this.prisma.attendance.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Attendance record not found');
    }

    const deletedRecord = await this.prisma.attendance.delete({
      where: { id },
    });

    return {
      message: 'Attendance record deleted successfully',
      data: deletedRecord,
    };
  }

  // Find attendance records by course
  async findByCourse(courseId: string) {
    await this.courseService.findOne(courseId);

    const records = await this.prisma.attendance.findMany({
      where: { courseId },
    });

    return {
      total: records.length,
      data: records,
    };
  }

  // Find attendance records by student
  async findByStudent(studentId: string) {
    const records = await this.prisma.attendance.findMany({
      where: { studentId },
    });

    return {
      total: records.length,
      data: records,
    };
  }

  // Find attendance records by date
  async findByDate(date: string) {
    const { start, end } = dayRange(new Date(date));

    const records = await this.prisma.attendance.findMany({
      where: { date: { gte: start, lt: end } },
    });

    return {
      total: records.length,
      data: records,
    };
  }

  // Find attendance records by course and date
  async findByCourseAndDate(courseId: string, date: string) {
    await this.courseService.findOne(courseId);

    const { start, end } = dayRange(new Date(date));

    const records = await this.prisma.attendance.findMany({
      where: {
        courseId,
        date: { gte: start, lt: end },
      },
    });

    return {
      total: records.length,
      data: records,
    };
  }
}
