import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest matchers return any */
import { ExamService } from './exam.service';
import { PrismaService } from '../prisma/prisma.service';
import { CourseService } from '../course/course.service';
import { StudentService } from '../student/student.service';
import { ExamStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

const adminRequester: AuthenticatedUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  role: 'admin',
  jti: 'jti-admin',
};

const mockExam = {
  id: 'exam-1',
  title: 'Midterm Exam',
  description: 'Covers weeks 1-6',
  courseId: 'course-1',
  examDate: new Date('2026-02-01'),
  duration: 120,
  totalMarks: 100,
  instructions: 'Closed book',
  status: 'DRAFT',
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockSubmission = {
  id: 'submission-1',
  examId: 'exam-1',
  studentId: 'student-1',
  score: 92,
  submittedAt: new Date('2026-02-01T10:00:00.000Z'),
  createdAt: new Date('2026-02-01T10:00:00.000Z'),
};

describe('ExamService', () => {
  let service: ExamService;
  let prisma: {
    exam: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    examSubmission: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let courseService: {
    findOne: jest.Mock;
    assertTeacherOwnsCourse: jest.Mock;
  };
  let studentService: { findOne: jest.Mock };

  const createDto = {
    title: 'Midterm Exam',
    courseId: 'course-1',
    examDate: '2026-02-01',
    duration: 120,
    totalMarks: 100,
  };

  beforeEach(async () => {
    prisma = {
      exam: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      examSubmission: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    courseService = {
      findOne: jest.fn().mockResolvedValue({ id: 'course-1' }),
      assertTeacherOwnsCourse: jest.fn().mockResolvedValue(undefined),
    };
    studentService = {
      findOne: jest.fn().mockResolvedValue({ id: 'student-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamService,
        { provide: PrismaService, useValue: prisma },
        { provide: CourseService, useValue: courseService },
        { provide: StudentService, useValue: studentService },
      ],
    }).compile();

    service = module.get<ExamService>(ExamService);
  });

  describe('create', () => {
    it('should validate the course and default the status to DRAFT', async () => {
      prisma.exam.create.mockResolvedValue(mockExam);

      const result = await service.create(createDto, adminRequester);

      expect(courseService.assertTeacherOwnsCourse).toHaveBeenCalledWith(
        adminRequester,
        'course-1',
      );
      expect(prisma.exam.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Midterm Exam',
          examDate: new Date('2026-02-01'),
          status: ExamStatus.DRAFT,
          isActive: true,
        }),
      });
      expect(result.message).toBe('Exam created successfully');
    });

    it('should propagate NotFoundException when the course is missing', async () => {
      courseService.assertTeacherOwnsCourse.mockRejectedValue(
        new NotFoundException('Course not found'),
      );

      await expect(service.create(createDto, adminRequester)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.exam.create).not.toHaveBeenCalled();
    });

    it('should propagate ForbiddenException when a teacher creates an exam for a course they do not teach', async () => {
      courseService.assertTeacherOwnsCourse.mockRejectedValue(
        new ForbiddenException(),
      );

      await expect(service.create(createDto, adminRequester)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.exam.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all exams with a total', async () => {
      prisma.exam.findMany.mockResolvedValue([mockExam]);

      const result = await service.findAll();

      expect(result).toEqual({ total: 1, data: [mockExam] });
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when the exam does not exist', async () => {
      prisma.exam.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return the exam when it exists', async () => {
      prisma.exam.findUnique.mockResolvedValue(mockExam);

      await expect(service.findOne('exam-1')).resolves.toEqual(mockExam);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when the exam does not exist', async () => {
      prisma.exam.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { title: 'New' }, adminRequester),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce course ownership on the current course by default', async () => {
      prisma.exam.findUnique.mockResolvedValue(mockExam);
      prisma.exam.update.mockResolvedValue(mockExam);

      await service.update('exam-1', { title: 'New' }, adminRequester);
      expect(courseService.assertTeacherOwnsCourse).toHaveBeenCalledWith(
        adminRequester,
        'course-1',
      );
    });

    it('should validate the course only when courseId changes', async () => {
      prisma.exam.findUnique.mockResolvedValue(mockExam);
      prisma.exam.update.mockResolvedValue(mockExam);

      await service.update('exam-1', { title: 'New' }, adminRequester);
      expect(courseService.findOne).not.toHaveBeenCalled();

      await service.update('exam-1', { courseId: 'course-2' }, adminRequester);
      expect(courseService.assertTeacherOwnsCourse).toHaveBeenCalledWith(
        adminRequester,
        'course-2',
      );
    });

    it('should convert examDate and return an envelope', async () => {
      prisma.exam.findUnique.mockResolvedValue(mockExam);
      prisma.exam.update.mockResolvedValue(mockExam);

      await service.update(
        'exam-1',
        { examDate: '2026-03-01' },
        adminRequester,
      );

      expect(prisma.exam.update).toHaveBeenCalledWith({
        where: { id: 'exam-1' },
        data: expect.objectContaining({ examDate: new Date('2026-03-01') }),
      });
    });
  });

  describe('findByCourse', () => {
    it('should validate the course before listing exams', async () => {
      prisma.exam.findMany.mockResolvedValue([mockExam]);

      await service.findByCourse('course-1');

      expect(courseService.findOne).toHaveBeenCalledWith('course-1');
      expect(prisma.exam.findMany).toHaveBeenCalledWith({
        where: { courseId: 'course-1' },
      });
    });
  });

  describe('findByStatus', () => {
    it('should filter exams by status', async () => {
      prisma.exam.findMany.mockResolvedValue([mockExam]);

      const result = await service.findByStatus(ExamStatus.DRAFT);

      expect(prisma.exam.findMany).toHaveBeenCalledWith({
        where: { status: ExamStatus.DRAFT },
      });
      expect(result).toEqual({ total: 1, data: [mockExam] });
    });
  });

  describe('submit', () => {
    it('should validate the exam and student before creating a submission', async () => {
      prisma.exam.findUnique.mockResolvedValue(mockExam);
      prisma.examSubmission.create.mockResolvedValue(mockSubmission);

      const result = await service.submit(
        'exam-1',
        { studentId: 'student-1', score: 92 },
        adminRequester,
      );

      expect(prisma.exam.findUnique).toHaveBeenCalledWith({
        where: { id: 'exam-1' },
      });
      expect(courseService.assertTeacherOwnsCourse).toHaveBeenCalledWith(
        adminRequester,
        'course-1',
      );
      expect(studentService.findOne).toHaveBeenCalledWith('student-1');
      expect(prisma.examSubmission.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          examId: 'exam-1',
          studentId: 'student-1',
          score: 92,
          submittedAt: expect.any(Date),
        }),
      });
      expect(result.message).toBe('Exam submitted successfully');
    });

    it('should throw NotFoundException when the exam does not exist', async () => {
      prisma.exam.findUnique.mockResolvedValue(null);

      await expect(
        service.submit(
          'exam-1',
          { studentId: 'student-1', score: 92 },
          adminRequester,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.examSubmission.create).not.toHaveBeenCalled();
    });

    it('should use the given submittedAt when provided', async () => {
      prisma.exam.findUnique.mockResolvedValue(mockExam);
      prisma.examSubmission.create.mockResolvedValue(mockSubmission);

      await service.submit(
        'exam-1',
        {
          studentId: 'student-1',
          score: 92,
          submittedAt: '2026-02-01T09:00:00.000Z',
        },
        adminRequester,
      );

      expect(prisma.examSubmission.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          submittedAt: new Date('2026-02-01T09:00:00.000Z'),
        }),
      });
    });
  });

  describe('updateSubmission', () => {
    it('should throw NotFoundException when the submission does not exist', async () => {
      prisma.examSubmission.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSubmission('missing', { score: 100 }, adminRequester),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate the student only when studentId changes', async () => {
      prisma.examSubmission.findUnique.mockResolvedValue({
        ...mockSubmission,
        exam: mockExam,
      });
      prisma.examSubmission.update.mockResolvedValue(mockSubmission);

      await service.updateSubmission(
        'submission-1',
        { score: 100 },
        adminRequester,
      );
      expect(studentService.findOne).not.toHaveBeenCalled();

      await service.updateSubmission(
        'submission-1',
        { studentId: 'student-2' },
        adminRequester,
      );
      expect(studentService.findOne).toHaveBeenCalledWith('student-2');
    });

    it('should convert submittedAt and return an envelope', async () => {
      prisma.examSubmission.findUnique.mockResolvedValue({
        ...mockSubmission,
        exam: mockExam,
      });
      prisma.examSubmission.update.mockResolvedValue(mockSubmission);

      const result = await service.updateSubmission(
        'submission-1',
        { submittedAt: '2026-02-02T08:00:00.000Z' },
        adminRequester,
      );

      expect(prisma.examSubmission.update).toHaveBeenCalledWith({
        where: { id: 'submission-1' },
        data: expect.objectContaining({
          submittedAt: new Date('2026-02-02T08:00:00.000Z'),
        }),
      });
      expect(result.message).toBe('Exam submission updated successfully');
    });
  });

  describe('findByExam', () => {
    it('should throw NotFoundException when the exam does not exist', async () => {
      prisma.exam.findUnique.mockResolvedValue(null);

      await expect(service.findByExam('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return submissions for the exam', async () => {
      prisma.exam.findUnique.mockResolvedValue(mockExam);
      prisma.examSubmission.findMany.mockResolvedValue([mockSubmission]);

      const result = await service.findByExam('exam-1');

      expect(result).toEqual({ total: 1, data: [mockSubmission] });
    });
  });

  describe('findByStudent', () => {
    it('should validate the student before listing submissions', async () => {
      prisma.examSubmission.findMany.mockResolvedValue([mockSubmission]);

      const result = await service.findByStudent('student-1');

      expect(studentService.findOne).toHaveBeenCalledWith('student-1');
      expect(prisma.examSubmission.findMany).toHaveBeenCalledWith({
        where: { studentId: 'student-1' },
        include: { exam: { include: { course: true } } },
      });
      expect(result).toEqual({ total: 1, data: [mockSubmission] });
    });

    it('should throw NotFoundException when the student does not exist', async () => {
      studentService.findOne.mockRejectedValue(
        new NotFoundException('Student not found'),
      );

      await expect(service.findByStudent('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.examSubmission.findMany).not.toHaveBeenCalled();
    });
  });
});
