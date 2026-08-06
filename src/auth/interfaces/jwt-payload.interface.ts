import { UserRole } from '../enums/role.enum';

export type TokenType = 'access' | 'refresh';

export interface JwtPayload {
  id: string;

  email: string;

  role: UserRole;

  type: TokenType;

  jti: string;

  iat?: number;

  exp?: number;
}
