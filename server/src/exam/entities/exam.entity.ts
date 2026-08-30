import { ExamStatus } from '@prisma/client';

export { ExamStatus };

export class Exam {
  id!: string;

  title!: string;

  description?: string;

  courseId!: string;

  examDate!: Date;

  duration!: number;

  totalMarks!: number;

  instructions?: string;

  status!: ExamStatus;

  isActive!: boolean;

  createdAt!: Date;

  updatedAt!: Date;
}
