export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
}

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
