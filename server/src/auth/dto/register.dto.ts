import { Type } from 'class-transformer';
import { IsIn, ValidateIf, ValidateNested } from 'class-validator';

import { CreateStudentDto } from '../../student/dto/create-student.dto';
import { CreateTeacherDto } from '../../teacher/dto/create-teacher.dto';

export const REGISTER_ROLES = ['student', 'teacher'] as const;

export class RegisterDto {
  @IsIn(REGISTER_ROLES)
  role!: 'student' | 'teacher';

  @ValidateIf((o) => (o as RegisterDto).role === 'student')
  @ValidateNested()
  @Type(() => CreateStudentDto)
  student?: CreateStudentDto;

  @ValidateIf((o) => (o as RegisterDto).role === 'teacher')
  @ValidateNested()
  @Type(() => CreateTeacherDto)
  teacher?: CreateTeacherDto;
}
