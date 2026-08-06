import { Test, TestingModule } from '@nestjs/testing';
import { ExamController } from './exam.controller';
import { ExamService } from './exam.service';
import { CourseService } from '../course/course.service';
import { StudentService } from '../student/student.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ExamController', () => {
  let controller: ExamController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExamController],
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

    controller = module.get<ExamController>(ExamController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
