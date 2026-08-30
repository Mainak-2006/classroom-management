import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';

import { CreateTeacherDto } from './create-teacher.dto';

export class CreateTeacherManyDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateTeacherDto)
  items!: CreateTeacherDto[];
}
