import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AssignmentStatus, ExamStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContentLifecycleService implements OnModuleInit {
  private readonly logger = new Logger(ContentLifecycleService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.closeExpiredContent();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async sweepExpiredSessions() {
    const now = new Date();

    const [expiredSessions, revokedTokens] = await Promise.all([
      this.prisma.authSession.deleteMany({ where: { expiresAt: { lt: now } } }),
      this.prisma.revokedAccessToken.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
    ]);

    if (expiredSessions.count || revokedTokens.count) {
      this.logger.log(
        `Swept ${expiredSessions.count} expired session(s) and ${revokedTokens.count} revoked access token(s)`,
      );
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async closeExpiredContent() {
    const now = new Date();

    const closedAssignments = await this.prisma.assignment.updateMany({
      where: {
        status: AssignmentStatus.PUBLISHED,
        dueDate: { lte: now },
      },
      data: { status: AssignmentStatus.CLOSED },
    });

    const publishedExams = await this.prisma.exam.findMany({
      where: { status: ExamStatus.PUBLISHED },
      select: { id: true, examDate: true, duration: true },
    });
    const expiredExamIds = publishedExams
      .filter(
        (exam) =>
          exam.examDate.getTime() + exam.duration * 60_000 <= now.getTime(),
      )
      .map((exam) => exam.id);

    const closedExams = expiredExamIds.length
      ? await this.prisma.exam.updateMany({
          where: { id: { in: expiredExamIds }, status: ExamStatus.PUBLISHED },
          data: { status: ExamStatus.CLOSED },
        })
      : { count: 0 };

    if (closedAssignments.count || closedExams.count) {
      this.logger.log(
        `Closed ${closedAssignments.count} assignment(s) and ${closedExams.count} exam(s)`,
      );
    }
  }
}
