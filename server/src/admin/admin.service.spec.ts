import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import bcrypt from 'bcryptjs';

import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminRole, Gender } from './dto/create-admin.dto';

/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest matchers return any */
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn(() => 'mock-salt'),
  hash: jest.fn((value: string) => `hashed:${value}`),
  compare: jest.fn(),
}));

const mockAdmin = {
  id: 'admin-1',
  firstName: 'System',
  lastName: 'Admin',
  email: 'admin@example.com',
  phone: '+10000000000',
  dateOfBirth: new Date('1990-01-01'),
  gender: 'MALE',
  department: 'Administration',
  role: 'ADMIN',
  profileImage: null,
  isActive: true,
  password: 'hashed:secret',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('AdminService', () => {
  let service: AdminService;
  let prisma: {
    admin: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const createDto = {
    firstName: 'System',
    lastName: 'Admin',
    email: 'admin@example.com',
    phone: '+10000000000',
    dateOfBirth: '1990-01-01',
    gender: Gender.MALE,
    department: 'Administration',
    role: AdminRole.ADMIN,
    password: 'admin123',
    confirmPassword: 'admin123',
  };

  beforeEach(async () => {
    prisma = {
      admin: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe('validateAdmin', () => {
    it('should return the admin without password when credentials are valid', async () => {
      prisma.admin.findUnique.mockResolvedValue(mockAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateAdmin(
        'admin@example.com',
        'admin123',
      );

      expect(result).not.toHaveProperty('password');
      expect(result?.email).toBe('admin@example.com');
    });

    it('should return null when the password does not match', async () => {
      prisma.admin.findUnique.mockResolvedValue(mockAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateAdmin('admin@example.com', 'wrong'),
      ).resolves.toBeNull();
    });

    it('should return null when the admin does not exist', async () => {
      prisma.admin.findUnique.mockResolvedValue(null);

      await expect(
        service.validateAdmin('missing@example.com', 'admin123'),
      ).resolves.toBeNull();
    });

    it('should reject a deactivated account even with valid credentials', async () => {
      prisma.admin.findUnique.mockResolvedValue({
        ...mockAdmin,
        isActive: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.validateAdmin('admin@example.com', 'admin123'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('create', () => {
    it('should throw ConflictException when the email already exists', async () => {
      prisma.admin.findUnique.mockResolvedValue({ id: 'admin-1' });

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.admin.create).not.toHaveBeenCalled();
    });

    it('should hash the password and omit it from the response', async () => {
      prisma.admin.findUnique.mockResolvedValue(null);
      prisma.admin.create.mockResolvedValue(mockAdmin);

      const result = await service.create(createDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('admin123', 'mock-salt');
      expect(prisma.admin.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'admin@example.com',
          password: 'hashed:admin123',
          dateOfBirth: new Date('1990-01-01'),
        }),
      });
      expect(result.data).not.toHaveProperty('password');
      expect(result.message).toBe('Admin created successfully');
    });
  });

  describe('findAll', () => {
    it('should strip passwords from all returned admins', async () => {
      prisma.admin.findMany.mockResolvedValue([mockAdmin, mockAdmin]);
      prisma.admin.count.mockResolvedValue(2);

      const result = await service.findAll();

      expect(result.total).toBe(2);
      expect(result.data.every((a) => !('password' in a))).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when the admin does not exist', async () => {
      prisma.admin.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return the admin without password', async () => {
      prisma.admin.findUnique.mockResolvedValue(mockAdmin);

      const result = await service.findOne('admin-1');

      expect(result).not.toHaveProperty('password');
      expect(result.id).toBe('admin-1');
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when the admin does not exist', async () => {
      prisma.admin.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { department: 'IT' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should hash a new password only when one is provided', async () => {
      prisma.admin.findUnique.mockResolvedValue({ id: 'admin-1' });
      prisma.admin.update.mockResolvedValue(mockAdmin);

      await service.update('admin-1', { password: 'newpass123' });
      expect(bcrypt.hash).toHaveBeenCalledWith('newpass123', 'mock-salt');

      await service.update('admin-1', { department: 'IT' });
      expect(prisma.admin.update).toHaveBeenLastCalledWith({
        where: { id: 'admin-1' },
        data: expect.not.objectContaining({ password: expect.anything() }),
      });
    });

    it('should return the updated admin without password', async () => {
      prisma.admin.findUnique.mockResolvedValue({ id: 'admin-1' });
      prisma.admin.update.mockResolvedValue(mockAdmin);

      const result = await service.update('admin-1', { department: 'IT' });

      expect(result.data).not.toHaveProperty('password');
      expect(result.message).toBe('Admin updated successfully');
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException when the admin does not exist', async () => {
      prisma.admin.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete the admin and omit the password', async () => {
      prisma.admin.findUnique.mockResolvedValue({ id: 'admin-1' });
      prisma.admin.delete.mockResolvedValue(mockAdmin);

      const result = await service.remove('admin-1');

      expect(prisma.admin.delete).toHaveBeenCalledWith({
        where: { id: 'admin-1' },
      });
      expect(result.data).not.toHaveProperty('password');
    });
  });

  describe('createBulk', () => {
    it('should skip admins whose email already exists', async () => {
      prisma.admin.findUnique.mockResolvedValue({ id: 'admin-1' });

      const result = await service.createBulk([createDto]);

      expect(prisma.admin.create).not.toHaveBeenCalled();
      expect(result.data).toHaveLength(0);
    });

    it('should create multiple admins and strip passwords', async () => {
      prisma.admin.findUnique.mockResolvedValue(null);
      prisma.admin.create.mockResolvedValue(mockAdmin);

      const result = await service.createBulk([createDto, createDto]);

      expect(prisma.admin.create).toHaveBeenCalledTimes(2);
      expect(result.total).toBe(2);
      expect(result.data.every((a) => !('password' in a))).toBe(true);
    });
  });
});
