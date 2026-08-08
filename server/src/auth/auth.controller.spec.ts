import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import {
  CreateStudentDto,
  Gender as StudentGender,
} from '../student/dto/create-student.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: Partial<AuthService>;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should delegate to authService.login', async () => {
      const args = { email: 'a@b.com', password: 'secret123' };
      (authService.login as jest.Mock).mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
      });

      const result = await controller.login(args);

      expect(authService.login).toHaveBeenCalledWith(args.email, args.password);
      expect(result).toEqual({ accessToken: 'at', refreshToken: 'rt' });
    });
  });

  describe('register', () => {
    it('should delegate the register DTO to the service', async () => {
      const student: CreateStudentDto = {
        firstName: 'Test',
        lastName: 'Student',
        email: 'a@b.com',
        phone: '+1234567890',
        dateOfBirth: '2000-01-01',
        gender: StudentGender.MALE,
        rollNumber: 'S001',
        registrationNumber: 'R001',
        department: 'CS',
        semester: 1,
        password: 'password123',
      };
      const args: RegisterDto = { role: 'student', student };
      (authService.register as jest.Mock).mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
        user: { id: '1', email: 'a@b.com', role: 'student' },
      });

      const result = await controller.register(args);

      expect(authService.register).toHaveBeenCalledWith(args);
      expect(result.user.role).toBe('student');
    });
  });

  describe('refresh', () => {
    it('should delegate the refresh token to the service', () => {
      const args = { refreshToken: 'rt' };
      (authService.refresh as jest.Mock).mockReturnValue({
        accessToken: 'new-at',
        refreshToken: 'new-rt',
      });

      const result = controller.refresh(args);

      expect(authService.refresh).toHaveBeenCalledWith('rt');
      expect(result.refreshToken).toBe('new-rt');
    });
  });

  describe('logout', () => {
    it('should delegate refresh and access tokens to the service', () => {
      (authService.logout as jest.Mock).mockReturnValue({
        message: 'Logout successful.',
      });

      const result = controller.logout({
        refreshToken: 'rt',
        accessToken: 'at',
      });

      expect(authService.logout).toHaveBeenCalledWith('rt', 'at');
      expect(result).toEqual({ message: 'Logout successful.' });
    });
  });

  describe('me', () => {
    it('should return the authenticated user', () => {
      const user: AuthenticatedUser = {
        id: '1',
        email: 'a@b.com',
        role: 'student',
        jti: 'jti',
      };

      const result = controller.me(user);

      expect(result).toEqual(user);
    });
  });
});
