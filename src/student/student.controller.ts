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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Controller('student')
export class StudentController {
  constructor(
    private readonly studentService: StudentService,
    private readonly attendanceService: AttendanceService,
  ) {}

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentService.create(createStudentDto);
  }

  @Roles(Role.ADMIN)
  @Post('bulk')
  createBulk(@Body() students: CreateStudentDto[]) {
    return this.studentService.createBulk(students);
  }

  @Get('profile')
  profile(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  // Get own attendance
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  @Get('attendance')
  myAttendance(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.findByStudent(user.id);
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

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentService.update(id, updateStudentDto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.studentService.remove(id);
  }
}
