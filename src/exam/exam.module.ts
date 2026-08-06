import { Module } from '@nestjs/common';
import { CourseModule } from '../course/course.module';
import { StudentModule } from '../student/student.module';

import { ExamController } from './exam.controller';
import { ExamService } from './exam.service';

@Module({
  imports: [CourseModule, StudentModule],
  controllers: [ExamController],
  providers: [ExamService],
  exports: [ExamService],
})
export class ExamModule {}
