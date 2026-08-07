import { Test, TestingModule } from '@nestjs/testing';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { AttendanceService } from '../attendance/attendance.service';
import { CourseService } from '../course/course.service';
import { ExamService } from '../exam/exam.service';

describe('StudentController', () => {
  let controller: StudentController;
  let studentService: { findOne: jest.Mock };
  let attendanceService: { findByStudent: jest.Mock };
  let courseService: { findByStudent: jest.Mock };
  let examService: { findByStudent: jest.Mock };

  const currentUser = {
    id: 'student-1',
    email: 'student@example.com',
    role: 'student',
    jti: 'jti-1',
  };

  beforeEach(async () => {
    studentService = { findOne: jest.fn() };
    attendanceService = { findByStudent: jest.fn() };
    courseService = { findByStudent: jest.fn() };
    examService = { findByStudent: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentController],
      providers: [
        { provide: StudentService, useValue: studentService },
        { provide: AttendanceService, useValue: attendanceService },
        { provide: CourseService, useValue: courseService },
        { provide: ExamService, useValue: examService },
      ],
    }).compile();

    controller = module.get<StudentController>(StudentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('profile', () => {
    it('should return the full student profile for the current user', async () => {
      const profile = {
        id: 'student-1',
        email: 'student@example.com',
        firstName: 'Jane',
      };
      studentService.findOne.mockResolvedValue(profile);

      await expect(controller.profile(currentUser)).resolves.toEqual(profile);

      expect(studentService.findOne).toHaveBeenCalledWith('student-1');
    });
  });

  describe('myAttendance', () => {
    it('should delegate to attendance for the current user', async () => {
      attendanceService.findByStudent.mockResolvedValue({ data: [] });

      await controller.myAttendance(currentUser);

      expect(attendanceService.findByStudent).toHaveBeenCalledWith('student-1');
    });
  });

  describe('myCourses', () => {
    it('should delegate to the course service for the current user', async () => {
      courseService.findByStudent.mockResolvedValue({ data: [] });

      await controller.myCourses(currentUser);

      expect(courseService.findByStudent).toHaveBeenCalledWith('student-1');
    });
  });

  describe('myExams', () => {
    it('should delegate to the exam service for the current user', async () => {
      examService.findByStudent.mockResolvedValue({ data: [] });

      await controller.myExams(currentUser);

      expect(examService.findByStudent).toHaveBeenCalledWith('student-1');
    });
  });
});
