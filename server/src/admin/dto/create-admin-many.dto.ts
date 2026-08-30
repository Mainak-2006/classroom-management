import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';

import { CreateAdminDto } from './create-admin.dto';

export class CreateAdminManyDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateAdminDto)
  items!: CreateAdminDto[];
}
