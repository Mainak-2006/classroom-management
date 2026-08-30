import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUrl,
  Min,
  Max,
  MinLength,
} from 'class-validator';

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export class CreateStudentDto {
  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsNotEmpty()
  @IsString()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsPhoneNumber()
  phone!: string;

  @IsDateString()
  dateOfBirth!: string;

  @IsEnum(Gender)
  gender!: Gender;

  @IsNotEmpty()
  @IsString()
  rollNumber!: string;

  @IsNotEmpty()
  @IsString()
  registrationNumber!: string;

  @IsNotEmpty()
  @IsString()
  department!: string;

  @Min(1)
  @Max(8)
  semester!: number;

  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsUrl()
  profileImage?: string;

  @IsOptional()
  @IsString()
  guardianName?: string;

  @IsOptional()
  @IsPhoneNumber()
  guardianPhone?: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  confirmPassword!: string;
}
