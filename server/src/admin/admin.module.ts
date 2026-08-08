import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { SeedService } from '../seed/seed.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, SeedService],
  exports: [AdminService],
})
export class AdminModule {}
