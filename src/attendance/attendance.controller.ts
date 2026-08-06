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

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Roles(Role.ADMIN, Role.TEACHER)
  @Post()
  create(@Body() createAttendanceDto: CreateAttendanceDto) {
    return this.attendanceService.create(createAttendanceDto);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Post('bulk')
  createBulk(@Body() records: CreateAttendanceDto[]) {
    return this.attendanceService.createBulk(records);
  }

  @Get()
  findAll() {
    return this.attendanceService.findAll();
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAttendanceDto: UpdateAttendanceDto,
  ) {
    return this.attendanceService.update(id, updateAttendanceDto);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.attendanceService.remove(id);
  }

  // Find attendance records by course
  @Get('course/:courseId')
  findByCourse(@Param('courseId') courseId: string) {
    return this.attendanceService.findByCourse(courseId);
  }

  // Find attendance records by student
  @Get('student/:studentId')
  findByStudent(@Param('studentId') studentId: string) {
    return this.attendanceService.findByStudent(studentId);
  }

  // Find attendance records by date
  @Get('date/:date')
  findByDate(@Param('date') date: string) {
    return this.attendanceService.findByDate(date);
  }

  // Find attendance records by course and date
  @Get('course/:courseId/date/:date')
  findByCourseAndDate(
    @Param('courseId') courseId: string,
    @Param('date') date: string,
  ) {
    return this.attendanceService.findByCourseAndDate(courseId, date);
  }

  // Get a single attendance record by id (must be last to avoid shadowing other routes)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.attendanceService.findOne(id);
  }
}
