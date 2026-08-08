import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

import { UserRole } from '../enums/role.enum';

interface StoredToken {
  userId: string;
  role: UserRole;
  expiresAt: number;
}

@Injectable()
export class RefreshTokenStore {
  private readonly refreshTokens = new Map<string, StoredToken>();
  private readonly accessTokenBlacklist = new Map<string, number>();

  private hash(tokenId: string): string {
    return createHash('sha256').update(tokenId).digest('hex');
  }

  save(
    tokenId: string,
    payload: { userId: string; role: UserRole },
    expiresAt: number,
  ): void {
    this.cleanupExpired();
    this.refreshTokens.set(this.hash(tokenId), {
      userId: payload.userId,
      role: payload.role,
      expiresAt,
    });
  }

  isValid(tokenId: string): boolean {
    const entry = this.refreshTokens.get(this.hash(tokenId));
    if (!entry) {
      return false;
    }
    if (Date.now() > entry.expiresAt) {
      this.refreshTokens.delete(this.hash(tokenId));
      return false;
    }
    return true;
  }

  revoke(tokenId: string): void {
    this.refreshTokens.delete(this.hash(tokenId));
  }

  revokeAllForUser(userId: string): void {
    for (const [hash, entry] of this.refreshTokens.entries()) {
      if (entry.userId === userId) {
        this.refreshTokens.delete(hash);
      }
    }
  }

  blacklistAccessToken(tokenId: string, expiresAt: number): void {
    this.accessTokenBlacklist.set(this.hash(tokenId), expiresAt);
  }

  isAccessTokenBlacklisted(tokenId: string): boolean {
    const expiresAt = this.accessTokenBlacklist.get(this.hash(tokenId));
    if (!expiresAt) {
      return false;
    }
    if (Date.now() > expiresAt) {
      this.accessTokenBlacklist.delete(this.hash(tokenId));
      return false;
    }
    return true;
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [hash, entry] of this.refreshTokens.entries()) {
      if (now > entry.expiresAt) {
        this.refreshTokens.delete(hash);
      }
    }
    for (const [hash, expiresAt] of this.accessTokenBlacklist.entries()) {
      if (now > expiresAt) {
        this.accessTokenBlacklist.delete(hash);
      }
    }
  }
}
