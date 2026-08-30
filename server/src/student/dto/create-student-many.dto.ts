import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';

import { CreateStudentDto } from './create-student.dto';

export class CreateStudentManyDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateStudentDto)
  items!: CreateStudentDto[];
}
