import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { AssignmentStatus } from '../entities/assignment.entity';

export class CreateAssignmentDto {
  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsString()
  courseId!: string;

  @IsNotEmpty()
  @IsDateString()
  dueDate!: string;

  @IsInt()
  @Min(1)
  totalMarks!: number;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;

  @IsOptional()
  isActive?: boolean;
}
