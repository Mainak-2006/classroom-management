import { IsNotEmpty, IsString } from 'class-validator';

export class CreateAssignmentSubmissionDto {
  @IsNotEmpty()
  @IsString()
  response!: string;
}
