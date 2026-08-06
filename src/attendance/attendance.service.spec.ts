import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { CourseService } from '../course/course.service';
import { StudentService } from '../student/student.service';

describe('AttendanceService', () => {
  let service: AttendanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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

    service = module.get<AttendanceService>(AttendanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
