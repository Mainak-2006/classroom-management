import { Course } from '../../course/entities/course.entity';

export class StudentEntity {
  id!: string;

  firstName!: string;

  middleName?: string;

  lastName!: string;

  email!: string;

  phone!: string;

  dateOfBirth!: Date;

  gender!: string;

  rollNumber!: string;

  registrationNumber!: string;

  department!: string;

  semester!: number;

  section?: string;

  address?: string;

  profileImage?: string;

  guardianName?: string;

  guardianPhone?: string;

  courses!: Course[];

  isActive!: boolean;

  password!: string; // hashed password

  createdAt!: Date;

  updatedAt!: Date;
}
