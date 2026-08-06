import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { Attendance, AttendanceStatus } from './entities/attendance.entity';
import { CourseService } from '../course/course.service';
import { StudentService } from '../student/student.service';

@Injectable()
export class AttendanceService {
  private attendance: Attendance[] = [];

  constructor(
    private readonly courseService: CourseService,
    private readonly studentService: StudentService,
  ) {}

  private validateReferences(
    studentId: string,
    courseId: string,
    skipStudentId?: string,
  ) {
    this.courseService.findOne(courseId);

    if (studentId !== skipStudentId) {
      this.studentService.findOne(studentId);
    }
  }

  private assertNoDuplicate(
    studentId: string,
    courseId: string,
    date: Date,
    excludeId?: string,
  ) {
    const exists = this.attendance.some(
      (record) =>
        record.id !== excludeId &&
        record.studentId === studentId &&
        record.courseId === courseId &&
        record.date.toDateString() === date.toDateString(),
    );

    if (exists) {
      throw new ConflictException(
        'Attendance record already exists for this student, course and date',
      );
    }
  }

  create(createAttendanceDto: CreateAttendanceDto) {
    this.validateReferences(
      createAttendanceDto.studentId,
      createAttendanceDto.courseId,
    );

    const date = new Date(createAttendanceDto.date);

    this.assertNoDuplicate(
      createAttendanceDto.studentId,
      createAttendanceDto.courseId,
      date,
    );

    const record: Attendance = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 8),
      ...createAttendanceDto,
      date,
      status: createAttendanceDto.status ?? AttendanceStatus.PRESENT,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.attendance.push(record);

    return {
      message: 'Attendance marked successfully',
      data: record,
    };
  }

  createBulk(records: CreateAttendanceDto[]) {
    const createdRecords: Attendance[] = [];

    for (const createAttendanceDto of records) {
      this.validateReferences(
        createAttendanceDto.studentId,
        createAttendanceDto.courseId,
      );

      const date = new Date(createAttendanceDto.date);

      this.assertNoDuplicate(
        createAttendanceDto.studentId,
        createAttendanceDto.courseId,
        date,
      );

      const record: Attendance = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 8),
        ...createAttendanceDto,
        date,
        status: createAttendanceDto.status ?? AttendanceStatus.PRESENT,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.attendance.push(record);
      createdRecords.push(record);
    }

    return {
      message: `${createdRecords.length} attendance records created successfully`,
      total: createdRecords.length,
      data: createdRecords,
    };
  }

  findAll() {
    return {
      total: this.attendance.length,
      data: this.attendance,
    };
  }

  findOne(id: string) {
    const record = this.attendance.find((record) => record.id === id);

    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }

    return record;
  }

  update(id: string, updateAttendanceDto: UpdateAttendanceDto) {
    const index = this.attendance.findIndex((record) => record.id === id);

    if (index === -1) {
      throw new NotFoundException('Attendance record not found');
    }

    const studentId =
      updateAttendanceDto.studentId ?? this.attendance[index].studentId;
    const courseId =
      updateAttendanceDto.courseId ?? this.attendance[index].courseId;

    this.validateReferences(
      studentId,
      courseId,
      this.attendance[index].studentId,
    );

    const date = updateAttendanceDto.date
      ? new Date(updateAttendanceDto.date)
      : this.attendance[index].date;

    this.assertNoDuplicate(studentId, courseId, date, id);

    this.attendance[index] = {
      ...this.attendance[index],
      ...updateAttendanceDto,
      date,
      updatedAt: new Date(),
    };

    return {
      message: 'Attendance updated successfully',
      data: this.attendance[index],
    };
  }

  remove(id: string) {
    const index = this.attendance.findIndex((record) => record.id === id);

    if (index === -1) {
      throw new NotFoundException('Attendance record not found');
    }

    const deletedRecord = this.attendance.splice(index, 1)[0];

    return {
      message: 'Attendance record deleted successfully',
      data: deletedRecord,
    };
  }

  // Find attendance records by course
  findByCourse(courseId: string) {
    this.courseService.findOne(courseId);

    const records = this.attendance.filter(
      (record) => record.courseId === courseId,
    );

    return {
      total: records.length,
      data: records,
    };
  }

  // Find attendance records by student
  findByStudent(studentId: string) {
    const records = this.attendance.filter(
      (record) => record.studentId === studentId,
    );

    return {
      total: records.length,
      data: records,
    };
  }

  // Find attendance records by date
  findByDate(date: string) {
    const target = new Date(date);

    const records = this.attendance.filter(
      (record) => record.date.toDateString() === target.toDateString(),
    );

    return {
      total: records.length,
      data: records,
    };
  }

  // Find attendance records by course and date
  findByCourseAndDate(courseId: string, date: string) {
    this.courseService.findOne(courseId);

    const target = new Date(date);

    const records = this.attendance.filter(
      (record) =>
        record.courseId === courseId &&
        record.date.toDateString() === target.toDateString(),
    );

    return {
      total: records.length,
      data: records,
    };
  }
}
