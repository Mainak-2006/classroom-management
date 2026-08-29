import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Roles(Role.ADMIN, Role.TEACHER)
  @Post()
  create(@Body() createAttendanceDto: CreateAttendanceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.create(createAttendanceDto, user);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Post('bulk')
  createBulk(@Body() records: CreateAttendanceDto[], @CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.createBulk(records, user);
  }

  @Roles(Role.ADMIN)
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.findAll(user);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAttendanceDto: UpdateAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.update(id, updateAttendanceDto, user);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.remove(id, user);
  }

  // Find attendance records by course
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  @Get('course/:courseId')
  findByCourse(@Param('courseId') courseId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.findByCourse(courseId, user);
  }

  // Find attendance records by student
  @Roles(Role.ADMIN, Role.STUDENT)
  @Get('student/:studentId')
  findByStudent(@Param('studentId') studentId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.findByStudent(studentId, user);
  }

  // Find attendance records by date
  @Roles(Role.ADMIN)
  @Get('date/:date')
  findByDate(@Param('date') date: string, @CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.findByDate(date, user);
  }

  // Find attendance records by course and date
  @Get('course/:courseId/date/:date')
  findByCourseAndDate(
    @Param('courseId') courseId: string,
    @Param('date') date: string, @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.findByCourseAndDate(courseId, date, user);
  }

  // Get a single attendance record by id (must be last to avoid shadowing other routes)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.findOne(id, user);
  }
}
