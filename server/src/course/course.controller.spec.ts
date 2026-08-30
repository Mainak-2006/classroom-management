import { Test, TestingModule } from '@nestjs/testing';

import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

const validCourseDto: CreateCourseDto = {
  name: 'Introduction to Programming',
  code: 'CS101',
  department: 'Computer Science',
  semester: 1,
  credits: 4,
  isActive: true,
};

const requester: AuthenticatedUser = {
  id: 'teacher-1',
  email: 'teacher@example.com',
  role: 'teacher',
  jti: 'jti-1',
};

describe('CourseController', () => {
  let controller: CourseController;
  let courseService: {
    create: jest.Mock;
    createBulk: jest.Mock;
    findAll: jest.Mock;
    findAllForRequester: jest.Mock;
    findOne: jest.Mock;
    findOneForRequester: jest.Mock;
    findByTeacher: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    assignTeacherToCourse: jest.Mock;
    removeTeacherFromCourse: jest.Mock;
    addStudentToCourse: jest.Mock;
    removeStudentFromCourse: jest.Mock;
    getCourseTeacher: jest.Mock;
    getCourseStudents: jest.Mock;
    findBySemester: jest.Mock;
    findByDepartment: jest.Mock;
  };

  beforeEach(async () => {
    courseService = {
      create: jest.fn(),
      createBulk: jest.fn(),
      findAll: jest.fn(),
      findAllForRequester: jest.fn(),
      findOne: jest.fn(),
      findOneForRequester: jest.fn(),
      findByTeacher: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      assignTeacherToCourse: jest.fn(),
      removeTeacherFromCourse: jest.fn(),
      addStudentToCourse: jest.fn(),
      removeStudentFromCourse: jest.fn(),
      getCourseTeacher: jest.fn(),
      getCourseStudents: jest.fn(),
      findBySemester: jest.fn(),
      findByDepartment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseController],
      providers: [{ provide: CourseService, useValue: courseService }],
    }).compile();

    controller = module.get<CourseController>(CourseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('POST / should delegate to create', async () => {
    await controller.create(validCourseDto, requester);
    expect(courseService.create).toHaveBeenCalledWith(
      validCourseDto,
      requester,
    );
  });

  it('POST /bulk should delegate to createBulk', async () => {
    await controller.createBulk({ items: [validCourseDto] });
    expect(courseService.createBulk).toHaveBeenCalledWith([validCourseDto]);
  });

  it('GET / should delegate to findAllForRequester', async () => {
    await controller.findAll(requester, {});
    expect(courseService.findAllForRequester).toHaveBeenCalledWith(
      requester,
      {},
    );
  });

  it('GET /:id should delegate to findOneForRequester', async () => {
    await controller.findOne('course-1', requester);
    expect(courseService.findOneForRequester).toHaveBeenCalledWith(
      'course-1',
      requester,
    );
  });

  it('PATCH /:id should delegate to update', async () => {
    await controller.update('course-1', { name: 'Updated' }, requester);
    expect(courseService.update).toHaveBeenCalledWith(
      'course-1',
      { name: 'Updated' },
      requester,
    );
  });

  it('DELETE /:id should delegate to remove', async () => {
    await controller.remove('course-1', requester);
    expect(courseService.remove).toHaveBeenCalledWith('course-1', requester);
  });

  it('POST /:id/teacher/:teacherId should delegate to assignTeacherToCourse', async () => {
    await controller.assignTeacherToCourse('course-1', 'teacher-1', requester);
    expect(courseService.assignTeacherToCourse).toHaveBeenCalledWith(
      'course-1',
      'teacher-1',
      requester,
    );
  });

  it('DELETE /:id/teacher should delegate to removeTeacherFromCourse', async () => {
    await controller.removeTeacherFromCourse('course-1', requester);
    expect(courseService.removeTeacherFromCourse).toHaveBeenCalledWith(
      'course-1',
      requester,
    );
  });

  it('POST /:id/students/:studentId should delegate to addStudentToCourse', async () => {
    await controller.addStudentToCourse('course-1', 'student-1', requester);
    expect(courseService.addStudentToCourse).toHaveBeenCalledWith(
      'course-1',
      'student-1',
      requester,
    );
  });

  it('DELETE /:id/students/:studentId should delegate to removeStudentFromCourse', async () => {
    await controller.removeStudentFromCourse(
      'course-1',
      'student-1',
      requester,
    );
    expect(courseService.removeStudentFromCourse).toHaveBeenCalledWith(
      'course-1',
      'student-1',
      requester,
    );
  });

  it('GET /:id/students should delegate to getCourseStudents', async () => {
    await controller.getCourseStudents('course-1', requester);
    expect(courseService.getCourseStudents).toHaveBeenCalledWith(
      'course-1',
      requester,
    );
  });

  it('GET /:id/teacher should delegate to getCourseTeacher', async () => {
    await controller.getCourseTeacher('course-1', requester);
    expect(courseService.getCourseTeacher).toHaveBeenCalledWith(
      'course-1',
      requester,
    );
  });

  it('GET /semester/:semester should delegate to findBySemester with a number', async () => {
    await controller.findBySemester('1', requester);
    expect(courseService.findBySemester).toHaveBeenCalledWith(1, requester);
  });

  it('GET /department/:department should delegate to findByDepartment', async () => {
    await controller.findByDepartment('cs', requester);
    expect(courseService.findByDepartment).toHaveBeenCalledWith(
      'cs',
      requester,
    );
  });

  it('GET /teacher/:teacherId should delegate to findByTeacher', async () => {
    await controller.findByTeacher('teacher-1');
    expect(courseService.findByTeacher).toHaveBeenCalledWith('teacher-1');
  });
});
