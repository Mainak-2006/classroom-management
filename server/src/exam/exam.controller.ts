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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Controller('exam')
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Roles(Role.ADMIN, Role.TEACHER)
  @Post()
  create(
    @Body() createExamDto: CreateExamDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.examService.create(createExamDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.examService.findAll(user);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateExamDto: UpdateExamDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.examService.update(id, updateExamDto, user);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.examService.remove(id, user);
  }

  // Find exams by course
  @Get('course/:courseId')
  findByCourse(
    @Param('courseId') courseId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.examService.findByCourse(courseId, user);
  }

  // Find exams by status
  @Get('status/:status')
  @Roles(Role.ADMIN)
  findByStatus(
    @Param('status') status: ExamStatus,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.examService.findByStatus(status, user);
  }

  // Find submissions by student
  @Get('submissions/student/:studentId')
  @Roles(Role.ADMIN, Role.STUDENT)
  findSubmissionsByStudent(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.examService.findByStudent(studentId, user);
  }

  // Submit an exam score on behalf of a student
  @Roles(Role.ADMIN, Role.TEACHER)
  @Post(':id/submit')
  submit(
    @Param('id') id: string,
    @Body() createExamSubmissionDto: CreateExamSubmissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.examService.submit(id, createExamSubmissionDto, user);
  }

  // Find submissions for an exam
  @Get(':id/submissions')
  @Roles(Role.ADMIN, Role.TEACHER)
  findSubmissions(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.examService.findByExam(id, user);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Patch('submissions/:submissionId')
  updateSubmission(
    @Param('submissionId') submissionId: string,
    @Body() updateExamSubmissionDto: UpdateExamSubmissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.examService.updateSubmission(
      submissionId,
      updateExamSubmissionDto,
      user,
    );
  }

  // Get a single exam by id (must be last to avoid shadowing other routes)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.examService.findOne(id, user);
  }
}
