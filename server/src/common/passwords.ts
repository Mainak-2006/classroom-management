import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

export const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
  return bcrypt.hash(password, salt);
}

export function assertPasswordsMatch(
  password: string,
  confirmPassword: string,
): void {
  if (confirmPassword !== password) {
    throw new BadRequestException('Passwords do not match');
  }
}
