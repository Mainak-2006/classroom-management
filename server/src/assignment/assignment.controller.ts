import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { AssignmentService } from './assignment.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { AssignmentStatus } from './entities/assignment.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateAssignmentSubmissionDto } from './dto/create-assignment-submission.dto';
import { GradeAssignmentSubmissionDto } from './dto/grade-assignment-submission.dto';

@Controller('assignment')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Roles(Role.ADMIN, Role.TEACHER)
  @Post()
  create(
    @Body() createAssignmentDto: CreateAssignmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assignmentService.create(createAssignmentDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.assignmentService.findAll(user);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAssignmentDto: UpdateAssignmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assignmentService.update(id, updateAssignmentDto, user);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.assignmentService.remove(id, user);
  }

  // Find assignments by course
  @Get('course/:courseId')
  findByCourse(@Param('courseId') courseId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.assignmentService.findByCourse(courseId, user);
  }

  // Find assignments by status
  @Get('status/:status')
  @Roles(Role.ADMIN)
  findByStatus(@Param('status') status: AssignmentStatus, @CurrentUser() user: AuthenticatedUser) {
    return this.assignmentService.findByStatus(status, user);
  }

  @Roles(Role.STUDENT)
  @Post(':id/submissions')
  submit(@Param('id') id: string, @Body() dto: CreateAssignmentSubmissionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.assignmentService.submit(id, dto, user);
  }

  @Roles(Role.STUDENT)
  @Get(':id/submissions/me')
  mySubmission(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.assignmentService.findMySubmission(id, user);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Get(':id/submissions')
  submissions(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.assignmentService.findSubmissions(id, user);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Patch('submissions/:submissionId')
  grade(@Param('submissionId') submissionId: string, @Body() dto: GradeAssignmentSubmissionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.assignmentService.gradeSubmission(submissionId, dto, user);
  }

  // Get a single assignment by id (must be last to avoid shadowing other routes)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.assignmentService.findOne(id, user);
  }
}
