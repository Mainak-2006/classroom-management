import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import type { Attendance, Prisma } from '@prisma/client';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { CourseService } from '../course/course.service';
import { StudentService } from '../student/student.service';
import { Role } from '../auth/enums/role.enum';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

function dayRange(date: Date) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}

function normalizeDate(date: Date) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  return start;
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
    client: Pick<Prisma.TransactionClient, 'attendance'>,
    studentId: string,
    courseId: string,
    date: Date,
    excludeId?: string,
  ) {
    const { start, end } = dayRange(date);

    const exists = await client.attendance.findFirst({
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

  async create(
    createAttendanceDto: CreateAttendanceDto,
    requester?: AuthenticatedUser,
  ) {
    if (requester) {
      await this.courseService.assertTeacherOwnsCourse(
        requester,
        createAttendanceDto.courseId,
      );
    }
    await this.validateReferences(
      createAttendanceDto.studentId,
      createAttendanceDto.courseId,
    );
    await this.courseService.assertStudentEnrolled(
      createAttendanceDto.courseId,
      createAttendanceDto.studentId,
    );

    const date = normalizeDate(new Date(createAttendanceDto.date));

    const record = await this.prisma.$transaction(async (tx) => {
      await this.assertNoDuplicate(
        tx,
        createAttendanceDto.studentId,
        createAttendanceDto.courseId,
        date,
      );

      return tx.attendance.create({
        data: {
          studentId: createAttendanceDto.studentId,
          courseId: createAttendanceDto.courseId,
          date,
          status: createAttendanceDto.status ?? 'PRESENT',
          notes: createAttendanceDto.notes,
        },
      });
    });

    return {
      message: 'Attendance marked successfully',
      data: record,
    };
  }

  async createBulk(
    records: CreateAttendanceDto[],
    requester?: AuthenticatedUser,
  ) {
    const createdRecords: Attendance[] = [];

    for (const createAttendanceDto of records) {
      if (requester) {
        await this.courseService.assertTeacherOwnsCourse(
          requester,
          createAttendanceDto.courseId,
        );
      }
      await this.validateReferences(
        createAttendanceDto.studentId,
        createAttendanceDto.courseId,
      );
      await this.courseService.assertStudentEnrolled(
        createAttendanceDto.courseId,
        createAttendanceDto.studentId,
      );

      const date = normalizeDate(new Date(createAttendanceDto.date));

      const record = await this.prisma.$transaction(async (tx) => {
        await this.assertNoDuplicate(
          tx,
          createAttendanceDto.studentId,
          createAttendanceDto.courseId,
          date,
        );

        return tx.attendance.create({
          data: {
            studentId: createAttendanceDto.studentId,
            courseId: createAttendanceDto.courseId,
            date,
            status: createAttendanceDto.status ?? 'PRESENT',
            notes: createAttendanceDto.notes,
          },
        });
      });

      createdRecords.push(record);
    }

    return {
      message: `${createdRecords.length} attendance records created successfully`,
      total: createdRecords.length,
      data: createdRecords,
    };
  }

  async findAll(requester?: AuthenticatedUser) {
    if (requester && requester.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can view all attendance',
      );
    }
    const records = await this.prisma.attendance.findMany();

    return {
      total: records.length,
      data: records,
    };
  }

  async findOne(id: string, requester?: AuthenticatedUser) {
    const record = await this.prisma.attendance.findUnique({ where: { id } });

    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }

    if (requester?.role === Role.STUDENT) {
      if (record.studentId !== requester.id) {
        throw new ForbiddenException('You can only view your own attendance');
      }
    } else if (requester?.role === Role.TEACHER) {
      await this.courseService.assertTeacherOwnsCourse(
        requester,
        record.courseId,
      );
    }

    return record;
  }

  async update(
    id: string,
    updateAttendanceDto: UpdateAttendanceDto,
    requester?: AuthenticatedUser,
  ) {
    const existing = await this.prisma.attendance.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Attendance record not found');
    }

    if (requester)
      await this.courseService.assertTeacherOwnsCourse(
        requester,
        existing.courseId,
      );

    const studentId = updateAttendanceDto.studentId ?? existing.studentId;
    const courseId = updateAttendanceDto.courseId ?? existing.courseId;

    await this.validateReferences(studentId, courseId, existing.studentId);
    await this.courseService.assertStudentEnrolled(courseId, studentId);
    if (requester && courseId !== existing.courseId) {
      await this.courseService.assertTeacherOwnsCourse(requester, courseId);
    }

    const date = updateAttendanceDto.date
      ? normalizeDate(new Date(updateAttendanceDto.date))
      : existing.date;

    const record = await this.prisma.$transaction(async (tx) => {
      await this.assertNoDuplicate(tx, studentId, courseId, date, id);

      return tx.attendance.update({
        where: { id },
        data: {
          studentId: updateAttendanceDto.studentId,
          courseId: updateAttendanceDto.courseId,
          date,
          status: updateAttendanceDto.status,
          notes: updateAttendanceDto.notes,
        },
      });
    });

    return {
      message: 'Attendance updated successfully',
      data: record,
    };
  }

  async remove(id: string, requester?: AuthenticatedUser) {
    const existing = await this.prisma.attendance.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Attendance record not found');
    }
    if (requester)
      await this.courseService.assertTeacherOwnsCourse(
        requester,
        existing.courseId,
      );

    const deletedRecord = await this.prisma.attendance.delete({
      where: { id },
    });

    return {
      message: 'Attendance record deleted successfully',
      data: deletedRecord,
    };
  }

  // Find attendance records by course
  async findByCourse(courseId: string, requester?: AuthenticatedUser) {
    if (requester)
      await this.courseService.assertCanViewCourse(requester, courseId);
    else await this.courseService.findOne(courseId);

    const records = await this.prisma.attendance.findMany({
      where:
        requester?.role === Role.STUDENT
          ? { courseId, studentId: requester.id }
          : { courseId },
    });

    return {
      total: records.length,
      data: records,
    };
  }

  // Find attendance records by student
  async findByStudent(studentId: string, requester?: AuthenticatedUser) {
    if (
      requester &&
      requester.id !== studentId &&
      requester.role !== Role.ADMIN
    ) {
      throw new ForbiddenException('You can only view your own attendance');
    }
    const records = await this.prisma.attendance.findMany({
      where: { studentId },
    });

    return {
      total: records.length,
      data: records,
    };
  }

  // Find attendance records by date
  async findByDate(date: string, requester?: AuthenticatedUser) {
    if (requester && requester.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can search attendance by date',
      );
    }
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
  async findByCourseAndDate(
    courseId: string,
    date: string,
    requester?: AuthenticatedUser,
  ) {
    if (requester)
      await this.courseService.assertCanViewCourse(requester, courseId);
    else await this.courseService.findOne(courseId);

    const { start, end } = dayRange(new Date(date));

    const records = await this.prisma.attendance.findMany({
      where:
        requester?.role === Role.STUDENT
          ? { courseId, studentId: requester.id, date: { gte: start, lt: end } }
          : { courseId, date: { gte: start, lt: end } },
    });

    return {
      total: records.length,
      data: records,
    };
  }
}
