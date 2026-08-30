import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { JWT_CONSTANTS } from '../jwt.constants';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { RefreshTokenStore } from '../tokens/refresh-token-store.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(ConfigService) configService: ConfigService,
    private readonly tokenStore: RefreshTokenStore,
    private readonly prisma: PrismaService,
  ) {
    super({
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      issuer: JWT_CONSTANTS.ISSUER,
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    if (await this.tokenStore.isAccessTokenBlacklisted(payload.jti)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    if (!(await this.accountIsActive(payload))) {
      throw new UnauthorizedException('Account no longer active');
    }

    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      jti: payload.jti,
    };
  }

  private async accountIsActive(payload: JwtPayload): Promise<boolean> {
    const select = { isActive: true } as const;

    switch (payload.role) {
      case 'student': {
        const student = await this.prisma.student.findUnique({
          where: { id: payload.id },
          select,
        });
        return Boolean(student?.isActive);
      }
      case 'teacher': {
        const teacher = await this.prisma.teacher.findUnique({
          where: { id: payload.id },
          select,
        });
        return Boolean(teacher?.isActive);
      }
      case 'admin': {
        const admin = await this.prisma.admin.findUnique({
          where: { id: payload.id },
          select,
        });
        return Boolean(admin?.isActive);
      }
      default:
        return false;
    }
  }
}
