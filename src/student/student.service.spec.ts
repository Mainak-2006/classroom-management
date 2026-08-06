import { Test, TestingModule } from '@nestjs/testing';
import { StudentService } from './student.service';
import { PrismaService } from '../prisma/prisma.service';

describe('StudentService', () => {
  let service: StudentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StudentService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<StudentService>(StudentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
