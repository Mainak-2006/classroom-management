import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentService } from './assignment.service';
import { CourseService } from '../course/course.service';

describe('AssignmentService', () => {
  let service: AssignmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentService,
        {
          provide: CourseService,
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AssignmentService>(AssignmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
