import { forwardRef, Module } from '@nestjs/common';
import { CourseModule } from '../course/course.module';
import { StudentModule } from '../student/student.module';

import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  imports: [forwardRef(() => CourseModule), forwardRef(() => StudentModule)],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
