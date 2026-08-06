import { Test, TestingModule } from '@nestjs/testing';
import { ExamService } from './exam.service';
import { CourseService } from '../course/course.service';
import { StudentService } from '../student/student.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ExamService', () => {
  let service: ExamService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamService,
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

    service = module.get<ExamService>(ExamService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
