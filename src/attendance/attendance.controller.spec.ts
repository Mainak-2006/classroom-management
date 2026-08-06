import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { CourseService } from '../course/course.service';
import { StudentService } from '../student/student.service';

describe('AttendanceController', () => {
  let controller: AttendanceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendanceController],
      providers: [
        AttendanceService,
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
});
