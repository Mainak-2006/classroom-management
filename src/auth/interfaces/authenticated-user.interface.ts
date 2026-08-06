import { UserRole } from '../enums/role.enum';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  jti: string;
}

export interface AuthenticatedRequest {
  user?: AuthenticatedUser;
}
