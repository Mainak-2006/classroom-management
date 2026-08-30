import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { CourseService } from '../course/course.service';
import { StudentService } from '../student/student.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

describe('AttendanceController', () => {
  let controller: AttendanceController;
  let attendanceService: { createBulk: jest.Mock };

  beforeEach(async () => {
    attendanceService = { createBulk: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendanceController],
      providers: [
        { provide: AttendanceService, useValue: attendanceService },
        { provide: PrismaService, useValue: {} },
        {
          provide: CourseService,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: StudentService,
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<AttendanceController>(AttendanceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes the validated bulk items to the service', () => {
    const user: AuthenticatedUser = {
      id: 'teacher-1',
      email: 'teacher@example.com',
      role: 'teacher',
      jti: 'token-1',
    };
    const items = [
      {
        studentId: 'student-1',
        courseId: 'course-1',
        date: '2026-08-30',
      },
    ];

    controller.createBulk({ items }, user);

    expect(attendanceService.createBulk).toHaveBeenCalledWith(items, user);
  });
});
