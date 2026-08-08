import { Test, TestingModule } from '@nestjs/testing';
import { ExamController } from './exam.controller';
import { ExamService } from './exam.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

const requester: AuthenticatedUser = {
  id: 'teacher-1',
  email: 'teacher@example.com',
  role: 'teacher',
  jti: 'jti-1',
};

describe('ExamController', () => {
  let controller: ExamController;
  let examService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    findByCourse: jest.Mock;
    findByStatus: jest.Mock;
    findByStudent: jest.Mock;
    submit: jest.Mock;
    findByExam: jest.Mock;
    updateSubmission: jest.Mock;
  };

  beforeEach(async () => {
    examService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      findByCourse: jest.fn(),
      findByStatus: jest.fn(),
      findByStudent: jest.fn(),
      submit: jest.fn(),
      findByExam: jest.fn(),
      updateSubmission: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExamController],
      providers: [{ provide: ExamService, useValue: examService }],
    }).compile();

    controller = module.get<ExamController>(ExamController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('POST / should delegate to create with the requester', async () => {
    const dto = { title: 'Midterm', courseId: 'c-1', examDate: '2026-02-01' };
    await controller.create(dto as never, requester);
    expect(examService.create).toHaveBeenCalledWith(dto, requester);
  });

  it('PATCH /:id should delegate to update with the requester', async () => {
    await controller.update('exam-1', { title: 'New' }, requester);
    expect(examService.update).toHaveBeenCalledWith(
      'exam-1',
      { title: 'New' },
      requester,
    );
  });

  it('DELETE /:id should delegate to remove with the requester', async () => {
    await controller.remove('exam-1', requester);
    expect(examService.remove).toHaveBeenCalledWith('exam-1', requester);
  });

  it('POST /:id/submit should delegate to submit with the requester', async () => {
    const dto = { studentId: 'student-1', score: 92 };
    await controller.submit('exam-1', dto, requester);
    expect(examService.submit).toHaveBeenCalledWith('exam-1', dto, requester);
  });

  it('PATCH /submissions/:submissionId should delegate to updateSubmission with the requester', async () => {
    const dto = { score: 100 };
    await controller.updateSubmission('submission-1', dto, requester);
    expect(examService.updateSubmission).toHaveBeenCalledWith(
      'submission-1',
      dto,
      requester,
    );
  });
});
