import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';

import { CreateAttendanceDto } from './create-attendance.dto';

export class CreateBulkAttendanceDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateAttendanceDto)
  items!: CreateAttendanceDto[];
}
