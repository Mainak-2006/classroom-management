import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest matchers return any */
import { AssignmentService } from './assignment.service';
import { PrismaService } from '../prisma/prisma.service';
import { CourseService } from '../course/course.service';
import { AssignmentStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

const adminRequester: AuthenticatedUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  role: 'admin',
  jti: 'jti-admin',
};

const mockAssignment = {
  id: 'assignment-1',
  title: 'Binary Search Trees',
  description: 'Implement BST operations',
  courseId: 'course-1',
  dueDate: new Date('2026-01-15'),
  totalMarks: 100,
  instructions: 'Submit via GitHub',
  status: 'DRAFT',
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('AssignmentService', () => {
  let service: AssignmentService;
  let prisma: {
    assignment: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let courseService: {
    findOne: jest.Mock;
    assertTeacherOwnsCourse: jest.Mock;
  };

  const createDto = {
    title: 'Binary Search Trees',
    courseId: 'course-1',
    dueDate: '2026-01-15',
    totalMarks: 100,
  };

  beforeEach(async () => {
    prisma = {
      assignment: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    courseService = {
      findOne: jest.fn().mockResolvedValue({ id: 'course-1' }),
      assertTeacherOwnsCourse: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentService,
        { provide: PrismaService, useValue: prisma },
        { provide: CourseService, useValue: courseService },
      ],
    }).compile();

    service = module.get<AssignmentService>(AssignmentService);
  });

  describe('create', () => {
    it('should validate the course and default the status to DRAFT', async () => {
      prisma.assignment.create.mockResolvedValue(mockAssignment);

      const result = await service.create(createDto, adminRequester);

      expect(courseService.assertTeacherOwnsCourse).toHaveBeenCalledWith(
        adminRequester,
        'course-1',
      );
      expect(prisma.assignment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Binary Search Trees',
          dueDate: new Date('2026-01-15'),
          status: AssignmentStatus.DRAFT,
          isActive: true,
        }),
      });
      expect(result.message).toBe('Assignment created successfully');
    });

    it('should propagate NotFoundException when the course is missing', async () => {
      courseService.assertTeacherOwnsCourse.mockRejectedValue(
        new NotFoundException('Course not found'),
      );

      await expect(service.create(createDto, adminRequester)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.assignment.create).not.toHaveBeenCalled();
    });

    it('should propagate ForbiddenException when a teacher creates an assignment for a course they do not teach', async () => {
      courseService.assertTeacherOwnsCourse.mockRejectedValue(
        new ForbiddenException(),
      );

      await expect(service.create(createDto, adminRequester)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.assignment.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all assignments with a total', async () => {
      prisma.assignment.findMany.mockResolvedValue([mockAssignment]);

      const result = await service.findAll();

      expect(result).toEqual({ total: 1, data: [mockAssignment] });
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when the assignment does not exist', async () => {
      prisma.assignment.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return the assignment when it exists', async () => {
      prisma.assignment.findUnique.mockResolvedValue(mockAssignment);

      await expect(service.findOne('assignment-1')).resolves.toEqual(
        mockAssignment,
      );
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when the assignment does not exist', async () => {
      prisma.assignment.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { title: 'New title' }, adminRequester),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate the course only when courseId changes', async () => {
      prisma.assignment.findUnique.mockResolvedValue(mockAssignment);
      prisma.assignment.update.mockResolvedValue(mockAssignment);

      await service.update(
        'assignment-1',
        { title: 'New title' },
        adminRequester,
      );
      expect(courseService.findOne).not.toHaveBeenCalled();

      await service.update(
        'assignment-1',
        { courseId: 'course-2' },
        adminRequester,
      );
      expect(courseService.assertTeacherOwnsCourse).toHaveBeenCalledWith(
        adminRequester,
        'course-2',
      );
    });

    it('should convert dueDate and return an envelope', async () => {
      prisma.assignment.findUnique.mockResolvedValue(mockAssignment);
      prisma.assignment.update.mockResolvedValue(mockAssignment);

      const result = await service.update(
        'assignment-1',
        { dueDate: '2026-02-01' },
        adminRequester,
      );

      expect(prisma.assignment.update).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
        data: expect.objectContaining({ dueDate: new Date('2026-02-01') }),
      });
      expect(result.message).toBe('Assignment updated successfully');
    });

    it('should reject updates to closed assignments', async () => {
      prisma.assignment.findUnique.mockResolvedValue({
        ...mockAssignment,
        status: AssignmentStatus.CLOSED,
      });

      await expect(
        service.update('assignment-1', { title: 'New title' }, adminRequester),
      ).rejects.toThrow(ConflictException);
      expect(prisma.assignment.update).not.toHaveBeenCalled();
    });

    it('should reject manually closing an assignment', async () => {
      prisma.assignment.findUnique.mockResolvedValue(mockAssignment);

      await expect(
        service.update(
          'assignment-1',
          { status: AssignmentStatus.CLOSED },
          adminRequester,
        ),
      ).rejects.toThrow(ConflictException);
      expect(prisma.assignment.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException when the assignment does not exist', async () => {
      prisma.assignment.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing', adminRequester)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete the assignment and return an envelope', async () => {
      prisma.assignment.findUnique.mockResolvedValue(mockAssignment);
      prisma.assignment.delete.mockResolvedValue(mockAssignment);

      const result = await service.remove('assignment-1', adminRequester);

      expect(prisma.assignment.delete).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
      });
      expect(result.message).toBe('Assignment deleted successfully');
    });

    it('should reject deleting a closed assignment', async () => {
      prisma.assignment.findUnique.mockResolvedValue({
        ...mockAssignment,
        status: AssignmentStatus.CLOSED,
      });

      await expect(
        service.remove('assignment-1', adminRequester),
      ).rejects.toThrow(ConflictException);
      expect(prisma.assignment.delete).not.toHaveBeenCalled();
    });
  });

  describe('findByCourse', () => {
    it('should validate the course before listing assignments', async () => {
      prisma.assignment.findMany.mockResolvedValue([mockAssignment]);

      await service.findByCourse('course-1');

      expect(courseService.findOne).toHaveBeenCalledWith('course-1');
      expect(prisma.assignment.findMany).toHaveBeenCalledWith({
        where: { courseId: 'course-1' },
      });
    });
  });

  describe('findByStatus', () => {
    it('should filter assignments by status', async () => {
      prisma.assignment.findMany.mockResolvedValue([mockAssignment]);

      const result = await service.findByStatus(AssignmentStatus.DRAFT);

      expect(prisma.assignment.findMany).toHaveBeenCalledWith({
        where: { status: AssignmentStatus.DRAFT },
      });
      expect(result).toEqual({ total: 1, data: [mockAssignment] });
    });
  });
});
