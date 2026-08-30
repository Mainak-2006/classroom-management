import { AttendanceStatus } from '@prisma/client';

export { AttendanceStatus };

export class Attendance {
  id!: string;

  studentId!: string;

  courseId!: string;

  date!: Date;

  status!: AttendanceStatus;

  notes?: string;

  createdAt!: Date;

  updatedAt!: Date;
}
