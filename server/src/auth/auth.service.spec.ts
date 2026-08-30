import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import {
  CreateStudentDto,
  Gender as StudentGender,
} from '../student/dto/create-student.dto';
import {
  CreateTeacherDto,
  Gender as TeacherGender,
} from '../teacher/dto/create-teacher.dto';
import { StudentService } from '../student/student.service';
import { TeacherService } from '../teacher/teacher.service';
import { AdminService } from '../admin/admin.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenStore } from './tokens/refresh-token-store.service';
import { UnauthorizedException, ConflictException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let studentService: Partial<StudentService>;
  let teacherService: Partial<TeacherService>;
  let adminService: Partial<AdminService>;
  let jwtService: Partial<JwtService>;
  let tokenStore: Partial<RefreshTokenStore>;
  let configService: Partial<ConfigService>;

  const mockValidatedStudent = {
    id: '1',
    email: 'student@example.com',
    firstName: 'Test',
  };

  const mockValidatedTeacher = {
    id: '2',
    email: 'teacher@example.com',
    employeeId: 'T001',
  };

  const mockValidatedAdmin = {
    id: '3',
    email: 'admin@example.com',
    role: 'ADMIN',
  };

  const mockDecoded = {
    id: '1',
    email: 'student@example.com',
    role: 'student',
    type: 'refresh',
    jti: 'refresh-jti-1',
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  beforeEach(async () => {
    studentService = {
      validateStudent: jest.fn(),
      create: jest.fn(),
    };

    teacherService = {
      validateTeacher: jest.fn(),
      create: jest.fn(),
    };

    adminService = {
      validateAdmin: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-token'),
      verify: jest.fn().mockReturnValue(mockDecoded),
    };

    tokenStore = {
      save: jest.fn(),
      isValid: jest.fn().mockReturnValue(true),
      revoke: jest.fn().mockReturnValue({ count: 1 }),
      revokeAllForUser: jest.fn(),
      blacklistAccessToken: jest.fn(),
      isAccessTokenBlacklisted: jest.fn().mockReturnValue(false),
    };

    configService = {
      getOrThrow: jest
        .fn()
        .mockImplementation((key: string) =>
          key === 'JWT_SECRET' ? 'access-secret' : 'refresh-secret',
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: StudentService, useValue: studentService },
        { provide: TeacherService, useValue: teacherService },
        { provide: AdminService, useValue: adminService },
        { provide: JwtService, useValue: jwtService },
        { provide: RefreshTokenStore, useValue: tokenStore },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should return an access + refresh token pair for valid student credentials', async () => {
      (studentService.validateStudent as jest.Mock).mockResolvedValue(
        mockValidatedStudent,
      );

      const result = await service.login(
        mockValidatedStudent.email,
        'valid-password',
      );

      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'access' }),
        expect.any(Object),
      );
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'refresh' }),
        expect.any(Object),
      );
      expect(tokenStore.save).toHaveBeenCalledWith(
        expect.any(String),
        { userId: mockValidatedStudent.id, role: 'student' },
        expect.any(Number),
      );
      expect(result).toEqual({
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
        user: {
          id: mockValidatedStudent.id,
          email: mockValidatedStudent.email,
          role: 'student',
        },
      });
    });

    it('should return a teacher token pair when teacher credentials are valid', async () => {
      (studentService.validateStudent as jest.Mock).mockResolvedValue(null);
      (teacherService.validateTeacher as jest.Mock).mockResolvedValue(
        mockValidatedTeacher,
      );

      const result = await service.login(
        mockValidatedTeacher.email,
        'valid-password',
      );

      expect(result.user.role).toBe('teacher');
    });

    it('should return an admin token pair when admin credentials are valid', async () => {
      (studentService.validateStudent as jest.Mock).mockResolvedValue(null);
      (teacherService.validateTeacher as jest.Mock).mockResolvedValue(null);
      (adminService.validateAdmin as jest.Mock).mockResolvedValue(
        mockValidatedAdmin,
      );

      const result = await service.login(
        mockValidatedAdmin.email,
        'valid-password',
      );

      expect(result.user.role).toBe('admin');
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      (studentService.validateStudent as jest.Mock).mockResolvedValue(null);
      (teacherService.validateTeacher as jest.Mock).mockResolvedValue(null);
      (adminService.validateAdmin as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login('wrong@example.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should prioritize student login when the same email exists in multiple roles', async () => {
      (studentService.validateStudent as jest.Mock).mockResolvedValue(
        mockValidatedStudent,
      );
      (teacherService.validateTeacher as jest.Mock).mockResolvedValue(
        mockValidatedTeacher,
      );

      const result = await service.login(
        mockValidatedStudent.email,
        'any-password',
      );

      expect(teacherService.validateTeacher).not.toHaveBeenCalled();
      expect(result.user.role).toBe('student');
    });
  });

  describe('register', () => {
    const studentInput: CreateStudentDto = {
      firstName: 'Test',
      lastName: 'Student',
      email: 'student@example.com',
      phone: '+1234567890',
      dateOfBirth: '2000-01-01',
      gender: StudentGender.MALE,
      rollNumber: 'S001',
      registrationNumber: 'R001',
      department: 'CS',
      semester: 1,
      password: 'password123',
    };

    const teacherInput: CreateTeacherDto = {
      firstName: 'Test',
      lastName: 'Teacher',
      email: 'teacher@example.com',
      phone: '+1234567890',
      dateOfBirth: '1985-01-01',
      gender: TeacherGender.FEMALE,
      employeeId: 'T001',
      department: 'CS',
      designation: 'Professor',
      qualification: 'PhD',
      password: 'password123',
    };

    it('should create a student and issue tokens with role student', async () => {
      (studentService.create as jest.Mock).mockResolvedValue({
        message: 'Student created successfully',
        data: {
          id: '1',
          email: 'student@example.com',
          firstName: 'Test',
        },
      });

      const dto: RegisterDto = {
        role: 'student',
        student: studentInput,
      };

      const result = await service.register(dto);

      expect(studentService.create).toHaveBeenCalledWith(dto.student);
      expect(teacherService.create).not.toHaveBeenCalled();
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(result.user.role).toBe('student');
      expect(result.user.id).toBe('1');
    });

    it('should create a teacher account and issue tokens with role teacher', async () => {
      (teacherService.create as jest.Mock).mockResolvedValue({
        message: 'Teacher created successfully',
        data: {
          id: '2',
          email: 'teacher@example.com',
          employeeId: 'T001',
        },
      });

      const dto: RegisterDto = {
        role: 'teacher',
        teacher: teacherInput,
      };

      const result = await service.register(dto);

      expect(teacherService.create).toHaveBeenCalledWith(dto.teacher);
      expect(studentService.create).not.toHaveBeenCalled();
      expect(result.user.role).toBe('teacher');
      expect(result.user.id).toBe('2');
    });

    it('should propagate a ConflictException from the create service', async () => {
      (studentService.create as jest.Mock).mockRejectedValue(
        new ConflictException(
          'Student with this email or roll number already exists.',
        ),
      );

      const dto: RegisterDto = {
        role: 'student',
        student: studentInput,
      };

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('should rotate the refresh token and issue a new pair', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue(mockDecoded);
      (tokenStore.revoke as jest.Mock).mockReturnValue({ count: 1 });

      const result = await service.refresh('old-refresh-token');

      expect(tokenStore.revoke).toHaveBeenCalledWith('refresh-jti-1');
      expect(tokenStore.save).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ userId: '1', role: 'student' }),
        expect.any(Number),
      );
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw when the refresh token is invalid', async () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('bad token');
      });

      await expect(service.refresh('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw when the token is not a refresh token', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue({
        ...mockDecoded,
        type: 'access',
      });

      await expect(service.refresh('access-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw when the refresh token has already been revoked', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue(mockDecoded);
      (tokenStore.revoke as jest.Mock).mockReturnValue({ count: 0 });

      await expect(service.refresh('revoked-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(tokenStore.save).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should revoke the refresh token when provided', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue(mockDecoded);

      const result = await service.logout('refresh-token');

      expect(tokenStore.revoke).toHaveBeenCalledWith('refresh-jti-1');
      expect(result).toEqual({ message: 'Logout successful.' });
    });

    it('should blacklist the access token when provided', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue(mockDecoded);

      await service.logout(undefined, 'access-token');

      expect(tokenStore.blacklistAccessToken).toHaveBeenCalledWith(
        'refresh-jti-1',
        expect.any(Number),
      );
    });

    it('should ignore invalid tokens during logout', async () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('bad token');
      });

      const result = await service.logout('bad-token', 'bad-access-token');

      expect(tokenStore.revoke).not.toHaveBeenCalled();
      expect(tokenStore.blacklistAccessToken).not.toHaveBeenCalled();
      expect(result).toEqual({ message: 'Logout successful.' });
    });
  });
});
