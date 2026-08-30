import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import type { Course as CourseModel } from '@prisma/client';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { TeacherService } from '../teacher/teacher.service';
import { StudentService } from '../student/student.service';
import { Role } from '../auth/enums/role.enum';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  buildPagination,
  parsePagination,
  type PaginationQuery,
} from '../common/pagination';

const courseInclude = {
  teacher: true,
  students: true,
} as const;

type PersonWithPassword = { password?: string };

function sanitizePerson<T extends PersonWithPassword>(person: T): T {
  if (typeof person.password === 'string') delete person.password;
  return person;
}

function sanitizeCourse<T>(course: T): T {
  if (!course || typeof course !== 'object') return course;
  const record = course as PersonWithPassword & {
    teacher?: PersonWithPassword | null;
    students?: PersonWithPassword[];
  };
  if (record.teacher) sanitizePerson(record.teacher);
  if (record.students) record.students.forEach(sanitizePerson);
  return course;
}

@Injectable()
export class CourseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teacherService: TeacherService,
    private readonly studentService: StudentService,
  ) {}

  async create(createCourseDto: CreateCourseDto, requester: AuthenticatedUser) {
    const existingCourse = await this.prisma.course.findFirst({
      where: {
        code: { equals: createCourseDto.code, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (existingCourse) {
      throw new ConflictException('Course with this code already exists');
    }

    let teacherId: string | undefined;

    if (requester.role === Role.TEACHER) {
      teacherId = requester.id;
    } else if (createCourseDto.teacherId) {
      const teacher = await this.teacherService.findOne(
        createCourseDto.teacherId,
      );

      if (!teacher) {
        throw new NotFoundException('Teacher not found');
      }

      teacherId = teacher.id;
    }

    const course = await this.prisma.course.create({
      data: {
        name: createCourseDto.name,
        code: createCourseDto.code,
        description: createCourseDto.description,
        department: createCourseDto.department,
        semester: createCourseDto.semester,
        credits: createCourseDto.credits,
        isActive: createCourseDto.isActive ?? true,
        teacherId,
      },
      include: courseInclude,
    });

    return {
      message: 'Course created successfully',
      data: sanitizeCourse(course),
    };
  }

  async findAll(query: PaginationQuery = {}) {
    const { skip, take } = parsePagination(query);
    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({ include: courseInclude, skip, take }),
      this.prisma.course.count(),
    ]);

    return {
      total,
      ...buildPagination(total, query),
      data: courses.map(sanitizeCourse),
    };
  }

  async findAllForRequester(
    requester: AuthenticatedUser,
    query: PaginationQuery = {},
  ) {
    if (requester.role === Role.ADMIN) return this.findAll(query);
    if (requester.role === Role.TEACHER)
      return this.findByTeacher(requester.id, query);
    return this.findByStudent(requester.id, query);
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: courseInclude,
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return sanitizeCourse(course);
  }

  async findOneForRequester(id: string, requester: AuthenticatedUser) {
    await this.assertCanViewCourse(requester, id);
    return this.findOne(id);
  }

  async update(
    id: string,
    updateCourseDto: UpdateCourseDto,
    requester: AuthenticatedUser,
  ) {
    const existing = await this.prisma.course.findUnique({
      where: { id },
      select: { id: true, teacherId: true },
    });

    if (!existing) {
      throw new NotFoundException('Course not found');
    }

    this.assertTeacherOwnership(requester, existing);

    if (updateCourseDto.code) {
      const duplicate = await this.prisma.course.findFirst({
        where: {
          id: { not: id },
          code: { equals: updateCourseDto.code, mode: 'insensitive' },
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new ConflictException('Course with this code already exists');
      }
    }

    const { teacherId, ...rest } = updateCourseDto;

    const data: Parameters<typeof this.prisma.course.update>[0]['data'] = {
      ...rest,
    };

    if (requester.role === Role.TEACHER) {
      data.teacherId = requester.id;
    } else if (teacherId) {
      const teacher = await this.teacherService.findOne(teacherId);

      if (!teacher) {
        throw new NotFoundException('Teacher not found');
      }

      data.teacher = { connect: { id: teacherId } };
    }

    const course = await this.prisma.course.update({
      where: { id },
      data,
      include: courseInclude,
    });

    return {
      message: 'Course updated successfully',
      data: sanitizeCourse(course),
    };
  }

  async remove(id: string, requester: AuthenticatedUser) {
    const existing = await this.prisma.course.findUnique({
      where: { id },
      select: { id: true, teacherId: true },
    });

    if (!existing) {
      throw new NotFoundException('Course not found');
    }

    this.assertTeacherOwnership(requester, existing);

    const deletedCourse = await this.prisma.course.delete({ where: { id } });

    return {
      message: 'Course deleted successfully',
      data: deletedCourse,
    };
  }

  // Assign teacher to course
  async assignTeacherToCourse(
    courseId: string,
    teacherId: string,
    requester: AuthenticatedUser,
  ) {
    const existing = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, teacherId: true },
    });

    if (!existing) {
      throw new NotFoundException('Course not found');
    }

    this.assertTeacherOwnership(requester, existing);

    if (requester.role === Role.TEACHER) {
      teacherId = requester.id;
    }

    const teacher = await this.teacherService.findOne(teacherId);

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const course = await this.prisma.course.update({
      where: { id: courseId },
      data: { teacher: { connect: { id: teacherId } } },
      include: courseInclude,
    });

    return {
      message: 'Teacher assigned to course successfully',
      data: sanitizeCourse(course),
    };
  }

  // Remove teacher from course
  async removeTeacherFromCourse(
    courseId: string,
    requester: AuthenticatedUser,
  ) {
    const existing = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, teacherId: true },
    });

    if (!existing) {
      throw new NotFoundException('Course not found');
    }

    this.assertTeacherOwnership(requester, existing);

    const course = await this.prisma.course.update({
      where: { id: courseId },
      data: { teacher: { disconnect: true } },
      include: courseInclude,
    });

    return {
      message: 'Teacher removed from course successfully',
      data: sanitizeCourse(course),
    };
  }

  // Add student to course
  async addStudentToCourse(
    courseId: string,
    studentId: string,
    requester: AuthenticatedUser,
  ) {
    const existing = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, teacherId: true },
    });

    if (!existing) {
      throw new NotFoundException('Course not found');
    }

    this.assertTeacherOwnership(requester, existing);

    const student = await this.studentService.findOne(studentId);

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { students: { select: { id: true } } },
    });

    const studentExists = course?.students.some(
      (enrolled) => enrolled.id === studentId,
    );

    if (studentExists) {
      throw new ConflictException('Student is already enrolled in this course');
    }

    const updatedCourse = await this.prisma.course.update({
      where: { id: courseId },
      data: { students: { connect: { id: studentId } } },
      include: courseInclude,
    });

    return {
      message: 'Student added to course successfully',
      data: sanitizeCourse(updatedCourse),
    };
  }

  // Remove student from course
  async removeStudentFromCourse(
    courseId: string,
    studentId: string,
    requester: AuthenticatedUser,
  ) {
    const existing = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, teacherId: true },
    });

    if (!existing) {
      throw new NotFoundException('Course not found');
    }

    this.assertTeacherOwnership(requester, existing);

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { students: { select: { id: true } } },
    });

    const isEnrolled = course?.students.some(
      (student) => student.id === studentId,
    );

    if (!isEnrolled) {
      throw new NotFoundException('Course has no students');
    }

    const updatedCourse = await this.prisma.course.update({
      where: { id: courseId },
      data: { students: { disconnect: { id: studentId } } },
      include: courseInclude,
    });

    return {
      message: 'Student removed from course successfully',
      data: sanitizeCourse(updatedCourse),
    };
  }

  // Get course teacher
  async getCourseTeacher(courseId: string, requester?: AuthenticatedUser) {
    if (requester) await this.assertCanViewCourse(requester, courseId);
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { teacher: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (!course.teacher) {
      throw new NotFoundException('No teacher assigned to this course');
    }

    return sanitizePerson(course.teacher);
  }

  // Get course students
  async getCourseStudents(courseId: string, requester?: AuthenticatedUser) {
    if (requester?.role === Role.STUDENT) {
      throw new ForbiddenException('Students cannot view the course roster');
    }
    if (requester) await this.assertCanViewCourse(requester, courseId);
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { students: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return {
      total: course.students.length,
      data: course.students.map(sanitizePerson),
    };
  }

  // Find courses a student is enrolled in
  async findByStudent(studentId: string, query: PaginationQuery = {}) {
    await this.studentService.findOne(studentId);
    const { skip, take } = parsePagination(query);
    const where = { students: { some: { id: studentId } } };
    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        include: { teacher: true },
        skip,
        take,
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      total,
      ...buildPagination(total, query),
      data: courses.map(sanitizeCourse),
    };
  }

  // Find courses taught by a teacher
  async findByTeacher(teacherId: string, query: PaginationQuery = {}) {
    await this.teacherService.findOne(teacherId);
    const { skip, take } = parsePagination(query);
    const where = { teacherId };
    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        include: { students: true },
        skip,
        take,
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      total,
      ...buildPagination(total, query),
      data: courses.map(sanitizeCourse),
    };
  }

  // Throws if the requester is a teacher who does not teach the course
  async assertTeacherOwnsCourse(
    requester: AuthenticatedUser,
    courseId: string,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    this.assertTeacherOwnership(requester, course);
  }

  async assertCanViewCourse(requester: AuthenticatedUser, courseId: string) {
    if (requester.role === Role.ADMIN) return;
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        teacherId: true,
        students: { where: { id: requester.id }, select: { id: true } },
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    if (requester.role === Role.TEACHER && course.teacherId === requester.id)
      return;
    if (requester.role === Role.STUDENT && course.students.length > 0) return;
    throw new ForbiddenException('You do not have access to this course');
  }

  async assertStudentEnrolled(courseId: string, studentId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { students: { where: { id: studentId }, select: { id: true } } },
    });
    if (!course) throw new NotFoundException('Course not found');
    if (!course.students.length) {
      throw new ForbiddenException('Student is not enrolled in this course');
    }
  }

  private assertTeacherOwnership(
    requester: AuthenticatedUser,
    course: { teacherId: string | null },
  ) {
    if (requester.role === Role.TEACHER && course.teacherId !== requester.id) {
      throw new ForbiddenException(
        'You can only manage courses that you teach',
      );
    }
  }

  // Find courses by semester
  async findBySemester(semester: number, requester?: AuthenticatedUser) {
    if (requester && requester.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can browse courses by semester',
      );
    }
    const courses = await this.prisma.course.findMany({
      where: { semester },
      include: courseInclude,
    });

    return {
      total: courses.length,
      data: courses.map(sanitizeCourse),
    };
  }

  // Find courses by department
  async findByDepartment(department: string, requester?: AuthenticatedUser) {
    if (requester && requester.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can browse courses by department',
      );
    }
    const courses = await this.prisma.course.findMany({
      where: {
        department: { equals: department, mode: 'insensitive' },
      },
      include: courseInclude,
    });

    return {
      total: courses.length,
      data: courses.map(sanitizeCourse),
    };
  }

  async createBulk(courses: CreateCourseDto[]) {
    const createdCourses: CourseModel[] = [];

    for (const createCourseDto of courses) {
      const existingCourse = await this.prisma.course.findFirst({
        where: {
          code: { equals: createCourseDto.code, mode: 'insensitive' },
        },
        select: { id: true },
      });

      if (existingCourse) {
        throw new ConflictException(
          `Course with code ${createCourseDto.code} already exists`,
        );
      }

      let teacherId: string | undefined;

      if (createCourseDto.teacherId) {
        const teacher = await this.teacherService.findOne(
          createCourseDto.teacherId,
        );

        if (!teacher) {
          throw new NotFoundException('Teacher not found');
        }

        teacherId = teacher.id;
      }

      const course = await this.prisma.course.create({
        data: {
          name: createCourseDto.name,
          code: createCourseDto.code,
          description: createCourseDto.description,
          department: createCourseDto.department,
          semester: createCourseDto.semester,
          credits: createCourseDto.credits,
          isActive: createCourseDto.isActive ?? true,
          teacherId,
        },
      });

      createdCourses.push(course);
    }

    return {
      message: ' Courses created successfully',
      data: createdCourses,
    };
  }
}
