import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import bcrypt from 'bcryptjs';

import { TeacherService } from './teacher.service';
import { PrismaService } from '../prisma/prisma.service';
import { Gender } from './dto/create-teacher.dto';

/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest matchers return any */
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn(() => 'mock-salt'),
  hash: jest.fn((value: string) => `hashed:${value}`),
  compare: jest.fn(),
}));

const mockTeacher = {
  id: 'teacher-1',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'teacher@example.com',
  phone: '+12025550145',
  dateOfBirth: new Date('1985-03-15'),
  gender: 'FEMALE',
  employeeId: 'T001',
  department: 'Computer Science',
  designation: 'Senior Lecturer',
  qualification: 'PhD in Computer Science',
  specialization: 'Software Engineering',
  officeRoom: 'B-204',
  profileImage: null,
  isActive: true,
  password: 'hashed:password123',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('TeacherService', () => {
  let service: TeacherService;
  let prisma: {
    teacher: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const createDto = {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'teacher@example.com',
    phone: '+12025550145',
    dateOfBirth: '1985-03-15',
    gender: Gender.FEMALE,
    employeeId: 'T001',
    department: 'Computer Science',
    designation: 'Senior Lecturer',
    qualification: 'PhD in Computer Science',
    specialization: 'Software Engineering',
    officeRoom: 'B-204',
    password: 'password123',
    confirmPassword: 'password123',
  };

  beforeEach(async () => {
    prisma = {
      teacher: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TeacherService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<TeacherService>(TeacherService);
  });

  describe('validateTeacher', () => {
    it('should return the teacher without password when credentials are valid', async () => {
      prisma.teacher.findUnique.mockResolvedValue(mockTeacher);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateTeacher(
        'teacher@example.com',
        'password123',
      );

      expect(result).not.toHaveProperty('password');
      expect(result?.employeeId).toBe('T001');
    });

    it('should return null when the password does not match', async () => {
      prisma.teacher.findUnique.mockResolvedValue(mockTeacher);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateTeacher('teacher@example.com', 'wrong'),
      ).resolves.toBeNull();
    });

    it('should return null when the teacher does not exist', async () => {
      prisma.teacher.findUnique.mockResolvedValue(null);

      await expect(
        service.validateTeacher('missing@example.com', 'password123'),
      ).resolves.toBeNull();
    });

    it('should reject a deactivated account even with valid credentials', async () => {
      prisma.teacher.findUnique.mockResolvedValue({
        ...mockTeacher,
        isActive: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.validateTeacher('teacher@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('create', () => {
    it('should throw ConflictException when the email or employee ID exists', async () => {
      prisma.teacher.findFirst.mockResolvedValue({ id: 'teacher-1' });

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.teacher.create).not.toHaveBeenCalled();
    });

    it('should hash the password, convert the date, and omit the password', async () => {
      prisma.teacher.findFirst.mockResolvedValue(null);
      prisma.teacher.create.mockResolvedValue(mockTeacher);

      const result = await service.create(createDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'mock-salt');
      expect(prisma.teacher.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'teacher@example.com',
          employeeId: 'T001',
          password: 'hashed:password123',
          dateOfBirth: new Date('1985-03-15'),
        }),
      });
      expect(result.data).not.toHaveProperty('password');
      expect(result.message).toBe('Teacher created successfully');
    });
  });

  describe('findAll', () => {
    it('should strip passwords from all returned teachers', async () => {
      prisma.teacher.findMany.mockResolvedValue([mockTeacher, mockTeacher]);
      prisma.teacher.count.mockResolvedValue(2);

      const result = await service.findAll();

      expect(result.total).toBe(2);
      expect(result.data.every((t) => !('password' in t))).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when the teacher does not exist', async () => {
      prisma.teacher.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return the teacher without password', async () => {
      prisma.teacher.findUnique.mockResolvedValue(mockTeacher);

      const result = await service.findOne('teacher-1');

      expect(result).not.toHaveProperty('password');
      expect(result.id).toBe('teacher-1');
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when the teacher does not exist', async () => {
      prisma.teacher.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { officeRoom: 'B-210' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should hash a new password only when one is provided', async () => {
      prisma.teacher.findUnique.mockResolvedValue({ id: 'teacher-1' });
      prisma.teacher.update.mockResolvedValue(mockTeacher);

      await service.update('teacher-1', { password: 'newpass123' });
      expect(bcrypt.hash).toHaveBeenCalledWith('newpass123', 'mock-salt');

      await service.update('teacher-1', { officeRoom: 'B-205' });
      expect(prisma.teacher.update).toHaveBeenLastCalledWith({
        where: { id: 'teacher-1' },
        data: expect.not.objectContaining({ password: expect.anything() }),
      });
    });

    it('should return the updated teacher without password', async () => {
      prisma.teacher.findUnique.mockResolvedValue({ id: 'teacher-1' });
      prisma.teacher.update.mockResolvedValue(mockTeacher);

      const result = await service.update('teacher-1', { officeRoom: 'B-205' });

      expect(result.data).not.toHaveProperty('password');
      expect(result.message).toBe('Teacher updated successfully');
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException when the teacher does not exist', async () => {
      prisma.teacher.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete the teacher and omit the password', async () => {
      prisma.teacher.findUnique.mockResolvedValue({ id: 'teacher-1' });
      prisma.teacher.delete.mockResolvedValue(mockTeacher);

      const result = await service.remove('teacher-1');

      expect(prisma.teacher.delete).toHaveBeenCalledWith({
        where: { id: 'teacher-1' },
      });
      expect(result.data).not.toHaveProperty('password');
    });
  });

  describe('createBulk', () => {
    it('should skip teachers whose email or employee ID exists', async () => {
      prisma.teacher.findFirst.mockResolvedValue({ id: 'teacher-1' });

      const result = await service.createBulk([createDto]);

      expect(prisma.teacher.create).not.toHaveBeenCalled();
      expect(result.data).toHaveLength(0);
    });

    it('should create multiple teachers and strip passwords', async () => {
      prisma.teacher.findFirst.mockResolvedValue(null);
      prisma.teacher.create.mockResolvedValue(mockTeacher);

      const result = await service.createBulk([createDto, createDto]);

      expect(prisma.teacher.create).toHaveBeenCalledTimes(2);
      expect(result.total).toBe(2);
      expect(result.data.every((t) => !('password' in t))).toBe(true);
    });
  });
});
