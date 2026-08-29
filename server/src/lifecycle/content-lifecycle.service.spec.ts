import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentStatus, ExamStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { ContentLifecycleService } from './content-lifecycle.service';

describe('ContentLifecycleService', () => {
  let service: ContentLifecycleService;
  let prisma: {
    assignment: { updateMany: jest.Mock };
    exam: { findMany: jest.Mock; updateMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      assignment: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      exam: {
        findMany: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentLifecycleService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ContentLifecycleService>(ContentLifecycleService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('closes published assignments at their due date and expired exams at their end time', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-01T12:00:00.000Z'));
    prisma.exam.findMany.mockResolvedValue([
      { id: 'expired-exam', examDate: new Date('2026-02-01T09:00:00.000Z'), duration: 120 },
      { id: 'future-exam', examDate: new Date('2026-02-01T11:00:00.000Z'), duration: 120 },
    ]);

    await service.closeExpiredContent();

    expect(prisma.assignment.updateMany).toHaveBeenCalledWith({
      where: {
        status: AssignmentStatus.PUBLISHED,
        dueDate: { lte: new Date('2026-02-01T12:00:00.000Z') },
      },
      data: { status: AssignmentStatus.CLOSED },
    });
    expect(prisma.exam.findMany).toHaveBeenCalledWith({
      where: { status: ExamStatus.PUBLISHED },
      select: { id: true, examDate: true, duration: true },
    });
    expect(prisma.exam.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['expired-exam'] },
        status: ExamStatus.PUBLISHED,
      },
      data: { status: ExamStatus.CLOSED },
    });
  });

  it('does not issue an exam update when no published exam has expired', async () => {
    prisma.exam.findMany.mockResolvedValue([
      { id: 'future-exam', examDate: new Date('2099-01-01T09:00:00.000Z'), duration: 120 },
    ]);

    await service.closeExpiredContent();

    expect(prisma.exam.updateMany).not.toHaveBeenCalled();
  });
});
