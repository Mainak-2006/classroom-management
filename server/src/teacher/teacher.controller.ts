import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { AttendanceService } from '../attendance/attendance.service';
import { CreateAttendanceDto } from '../attendance/dto/create-attendance.dto';
import { CourseService } from '../course/course.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Controller('teacher')
export class TeacherController {
  constructor(
    private readonly teacherService: TeacherService,
    private readonly attendanceService: AttendanceService,
    private readonly courseService: CourseService,
  ) {}

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() createTeacherDto: CreateTeacherDto) {
    return this.teacherService.create(createTeacherDto);
  }

  @Roles(Role.ADMIN)
  @Post('bulk')
  createBulk(@Body() teachers: CreateTeacherDto[]) {
    return this.teacherService.createBulk(teachers);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Get('profile')
  profile(@CurrentUser() user: AuthenticatedUser) {
    return this.teacherService.findOne(user.id);
  }

  // Get own courses
  @Roles(Role.ADMIN, Role.TEACHER)
  @Get('courses')
  myCourses(@CurrentUser() user: AuthenticatedUser) {
    return user.role === Role.ADMIN
      ? this.courseService.findAll()
      : this.courseService.findByTeacher(user.id);
  }

  // Mark attendance for a course
  @Roles(Role.ADMIN, Role.TEACHER)
  @Post('attendance')
  markAttendance(
    @Body() createAttendanceDto: CreateAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.create(createAttendanceDto, user);
  }

  // View attendance for a course
  @Roles(Role.ADMIN, Role.TEACHER)
  @Get('attendance/course/:courseId')
  courseAttendance(
    @Param('courseId') courseId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.findByCourse(courseId, user);
  }

  @Roles(Role.ADMIN)
  @Get()
  findAll() {
    return this.teacherService.findAll();
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.teacherService.findOneForRequester(id, user);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTeacherDto: UpdateTeacherDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.teacherService.update(id, updateTeacherDto, user);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.teacherService.remove(id, user);
  }
}
