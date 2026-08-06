import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Course } from './entities/course.entity';
import { TeacherEntity } from '../teacher/entities/teacher.entity';
import { StudentEntity } from '../student/entities/student.entity';
import { TeacherService } from '../teacher/teacher.service';
import { StudentService } from '../student/student.service';

@Injectable()
export class CourseService {
  private courses: Course[] = [];

  constructor(
    private readonly teacherService: TeacherService,
    private readonly studentService: StudentService,
  ) {}

  create(createCourseDto: CreateCourseDto) {
    const existingCourse = this.courses.find(
      (course) =>
        course.code.toLowerCase() === createCourseDto.code.toLowerCase(),
    );

    if (existingCourse) {
      throw new ConflictException('Course with this code already exists');
    }

    const course: Course = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 8),

      ...createCourseDto,

      isActive: true,

      createdAt: new Date(),

      updatedAt: new Date(),
      teacher: null as unknown as TeacherEntity,
      students: [],
    };

    this.courses.push(course);

    return {
      message: 'Course created successfully',
      data: course,
    };
  }

  findAll() {
    return {
      total: this.courses.length,
      data: this.courses,
    };
  }

  findOne(id: string) {
    const course = this.courses.find((course) => course.id === id);

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  update(id: string, updateCourseDto: UpdateCourseDto) {
    const index = this.courses.findIndex((course) => course.id === id);

    if (index === -1) {
      throw new NotFoundException('Course not found');
    }

    if (updateCourseDto.code) {
      const duplicate = this.courses.find(
        (course) =>
          course.id !== id &&
          course.code.toLowerCase() === updateCourseDto.code!.toLowerCase(),
      );

      if (duplicate) {
        throw new ConflictException('Course with this code already exists');
      }
    }

    this.courses[index] = {
      ...this.courses[index],
      ...updateCourseDto,
      updatedAt: new Date(),
    };

    return {
      message: 'Course updated successfully',
      data: this.courses[index],
    };
  }

  remove(id: string) {
    const index = this.courses.findIndex((course) => course.id === id);

    if (index === -1) {
      throw new NotFoundException('Course not found');
    }

    const deletedCourse = this.courses.splice(index, 1)[0];

    return {
      message: 'Course deleted successfully',
      data: deletedCourse,
    };
  }

  // Assign teacher to course
  async assignTeacherToCourse(courseId: string, teacherId: string) {
    // Validate course exists
    const courseIndex = this.courses.findIndex(
      (course) => course.id === courseId,
    );

    if (courseIndex === -1) {
      throw new NotFoundException('Course not found');
    }

    // Validate teacher exists
    const teacher = await this.teacherService.findOne(teacherId);
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Assign teacher to course
    this.courses[courseIndex] = {
      ...this.courses[courseIndex],
      teacher,
      updatedAt: new Date(),
    };

    return {
      message: 'Teacher assigned to course successfully',
      data: this.courses[courseIndex],
    };
  }

  // Remove teacher from course
  removeTeacherFromCourse(courseId: string) {
    const courseIndex = this.courses.findIndex(
      (course) => course.id === courseId,
    );

    if (courseIndex === -1) {
      throw new NotFoundException('Course not found');
    }

    this.courses[courseIndex] = {
      ...this.courses[courseIndex],
      teacher: null as unknown as TeacherEntity,
      updatedAt: new Date(),
    };

    return {
      message: 'Teacher removed from course successfully',
      data: this.courses[courseIndex],
    };
  }

  // Add student to course
  async addStudentToCourse(courseId: string, studentId: string) {
    // Validate course exists
    const courseIndex = this.courses.findIndex(
      (course) => course.id === courseId,
    );

    if (courseIndex === -1) {
      throw new NotFoundException('Course not found');
    }

    // Validate student exists
    const student = await this.studentService.findOne(studentId);
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Initialize students array if it doesn't exist
    if (!this.courses[courseIndex].students) {
      this.courses[courseIndex].students = [];
    }

    // Check if student is already in the course
    const studentExists = this.courses[courseIndex].students.some(
      (student) => student.id === studentId,
    );

    if (studentExists) {
      throw new ConflictException('Student is already enrolled in this course');
    }

    // Add student to course
    this.courses[courseIndex] = {
      ...this.courses[courseIndex],
      students: [...this.courses[courseIndex].students, student],
      updatedAt: new Date(),
    };

    return {
      message: 'Student added to course successfully',
      data: this.courses[courseIndex],
    };
  }

  // Remove student from course
  removeStudentFromCourse(courseId: string, studentId: string) {
    const courseIndex = this.courses.findIndex(
      (course) => course.id === courseId,
    );

    if (courseIndex === -1) {
      throw new NotFoundException('Course not found');
    }

    if (!this.courses[courseIndex].students) {
      throw new NotFoundException('Course has no students');
    }

    // Filter out the student
    this.courses[courseIndex].students = this.courses[
      courseIndex
    ].students.filter((student) => student.id !== studentId);

    this.courses[courseIndex] = {
      ...this.courses[courseIndex],
      updatedAt: new Date(),
    };

    return {
      message: 'Student removed from course successfully',
      data: this.courses[courseIndex],
    };
  }

  // Get course teacher
  getCourseTeacher(courseId: string) {
    const course = this.courses.find((course) => course.id === courseId);

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (!course.teacher) {
      throw new NotFoundException('No teacher assigned to this course');
    }

    return course.teacher;
  }

  // Get course students
  getCourseStudents(courseId: string) {
    const course = this.courses.find((course) => course.id === courseId);

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return {
      total: course.students?.length ?? 0,
      data: course.students ?? [],
    };
  }

  // Find courses by semester
  findBySemester(semester: number) {
    const courses = this.courses.filter(
      (course) => course.semester === semester,
    );

    return {
      total: courses.length,
      data: courses,
    };
  }

  // Find courses by department
  findByDepartment(department: string) {
    const courses = this.courses.filter(
      (course) => course.department.toLowerCase() === department.toLowerCase(),
    );

    return {
      total: courses.length,
      data: courses,
    };
  }

  async createBulk(courses: CreateCourseDto[]) {
    const createdCourses: Course[] = [];

    for (const createCourseDto of courses) {
      const existingCourse = this.courses.find(
        (course) =>
          course.code.toLowerCase() === createCourseDto.code.toLowerCase(),
      );

      if (existingCourse) {
        throw new ConflictException(
          `Course with code ${createCourseDto.code} already exists`,
        );
      }

      const course: Course = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 8),
        ...createCourseDto,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        teacher: null as unknown as TeacherEntity,
        students: [],
      };

      this.courses.push(course);
      createdCourses.push(course);
    }
    return {
      message: ' Courses created successfully',
      data: createdCourses,
    };
  }
}
