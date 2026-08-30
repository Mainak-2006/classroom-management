import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';

import { CreateCourseDto } from './create-course.dto';

export class CreateCourseManyDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateCourseDto)
  items!: CreateCourseDto[];
}
