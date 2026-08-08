import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentController } from './assignment.controller';
import { AssignmentService } from './assignment.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

const requester: AuthenticatedUser = {
  id: 'teacher-1',
  email: 'teacher@example.com',
  role: 'teacher',
  jti: 'jti-1',
};

describe('AssignmentController', () => {
  let controller: AssignmentController;
  let assignmentService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    findByCourse: jest.Mock;
    findByStatus: jest.Mock;
  };

  beforeEach(async () => {
    assignmentService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      findByCourse: jest.fn(),
      findByStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssignmentController],
      providers: [{ provide: AssignmentService, useValue: assignmentService }],
    }).compile();

    controller = module.get<AssignmentController>(AssignmentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('POST / should delegate to create with the requester', async () => {
    const dto = { title: 'BST', courseId: 'c-1', dueDate: '2026-01-15' };
    await controller.create(dto as never, requester);
    expect(assignmentService.create).toHaveBeenCalledWith(dto, requester);
  });

  it('PATCH /:id should delegate to update with the requester', async () => {
    await controller.update('assignment-1', { title: 'New' }, requester);
    expect(assignmentService.update).toHaveBeenCalledWith(
      'assignment-1',
      { title: 'New' },
      requester,
    );
  });

  it('DELETE /:id should delegate to remove with the requester', async () => {
    await controller.remove('assignment-1', requester);
    expect(assignmentService.remove).toHaveBeenCalledWith(
      'assignment-1',
      requester,
    );
  });
});
