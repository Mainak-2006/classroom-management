import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { JwtService } from '@nestjs/jwt';

import { randomUUID } from 'crypto';

import { StudentService } from '../student/student.service';
import { TeacherService } from '../teacher/teacher.service';
import { AdminService } from '../admin/admin.service';

import { UserRole } from './enums/role.enum';
import { JWT_CONSTANTS } from './jwt.constants';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { RefreshTokenStore } from './tokens/refresh-token-store.service';

interface AuthUser {
  id: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly studentService: StudentService,
    private readonly teacherService: TeacherService,
    private readonly adminService: AdminService,
    private readonly jwtService: JwtService,
    private readonly tokenStore: RefreshTokenStore,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const student = (await this.studentService.validateStudent(
      email,
      password,
    )) as AuthUser | null;

    if (student) {
      return this.issueTokens(student, 'student');
    }

    const teacher = (await this.teacherService.validateTeacher(
      email,
      password,
    )) as AuthUser | null;

    if (teacher) {
      return this.issueTokens(teacher, 'teacher');
    }

    const admin = (await this.adminService.validateAdmin(
      email,
      password,
    )) as AuthUser | null;

    if (admin) {
      return this.issueTokens(admin, 'admin');
    }

    throw new UnauthorizedException('Invalid email or password.');
  }

  refresh(refreshToken: string) {
    let payload: JwtPayload;

    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        issuer: JWT_CONSTANTS.ISSUER,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    if (!this.tokenStore.isValid(payload.jti)) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    // Rotate: revoke the old refresh token before issuing a new pair.
    this.tokenStore.revoke(payload.jti);

    return this.issueTokens(
      { id: payload.id, email: payload.email },
      payload.role,
    );
  }

  logout(refreshToken?: string, accessToken?: string) {
    if (refreshToken) {
      this.revokeRefreshToken(refreshToken);
    }

    if (accessToken) {
      this.blacklistAccessToken(accessToken);
    }

    return {
      message: 'Logout successful.',
    };
  }

  private issueTokens(user: AuthUser, role: UserRole) {
    const accessJti = randomUUID();

    const accessToken = this.jwtService.sign(
      {
        id: user.id,
        email: user.email,
        role,
        type: 'access',
        jti: accessJti,
      },
      {
        expiresIn: JWT_CONSTANTS.ACCESS_TOKEN_EXPIRES_IN,
      },
    );

    const refreshJti = randomUUID();

    const refreshToken = this.jwtService.sign(
      {
        id: user.id,
        email: user.email,
        role,
        type: 'refresh',
        jti: refreshJti,
      },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: JWT_CONSTANTS.REFRESH_TOKEN_EXPIRES_IN,
      },
    );

    const refreshPayload = this.jwtService.verify<JwtPayload>(refreshToken, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
    });

    this.tokenStore.save(
      refreshJti,
      { userId: user.id, role },
      refreshPayload.exp! * 1000,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role,
      },
    };
  }

  private revokeRefreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        issuer: JWT_CONSTANTS.ISSUER,
      });
      this.tokenStore.revoke(payload.jti);
    } catch {
      // Ignore invalid tokens; nothing to revoke.
    }
  }

  private blacklistAccessToken(accessToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(accessToken, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        issuer: JWT_CONSTANTS.ISSUER,
      });
      this.tokenStore.blacklistAccessToken(payload.jti, payload.exp! * 1000);
    } catch {
      // Ignore invalid tokens; nothing to blacklist.
    }
  }
}
