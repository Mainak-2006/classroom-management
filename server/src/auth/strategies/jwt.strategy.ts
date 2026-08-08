import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { JWT_CONSTANTS } from '../jwt.constants';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { RefreshTokenStore } from '../tokens/refresh-token-store.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(ConfigService) configService: ConfigService,
    private readonly tokenStore: RefreshTokenStore,
  ) {
    super({
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      issuer: JWT_CONSTANTS.ISSUER,
    });
  }

  validate(payload: JwtPayload) {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    if (this.tokenStore.isAccessTokenBlacklisted(payload.jti)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      jti: payload.jti,
    };
  }
}
