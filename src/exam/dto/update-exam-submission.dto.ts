import { PartialType } from '@nestjs/mapped-types';
import { CreateExamSubmissionDto } from './create-exam-submission.dto';

export class UpdateExamSubmissionDto extends PartialType(
  CreateExamSubmissionDto,
) {}
