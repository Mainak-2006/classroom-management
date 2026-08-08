import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Controller('course')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Roles(Role.ADMIN, Role.TEACHER)
  @Post()
  create(
    @Body() createCourseDto: CreateCourseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.courseService.create(createCourseDto, user);
  }

  @Roles(Role.ADMIN)
  @Post('bulk')
  createBulk(@Body() courses: CreateCourseDto[]) {
    return this.courseService.createBulk(courses);
  }

  @Get()
  findAll() {
    return this.courseService.findAll();
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.courseService.update(id, updateCourseDto, user);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.courseService.remove(id, user);
  }

  // Assign teacher to course
  @Roles(Role.ADMIN, Role.TEACHER)
  @Post(':id/teacher/:teacherId')
  assignTeacherToCourse(
    @Param('id') courseId: string,
    @Param('teacherId') teacherId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.courseService.assignTeacherToCourse(courseId, teacherId, user);
  }

  // Remove teacher from course
  @Roles(Role.ADMIN, Role.TEACHER)
  @Delete(':id/teacher')
  removeTeacherFromCourse(
    @Param('id') courseId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.courseService.removeTeacherFromCourse(courseId, user);
  }

  // Add student to course
  @Roles(Role.ADMIN, Role.TEACHER)
  @Post(':id/students/:studentId')
  addStudentToCourse(
    @Param('id') courseId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.courseService.addStudentToCourse(courseId, studentId, user);
  }

  // Remove student from course
  @Roles(Role.ADMIN, Role.TEACHER)
  @Delete(':id/students/:studentId')
  removeStudentFromCourse(
    @Param('id') courseId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.courseService.removeStudentFromCourse(
      courseId,
      studentId,
      user,
    );
  }

  // Get course students
  @Get(':id/students')
  getCourseStudents(@Param('id') courseId: string) {
    return this.courseService.getCourseStudents(courseId);
  }

  // Get course teacher
  @Get(':id/teacher')
  getCourseTeacher(@Param('id') courseId: string) {
    return this.courseService.getCourseTeacher(courseId);
  }

  // Find courses by semester
  @Get('semester/:semester')
  findBySemester(@Param('semester') semester: string) {
    return this.courseService.findBySemester(+semester);
  }

  // Find courses by department
  @Get('department/:department')
  findByDepartment(@Param('department') department: string) {
    return this.courseService.findByDepartment(department);
  }

  // Find courses taught by a teacher
  @Get('teacher/:teacherId')
  findByTeacher(@Param('teacherId') teacherId: string) {
    return this.courseService.findByTeacher(teacherId);
  }

  // Get a single course by id (must be last to avoid shadowing other routes)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.courseService.findOne(id);
  }
}
