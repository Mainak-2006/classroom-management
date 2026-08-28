import { forwardRef, Module } from '@nestjs/common';
import { CourseModule } from '../course/course.module';

import { AssignmentController } from './assignment.controller';
import { AssignmentService } from './assignment.service';

@Module({
  imports: [forwardRef(() => CourseModule)],
  controllers: [AssignmentController],
  providers: [AssignmentService],
  exports: [AssignmentService],
})
export class AssignmentModule {}
