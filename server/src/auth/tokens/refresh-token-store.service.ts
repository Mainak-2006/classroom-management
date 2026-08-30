import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '../enums/role.enum';

@Injectable()
export class RefreshTokenStore {
  constructor(private readonly prisma: PrismaService) {}

  private hash(tokenId: string): string {
    return createHash('sha256').update(tokenId).digest('hex');
  }

  async save(
    tokenId: string,
    payload: { userId: string; role: UserRole },
    expiresAt: number,
  ): Promise<void> {
    await this.prisma.authSession.upsert({
      where: { id: this.hash(tokenId) },
      create: {
        id: this.hash(tokenId),
        userId: payload.userId,
        role: payload.role,
        expiresAt: new Date(expiresAt),
      },
      update: {
        userId: payload.userId,
        role: payload.role,
        expiresAt: new Date(expiresAt),
        revokedAt: null,
      },
    });
  }

  async isValid(tokenId: string): Promise<boolean> {
    const entry = await this.prisma.authSession.findUnique({
      where: { id: this.hash(tokenId) },
      select: { expiresAt: true, revokedAt: true },
    });
    return Boolean(entry && !entry.revokedAt && entry.expiresAt > new Date());
  }

  async revoke(tokenId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { id: this.hash(tokenId), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async blacklistAccessToken(
    tokenId: string,
    expiresAt: number,
  ): Promise<void> {
    await this.prisma.revokedAccessToken.upsert({
      where: { id: this.hash(tokenId) },
      create: { id: this.hash(tokenId), expiresAt: new Date(expiresAt) },
      update: { expiresAt: new Date(expiresAt) },
    });
  }

  async isAccessTokenBlacklisted(tokenId: string): Promise<boolean> {
    const entry = await this.prisma.revokedAccessToken.findUnique({
      where: { id: this.hash(tokenId) },
      select: { expiresAt: true },
    });
    return Boolean(entry && entry.expiresAt > new Date());
  }
}
