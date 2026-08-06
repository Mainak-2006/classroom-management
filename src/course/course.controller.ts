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

@Controller('course')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() createCourseDto: CreateCourseDto) {
    return this.courseService.create(createCourseDto);
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

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCourseDto: UpdateCourseDto) {
    return this.courseService.update(id, updateCourseDto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.courseService.remove(id);
  }

  // Assign teacher to course
  @Roles(Role.ADMIN)
  @Post(':id/teacher/:teacherId')
  assignTeacherToCourse(
    @Param('id') courseId: string,
    @Param('teacherId') teacherId: string,
  ) {
    return this.courseService.assignTeacherToCourse(courseId, teacherId);
  }

  // Remove teacher from course
  @Roles(Role.ADMIN)
  @Delete(':id/teacher')
  removeTeacherFromCourse(@Param('id') courseId: string) {
    return this.courseService.removeTeacherFromCourse(courseId);
  }

  // Add student to course
  @Roles(Role.ADMIN)
  @Post(':id/students/:studentId')
  addStudentToCourse(
    @Param('id') courseId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.courseService.addStudentToCourse(courseId, studentId);
  }

  // Remove student from course
  @Roles(Role.ADMIN)
  @Delete(':id/students/:studentId')
  removeStudentFromCourse(
    @Param('id') courseId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.courseService.removeStudentFromCourse(courseId, studentId);
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

  // Get a single course by id (must be last to avoid shadowing other routes)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.courseService.findOne(id);
  }
}
