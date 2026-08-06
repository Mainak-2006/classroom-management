import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: Partial<AuthService>;

  const mockAuthService = {
    login: jest.fn(),
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
});
