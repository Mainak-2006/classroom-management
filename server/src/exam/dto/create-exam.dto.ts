import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ExamStatus } from '../entities/exam.entity';

export class CreateExamDto {
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
  examDate!: string;

  @IsInt()
  @Min(1)
  duration!: number;

  @IsInt()
  @Min(1)
  totalMarks!: number;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsEnum(ExamStatus)
  status?: ExamStatus;

  @IsOptional()
  isActive?: boolean;
}
