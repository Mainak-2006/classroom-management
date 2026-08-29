import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GradeAssignmentSubmissionDto {
  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000000)
  score?: number;
}
