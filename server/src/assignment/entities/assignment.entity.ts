import { AssignmentStatus } from '@prisma/client';

export { AssignmentStatus };

export class Assignment {
  id!: string;

  title!: string;

  description?: string;

  courseId!: string;

  dueDate!: Date;

  totalMarks!: number;

  instructions?: string;

  status!: AssignmentStatus;

  isActive!: boolean;

  createdAt!: Date;

  updatedAt!: Date;
}
