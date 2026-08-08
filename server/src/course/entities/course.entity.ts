import { TeacherEntity } from '../../teacher/entities/teacher.entity';
import { StudentEntity } from '../../student/entities/student.entity';

export class Course {
  id!: string;

  name!: string;

  code!: string;

  description?: string;

  department!: string;

  semester!: number;

  credits!: number;

  isActive!: boolean;

  teacher!: TeacherEntity;

  students!: StudentEntity[];

  createdAt!: Date;

  updatedAt!: Date;
}
