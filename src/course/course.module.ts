import { forwardRef, Module } from '@nestjs/common';
import { TeacherModule } from '../teacher/teacher.module';
import { StudentModule } from '../student/student.module';

import { CourseController } from './course.controller';
import { CourseService } from './course.service';

@Module({
  imports: [forwardRef(() => TeacherModule), forwardRef(() => StudentModule)],
  controllers: [CourseController],
  providers: [CourseService],
  exports: [CourseService],
})
export class CourseModule {}
