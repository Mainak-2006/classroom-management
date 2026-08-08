import { Test, TestingModule } from '@nestjs/testing';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';
import { AttendanceService } from '../attendance/attendance.service';
import { CourseService } from '../course/course.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

const requester: AuthenticatedUser = {
  id: 'teacher-1',
  email: 'teacher@example.com',
  role: 'teacher',
  jti: 'jti-1',
};

describe('TeacherController', () => {
  let controller: TeacherController;
  let courseService: { findByTeacher: jest.Mock };

  beforeEach(async () => {
    courseService = { findByTeacher: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeacherController],
      providers: [
        TeacherService,
        { provide: PrismaService, useValue: {} },
        {
          provide: AttendanceService,
          useValue: { findByCourse: jest.fn(), create: jest.fn() },
        },
        { provide: CourseService, useValue: courseService },
      ],
    }).compile();

    controller = module.get<TeacherController>(TeacherController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('GET /courses should delegate to findByTeacher with the current user id', async () => {
    await controller.myCourses(requester);
    expect(courseService.findByTeacher).toHaveBeenCalledWith('teacher-1');
  });
});
