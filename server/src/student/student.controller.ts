import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { AttendanceService } from '../attendance/attendance.service';
import { CourseService } from '../course/course.service';
import { ExamService } from '../exam/exam.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Controller('student')
export class StudentController {
  constructor(
    private readonly studentService: StudentService,
    private readonly attendanceService: AttendanceService,
    private readonly courseService: CourseService,
    private readonly examService: ExamService,
  ) {}

  @Roles(Role.ADMIN, Role.STUDENT)
  @Post()
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentService.create(createStudentDto);
  }

  @Roles(Role.ADMIN)
  @Post('bulk')
  createBulk(@Body() students: CreateStudentDto[]) {
    return this.studentService.createBulk(students);
  }

  @Roles(Role.STUDENT)
  @Get('profile')
  profile(@CurrentUser() user: AuthenticatedUser) {
    return this.studentService.findOne(user.id);
  }

  // Get own attendance
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  @Get('attendance')
  myAttendance(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.findByStudent(user.id);
  }

  // Get own courses
  @Roles(Role.STUDENT)
  @Get('courses')
  myCourses(@CurrentUser() user: AuthenticatedUser) {
    return this.courseService.findByStudent(user.id);
  }

  // Get own exam results
  @Roles(Role.STUDENT)
  @Get('exams')
  myExams(@CurrentUser() user: AuthenticatedUser) {
    return this.examService.findByStudent(user.id);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Get()
  findAll() {
    return this.studentService.findAll();
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studentService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.STUDENT)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentService.update(id, updateStudentDto);
  }

  @Roles(Role.ADMIN, Role.STUDENT)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.studentService.remove(id);
  }
}
