export class AdminEntity {
  id!: string;

  firstName!: string;

  middleName?: string;

  lastName!: string;

  email!: string;

  phone!: string;

  dateOfBirth!: Date;

  gender!: string;

  department!: string;

  role!: string;

  profileImage?: string;

  isActive!: boolean;

  password!: string; // hashed password

  createdAt!: Date;

  updatedAt!: Date;
}
