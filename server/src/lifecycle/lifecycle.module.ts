import { Module } from '@nestjs/common';

import { ContentLifecycleService } from './content-lifecycle.service';

@Module({
  providers: [ContentLifecycleService],
})
export class LifecycleModule {}
