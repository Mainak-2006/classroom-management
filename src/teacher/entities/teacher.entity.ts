import { Course } from '../../course/entities/course.entity';

export class TeacherEntity {
  id!: string;

  firstName!: string;

  middleName?: string;

  lastName!: string;

  email!: string;

  phone!: string;

  dateOfBirth!: Date;

  gender!: string;

  employeeId!: string;

  department!: string;

  designation!: string;

  qualification!: string;

  specialization?: string;

  officeRoom?: string;

  profileImage?: string;

  isActive!: boolean;

  courses!: Course[];

  password!: string; // hashed password

  createdAt!: Date;

  updatedAt!: Date;
}
