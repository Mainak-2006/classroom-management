import { forwardRef, Module } from '@nestjs/common';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';
import { AttendanceModule } from '../attendance/attendance.module';
import { CourseModule } from '../course/course.module';
import { ExamModule } from '../exam/exam.module';

@Module({
  imports: [
    forwardRef(() => AttendanceModule),
    forwardRef(() => CourseModule),
    forwardRef(() => ExamModule),
  ],
  controllers: [StudentController],
  providers: [StudentService],
  exports: [StudentService],
})
export class StudentModule {}
