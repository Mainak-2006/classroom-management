import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { TeacherModule } from './teacher/teacher.module';
import { StudentModule } from './student/student.module';
import { AuthModule } from './auth/auth.module';
import { CourseModule } from './course/course.module';
import { AdminModule } from './admin/admin.module';
import { AssignmentModule } from './assignment/assignment.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ExamModule } from './exam/exam.module';
import { LifecycleModule } from './lifecycle/lifecycle.module';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? '.env' : '.env.test',
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    TeacherModule,
    StudentModule,
    AuthModule,
    CourseModule,
    AdminModule,
    AssignmentModule,
    AttendanceModule,
    ExamModule,
    LifecycleModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
