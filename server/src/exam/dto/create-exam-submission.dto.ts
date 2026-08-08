import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateExamSubmissionDto {
  @IsNotEmpty()
  @IsString()
  studentId!: string;

  @IsInt()
  @Min(0)
  score!: number;

  @IsOptional()
  @IsDateString()
  submittedAt?: string;
}
