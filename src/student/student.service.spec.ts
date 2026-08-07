import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';

import bcrypt from 'bcryptjs';

import { StudentService } from './student.service';
import { PrismaService } from '../prisma/prisma.service';
import { Gender } from './dto/create-student.dto';

/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest matchers return any */
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn(() => 'mock-salt'),
  hash: jest.fn((value: string) => `hashed:${value}`),
  compare: jest.fn(),
}));

const mockStudent = {
  id: 'student-1',
  firstName: 'John',
  lastName: 'Smith',
  email: 'student@example.com',
  phone: '+12025550147',
  dateOfBirth: new Date('2004-08-22'),
  gender: 'MALE',
  rollNumber: 'S001',
  registrationNumber: 'R001',
  department: 'Computer Science',
  semester: 1,
  section: 'A',
  address: null,
  profileImage: null,
  guardianName: null,
  guardianPhone: null,
  isActive: true,
  password: 'hashed:password123',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('StudentService', () => {
  let service: StudentService;
  let prisma: {
    student: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const createDto = {
    firstName: 'John',
    lastName: 'Smith',
    email: 'student@example.com',
    phone: '+12025550147',
    dateOfBirth: '2004-08-22',
    gender: Gender.MALE,
    rollNumber: 'S001',
    registrationNumber: 'R001',
    department: 'Computer Science',
    semester: 1,
    section: 'A',
    password: 'password123',
    confirmPassword: 'password123',
  };

  beforeEach(async () => {
    prisma = {
      student: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [StudentService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<StudentService>(StudentService);
  });

  describe('validateStudent', () => {
    it('should return the student without password when credentials are valid', async () => {
      prisma.student.findUnique.mockResolvedValue(mockStudent);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateStudent(
        'student@example.com',
        'password123',
      );

      expect(result).not.toHaveProperty('password');
      expect(result?.rollNumber).toBe('S001');
    });

    it('should return null when the password does not match', async () => {
      prisma.student.findUnique.mockResolvedValue(mockStudent);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateStudent('student@example.com', 'wrong'),
      ).resolves.toBeNull();
    });

    it('should return null when the student does not exist', async () => {
      prisma.student.findUnique.mockResolvedValue(null);

      await expect(
        service.validateStudent('missing@example.com', 'password123'),
      ).resolves.toBeNull();
    });
  });

  describe('create', () => {
    it('should throw ConflictException when the email or roll number exists', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: 'student-1' });

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.student.create).not.toHaveBeenCalled();
    });

    it('should hash the password, convert the date, and omit the password', async () => {
      prisma.student.findFirst.mockResolvedValue(null);
      prisma.student.create.mockResolvedValue(mockStudent);

      const result = await service.create(createDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'mock-salt');
      expect(prisma.student.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'student@example.com',
          rollNumber: 'S001',
          password: 'hashed:password123',
          dateOfBirth: new Date('2004-08-22'),
        }),
      });
      expect(result.data).not.toHaveProperty('password');
      expect(result.message).toBe('Student created successfully');
    });
  });

  describe('findAll', () => {
    it('should strip passwords from all returned students', async () => {
      prisma.student.findMany.mockResolvedValue([mockStudent, mockStudent]);

      const result = await service.findAll();

      expect(result.total).toBe(2);
      expect(result.data.every((s) => !('password' in s))).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when the student does not exist', async () => {
      prisma.student.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return the student without password', async () => {
      prisma.student.findUnique.mockResolvedValue(mockStudent);

      const result = await service.findOne('student-1');

      expect(result).not.toHaveProperty('password');
      expect(result.id).toBe('student-1');
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when the student does not exist', async () => {
      prisma.student.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { section: 'A' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should hash a new password only when one is provided', async () => {
      prisma.student.findUnique.mockResolvedValue({ id: 'student-1' });
      prisma.student.update.mockResolvedValue(mockStudent);

      await service.update('student-1', { password: 'newpass123' });
      expect(bcrypt.hash).toHaveBeenCalledWith('newpass123', 'mock-salt');

      await service.update('student-1', { section: 'B' });
      expect(prisma.student.update).toHaveBeenLastCalledWith({
        where: { id: 'student-1' },
        data: expect.not.objectContaining({ password: expect.anything() }),
      });
    });

    it('should return the updated student without password', async () => {
      prisma.student.findUnique.mockResolvedValue({ id: 'student-1' });
      prisma.student.update.mockResolvedValue(mockStudent);

      const result = await service.update('student-1', { section: 'B' });

      expect(result.data).not.toHaveProperty('password');
      expect(result.message).toBe('Student updated successfully');
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException when the student does not exist', async () => {
      prisma.student.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete the student and omit the password', async () => {
      prisma.student.findUnique.mockResolvedValue({ id: 'student-1' });
      prisma.student.delete.mockResolvedValue(mockStudent);

      const result = await service.remove('student-1');

      expect(prisma.student.delete).toHaveBeenCalledWith({
        where: { id: 'student-1' },
      });
      expect(result.data).not.toHaveProperty('password');
    });
  });

  describe('createBulk', () => {
    it('should skip students whose email or roll number exists', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: 'student-1' });

      const result = await service.createBulk([createDto]);

      expect(prisma.student.create).not.toHaveBeenCalled();
      expect(result.data).toHaveLength(0);
    });

    it('should create multiple students and strip passwords', async () => {
      prisma.student.findFirst.mockResolvedValue(null);
      prisma.student.create.mockResolvedValue(mockStudent);

      const result = await service.createBulk([createDto, createDto]);

      expect(prisma.student.create).toHaveBeenCalledTimes(2);
      expect(result.total).toBe(2);
      expect(result.data.every((s) => !('password' in s))).toBe(true);
    });
  });
});
