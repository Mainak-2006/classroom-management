import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly configService: ConfigService;

  constructor(configService: ConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString: configService.getOrThrow<string>('DATABASE_URL'),
      }),
    });
    this.configService = configService;
  }

  async onModuleInit() {
    const url = this.configService.get<string>('DATABASE_URL');
    let host = 'unknown';
    if (url) {
      try {
        host = new URL(url).host;
      } catch {
        host = 'invalid url';
      }
    }
    this.logger.log(`Connecting to database at ${host}`);
    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
