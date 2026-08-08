import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma/prisma.service';
import { CourseService } from '../course/course.service';
import { StudentService } from '../student/student.service';
import { AttendanceStatus } from './entities/attendance.entity';

/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest matchers return any */
const mockRecord = {
  id: 'attendance-1',
  studentId: 'student-1',
  courseId: 'course-1',
  date: new Date('2026-01-01'),
  status: 'PRESENT',
  notes: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: {
    attendance: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let courseService: { findOne: jest.Mock };
  let studentService: { findOne: jest.Mock };

  const createDto = {
    studentId: 'student-1',
    courseId: 'course-1',
    date: '2026-01-01',
    status: AttendanceStatus.PRESENT,
  };

  beforeEach(async () => {
    prisma = {
      attendance: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    courseService = {
      findOne: jest.fn().mockResolvedValue({ id: 'course-1' }),
    };
    studentService = {
      findOne: jest.fn().mockResolvedValue({ id: 'student-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: prisma },
        { provide: CourseService, useValue: courseService },
        { provide: StudentService, useValue: studentService },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
  });

  describe('create', () => {
    it('should validate the course and student references', async () => {
      prisma.attendance.findFirst.mockResolvedValue(null);
      prisma.attendance.create.mockResolvedValue(mockRecord);

      await service.create(createDto);

      expect(courseService.findOne).toHaveBeenCalledWith('course-1');
      expect(studentService.findOne).toHaveBeenCalledWith('student-1');
    });

    it('should throw ConflictException when a record exists for the same day', async () => {
      prisma.attendance.findFirst.mockResolvedValue({ id: 'attendance-1' });

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.attendance.create).not.toHaveBeenCalled();
    });

    it('should default the status to PRESENT when not provided', async () => {
      prisma.attendance.findFirst.mockResolvedValue(null);
      prisma.attendance.create.mockResolvedValue(mockRecord);

      await service.create({ ...createDto, status: undefined });

      expect(prisma.attendance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ status: 'PRESENT' }),
      });
    });

    it('should search for duplicates within the UTC day range', async () => {
      prisma.attendance.findFirst.mockResolvedValue(null);
      prisma.attendance.create.mockResolvedValue(mockRecord);

      await service.create(createDto);

      expect(prisma.attendance.findFirst).toHaveBeenCalledWith({
        where: {
          id: undefined,
          studentId: 'student-1',
          courseId: 'course-1',
          date: {
            gte: new Date('2026-01-01T00:00:00.000Z'),
            lt: new Date('2026-01-02T00:00:00.000Z'),
          },
        },
        select: { id: true },
      });
    });

    it('should return an envelope with the created record', async () => {
      prisma.attendance.findFirst.mockResolvedValue(null);
      prisma.attendance.create.mockResolvedValue(mockRecord);

      const result = await service.create(createDto);

      expect(result).toEqual({
        message: 'Attendance marked successfully',
        data: mockRecord,
      });
    });
  });

  describe('createBulk', () => {
    it('should create all records and report the count', async () => {
      prisma.attendance.findFirst.mockResolvedValue(null);
      prisma.attendance.create.mockResolvedValue(mockRecord);

      const result = await service.createBulk([createDto, createDto]);

      expect(prisma.attendance.create).toHaveBeenCalledTimes(2);
      expect(result.total).toBe(2);
      expect(result.message).toContain('2');
    });

    it('should stop at the first duplicate', async () => {
      prisma.attendance.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'existing',
        });

      await expect(service.createBulk([createDto, createDto])).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.attendance.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('should return all records with a total', async () => {
      prisma.attendance.findMany.mockResolvedValue([mockRecord]);

      const result = await service.findAll();

      expect(result).toEqual({ total: 1, data: [mockRecord] });
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when the record does not exist', async () => {
      prisma.attendance.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return the record when it exists', async () => {
      prisma.attendance.findUnique.mockResolvedValue(mockRecord);

      await expect(service.findOne('attendance-1')).resolves.toEqual(
        mockRecord,
      );
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when the record does not exist', async () => {
      prisma.attendance.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { status: AttendanceStatus.LATE }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should skip re-validating the student when the id is unchanged', async () => {
      prisma.attendance.findUnique.mockResolvedValue(mockRecord);
      prisma.attendance.findFirst.mockResolvedValue(null);
      prisma.attendance.update.mockResolvedValue(mockRecord);

      await service.update('attendance-1', { status: AttendanceStatus.ABSENT });

      expect(studentService.findOne).not.toHaveBeenCalled();
    });

    it('should exclude the current record from the duplicate check', async () => {
      prisma.attendance.findUnique.mockResolvedValue(mockRecord);
      prisma.attendance.findFirst.mockResolvedValue(null);
      prisma.attendance.update.mockResolvedValue(mockRecord);

      await service.update('attendance-1', { status: AttendanceStatus.LATE });

      expect(prisma.attendance.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { not: 'attendance-1' } }),
        }),
      );
    });

    it('should throw ConflictException when the new combination already exists', async () => {
      prisma.attendance.findUnique.mockResolvedValue(mockRecord);
      prisma.attendance.findFirst.mockResolvedValue({ id: 'other' });

      await expect(
        service.update('attendance-1', { status: AttendanceStatus.LATE }),
      ).rejects.toThrow(ConflictException);
    });

    it('should return an envelope with the updated record', async () => {
      prisma.attendance.findUnique.mockResolvedValue(mockRecord);
      prisma.attendance.findFirst.mockResolvedValue(null);
      prisma.attendance.update.mockResolvedValue(mockRecord);

      const result = await service.update('attendance-1', {
        status: AttendanceStatus.LATE,
      });

      expect(result.message).toBe('Attendance updated successfully');
      expect(result.data).toEqual(mockRecord);
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException when the record does not exist', async () => {
      prisma.attendance.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete the record and return an envelope', async () => {
      prisma.attendance.findUnique.mockResolvedValue(mockRecord);
      prisma.attendance.delete.mockResolvedValue(mockRecord);

      const result = await service.remove('attendance-1');

      expect(prisma.attendance.delete).toHaveBeenCalledWith({
        where: { id: 'attendance-1' },
      });
      expect(result.message).toBe('Attendance record deleted successfully');
    });
  });

  describe('findByCourse', () => {
    it('should validate the course before listing records', async () => {
      prisma.attendance.findMany.mockResolvedValue([mockRecord]);

      await service.findByCourse('course-1');

      expect(courseService.findOne).toHaveBeenCalledWith('course-1');
    });

    it('should return records for the course with a total', async () => {
      prisma.attendance.findMany.mockResolvedValue([mockRecord]);

      const result = await service.findByCourse('course-1');

      expect(result).toEqual({ total: 1, data: [mockRecord] });
    });
  });

  describe('findByDate', () => {
    it('should query only the records for that UTC day', async () => {
      prisma.attendance.findMany.mockResolvedValue([mockRecord]);

      await service.findByDate('2026-01-01');

      expect(prisma.attendance.findMany).toHaveBeenCalledWith({
        where: {
          date: {
            gte: new Date('2026-01-01T00:00:00.000Z'),
            lt: new Date('2026-01-02T00:00:00.000Z'),
          },
        },
      });
    });
  });

  describe('findByCourseAndDate', () => {
    it('should combine the course filter with the day range', async () => {
      prisma.attendance.findMany.mockResolvedValue([mockRecord]);

      await service.findByCourseAndDate('course-1', '2026-01-01');

      expect(courseService.findOne).toHaveBeenCalledWith('course-1');
      expect(prisma.attendance.findMany).toHaveBeenCalledWith({
        where: {
          courseId: 'course-1',
          date: {
            gte: new Date('2026-01-01T00:00:00.000Z'),
            lt: new Date('2026-01-02T00:00:00.000Z'),
          },
        },
      });
    });
  });
});
