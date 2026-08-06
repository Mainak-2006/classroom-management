import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { ExamService } from './exam.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { CreateExamSubmissionDto } from './dto/create-exam-submission.dto';
import { UpdateExamSubmissionDto } from './dto/update-exam-submission.dto';
import { ExamStatus } from './entities/exam.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@Controller('exam')
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Roles(Role.ADMIN, Role.TEACHER)
  @Post()
  create(@Body() createExamDto: CreateExamDto) {
    return this.examService.create(createExamDto);
  }

  @Get()
  findAll() {
    return this.examService.findAll();
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateExamDto: UpdateExamDto) {
    return this.examService.update(id, updateExamDto);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.examService.remove(id);
  }

  // Find exams by course
  @Get('course/:courseId')
  findByCourse(@Param('courseId') courseId: string) {
    return this.examService.findByCourse(courseId);
  }

  // Find exams by status
  @Get('status/:status')
  findByStatus(@Param('status') status: ExamStatus) {
    return this.examService.findByStatus(status);
  }

  // Find submissions by student
  @Get('submissions/student/:studentId')
  findSubmissionsByStudent(@Param('studentId') studentId: string) {
    return this.examService.findByStudent(studentId);
  }

  // Submit an exam score on behalf of a student
  @Roles(Role.ADMIN, Role.TEACHER)
  @Post(':id/submit')
  submit(
    @Param('id') id: string,
    @Body() createExamSubmissionDto: CreateExamSubmissionDto,
  ) {
    return this.examService.submit(id, createExamSubmissionDto);
  }

  // Find submissions for an exam
  @Get(':id/submissions')
  findSubmissions(@Param('id') id: string) {
    return this.examService.findByExam(id);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Patch('submissions/:submissionId')
  updateSubmission(
    @Param('submissionId') submissionId: string,
    @Body() updateExamSubmissionDto: UpdateExamSubmissionDto,
  ) {
    return this.examService.updateSubmission(
      submissionId,
      updateExamSubmissionDto,
    );
  }

  // Get a single exam by id (must be last to avoid shadowing other routes)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.examService.findOne(id);
  }
}
