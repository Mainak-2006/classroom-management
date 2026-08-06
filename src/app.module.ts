import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TeacherModule } from './teacher/teacher.module';
import { StudentModule } from './student/student.module';
import { AuthModule } from './auth/auth.module';
import { CourseModule } from './course/course.module';
import { AdminModule } from './admin/admin.module';
import { AssignmentModule } from './assignment/assignment.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ExamModule } from './exam/exam.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TeacherModule,
    StudentModule,
    AuthModule,
    CourseModule,
    AdminModule,
    AssignmentModule,
    AttendanceModule,
    ExamModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
