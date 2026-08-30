import { ConflictException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

type UniqueAccountDelegate = 'student' | 'teacher' | 'admin';

/**
 * Ensure an email is not already used by a sibling account type, and optionally
 * by another row within the same table (when ownId is provided).
 *
 * @param prisma  shared PrismaService
 * @param email   email to check
 * @param role    the role being created/updated (its table excludes ownId)
 * @param ownId   when set, excludes this id from the same-table lookup
 */
export async function assertEmailAvailableAcrossAccounts(
  prisma: PrismaService,
  email: string,
  role: UniqueAccountDelegate,
  ownId?: string,
): Promise<void> {
  const siblings = (['student', 'teacher', 'admin'] as const).filter(
    (r) => r !== role,
  );

  const results = await Promise.all(
    siblings.map((r) => hasAccountByEmail(prisma, r, email)),
  );

  if (results.some(Boolean)) {
    throw new ConflictException('An account with this email already exists.');
  }

  if (ownId) {
    const other = await findSibling(prisma, role, email, ownId);
    if (other) {
      throw new ConflictException('An account with this email already exists.');
    }
  }
}

async function hasAccountByEmail(
  prisma: PrismaService,
  role: UniqueAccountDelegate,
  email: string,
): Promise<boolean> {
  switch (role) {
    case 'student':
      return Boolean(
        await prisma.student?.findUnique({
          where: { email },
          select: { id: true },
        }),
      );
    case 'teacher':
      return Boolean(
        await prisma.teacher?.findUnique({
          where: { email },
          select: { id: true },
        }),
      );
    case 'admin':
      return Boolean(
        await prisma.admin?.findUnique({
          where: { email },
          select: { id: true },
        }),
      );
  }
}

async function findSibling(
  prisma: PrismaService,
  role: UniqueAccountDelegate,
  email: string,
  ownId: string,
): Promise<boolean> {
  switch (role) {
    case 'student':
      return Boolean(
        await prisma.student?.findFirst({
          where: { email, id: { not: ownId } },
          select: { id: true },
        }),
      );
    case 'teacher':
      return Boolean(
        await prisma.teacher?.findFirst({
          where: { email, id: { not: ownId } },
          select: { id: true },
        }),
      );
    case 'admin':
      return Boolean(
        await prisma.admin?.findFirst({
          where: { email, id: { not: ownId } },
          select: { id: true },
        }),
      );
  }
}
