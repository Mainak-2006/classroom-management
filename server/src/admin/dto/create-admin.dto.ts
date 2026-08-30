import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum AdminRole {
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export class CreateAdminDto {
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
  department!: string;

  @IsEnum(AdminRole)
  role!: AdminRole;

  @IsOptional()
  @IsUrl()
  profileImage?: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  confirmPassword!: string;
}
