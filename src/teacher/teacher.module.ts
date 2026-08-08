import { forwardRef, Module } from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { TeacherController } from './teacher.controller';
import { AttendanceModule } from '../attendance/attendance.module';
import { CourseModule } from '../course/course.module';

@Module({
  imports: [forwardRef(() => AttendanceModule), forwardRef(() => CourseModule)],
  controllers: [TeacherController],
  providers: [TeacherService],
  exports: [TeacherService],
})
export class TeacherModule {}
