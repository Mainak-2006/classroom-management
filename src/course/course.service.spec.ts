import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';

/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest matchers return any */
import { CourseService } from './course.service';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherService } from '../teacher/teacher.service';
import { StudentService } from '../student/student.service';

const mockCourse = {
  id: 'course-1',
  name: 'Introduction to Programming',
  code: 'CS101',
  description: 'Foundational course',
  department: 'Computer Science',
  semester: 1,
  credits: 4,
  isActive: true,
  teacherId: 'teacher-1',
  teacher: { id: 'teacher-1', email: 'teacher@example.com' },
  students: [{ id: 'student-1', email: 'student@example.com' }],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('CourseService', () => {
  let service: CourseService;
  let prisma: {
    course: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let teacherService: { findOne: jest.Mock };
  let studentService: { findOne: jest.Mock };

  beforeEach(async () => {
    prisma = {
      course: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    teacherService = { findOne: jest.fn() };
    studentService = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseService,
        { provide: PrismaService, useValue: prisma },
        { provide: TeacherService, useValue: teacherService },
        { provide: StudentService, useValue: studentService },
      ],
    }).compile();

    service = module.get<CourseService>(CourseService);
  });

  describe('create', () => {
    const dto = {
      name: 'Introduction to Programming',
      code: 'CS101',
      department: 'Computer Science',
      semester: 1,
      credits: 4,
      isActive: true,
      teacherId: 'teacher-1',
    };

    it('should throw ConflictException when the course code already exists', async () => {
      prisma.course.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(teacherService.findOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the assigned teacher does not exist', async () => {
      prisma.course.findFirst.mockResolvedValue(null);
      teacherService.findOne.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('should create the course and return an envelope', async () => {
      prisma.course.findFirst.mockResolvedValue(null);
      teacherService.findOne.mockResolvedValue({ id: 'teacher-1' });
      prisma.course.create.mockResolvedValue(mockCourse);

      const result = await service.create(dto);

      expect(prisma.course.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: dto.name,
          code: dto.code,
          isActive: true,
          teacherId: 'teacher-1',
        }),
        include: expect.anything(),
      });
      expect(result).toEqual({
        message: 'Course created successfully',
        data: mockCourse,
      });
    });
  });

  describe('findAll', () => {
    it('should return all courses with a total', async () => {
      prisma.course.findMany.mockResolvedValue([mockCourse]);

      const result = await service.findAll();

      expect(prisma.course.findMany).toHaveBeenCalledWith({
        include: expect.anything(),
      });
      expect(result).toEqual({ total: 1, data: [mockCourse] });
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when the course does not exist', async () => {
      prisma.course.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return the course when it exists', async () => {
      prisma.course.findUnique.mockResolvedValue(mockCourse);

      await expect(service.findOne('c-1')).resolves.toEqual(mockCourse);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when the course does not exist', async () => {
      prisma.course.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { name: 'New name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when the new code collides with another course', async () => {
      prisma.course.findUnique.mockResolvedValue({ id: 'c-1' });
      prisma.course.findFirst.mockResolvedValue({ id: 'c-2' });

      await expect(service.update('c-1', { code: 'CS101' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should update the course and return an envelope', async () => {
      prisma.course.findUnique.mockResolvedValue({ id: 'c-1' });
      prisma.course.findFirst.mockResolvedValue(null);
      prisma.course.update.mockResolvedValue(mockCourse);

      const result = await service.update('c-1', { name: 'Updated title' });

      expect(result).toEqual({
        message: 'Course updated successfully',
        data: mockCourse,
      });
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException when the course does not exist', async () => {
      prisma.course.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete the course and return an envelope', async () => {
      prisma.course.findUnique.mockResolvedValue({ id: 'c-1' });
      prisma.course.delete.mockResolvedValue(mockCourse);

      const result = await service.remove('c-1');

      expect(prisma.course.delete).toHaveBeenCalledWith({
        where: { id: 'c-1' },
      });
      expect(result).toEqual({
        message: 'Course deleted successfully',
        data: mockCourse,
      });
    });
  });

  describe('assignTeacherToCourse', () => {
    it('should throw NotFoundException when the course does not exist', async () => {
      prisma.course.findUnique.mockResolvedValue(null);

      await expect(
        service.assignTeacherToCourse('c-1', 'teacher-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when the teacher does not exist', async () => {
      prisma.course.findUnique.mockResolvedValue({ id: 'c-1' });
      teacherService.findOne.mockResolvedValue(null);

      await expect(
        service.assignTeacherToCourse('c-1', 'teacher-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should connect the teacher to the course', async () => {
      prisma.course.findUnique.mockResolvedValue({ id: 'c-1' });
      teacherService.findOne.mockResolvedValue({ id: 'teacher-1' });
      prisma.course.update.mockResolvedValue(mockCourse);

      const result = await service.assignTeacherToCourse('c-1', 'teacher-1');

      expect(prisma.course.update).toHaveBeenCalledWith({
        where: { id: 'c-1' },
        data: { teacher: { connect: { id: 'teacher-1' } } },
        include: expect.anything(),
      });
      expect(result).toEqual({
        message: 'Teacher assigned to course successfully',
        data: mockCourse,
      });
    });
  });

  describe('removeTeacherFromCourse', () => {
    it('should throw NotFoundException when the course does not exist', async () => {
      prisma.course.findUnique.mockResolvedValue(null);

      await expect(service.removeTeacherFromCourse('c-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should disconnect the teacher from the course', async () => {
      prisma.course.findUnique.mockResolvedValue({ id: 'c-1' });
      prisma.course.update.mockResolvedValue(mockCourse);

      await service.removeTeacherFromCourse('c-1');

      expect(prisma.course.update).toHaveBeenCalledWith({
        where: { id: 'c-1' },
        data: { teacher: { disconnect: true } },
        include: expect.anything(),
      });
    });
  });

  describe('addStudentToCourse', () => {
    it('should throw NotFoundException when the course does not exist', async () => {
      prisma.course.findUnique.mockResolvedValue(null);

      await expect(
        service.addStudentToCourse('c-1', 'student-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when the student does not exist', async () => {
      prisma.course.findUnique.mockResolvedValue({ id: 'c-1' });
      studentService.findOne.mockResolvedValue(null);

      await expect(
        service.addStudentToCourse('c-1', 'student-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when the student is already enrolled', async () => {
      prisma.course.findUnique
        .mockResolvedValueOnce({ id: 'c-1' })
        .mockResolvedValueOnce({
          students: [{ id: 'student-1' }],
        });
      studentService.findOne.mockResolvedValue({ id: 'student-1' });

      await expect(
        service.addStudentToCourse('c-1', 'student-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should connect a new student to the course', async () => {
      prisma.course.findUnique
        .mockResolvedValueOnce({ id: 'c-1' })
        .mockResolvedValueOnce({ students: [{ id: 'student-2' }] });
      studentService.findOne.mockResolvedValue({ id: 'student-1' });
      prisma.course.update.mockResolvedValue(mockCourse);

      const result = await service.addStudentToCourse('c-1', 'student-1');

      expect(prisma.course.update).toHaveBeenCalledWith({
        where: { id: 'c-1' },
        data: { students: { connect: { id: 'student-1' } } },
        include: expect.anything(),
      });
      expect(result.message).toBe('Student added to course successfully');
    });
  });

  describe('removeStudentFromCourse', () => {
    it('should throw NotFoundException when the course does not exist', async () => {
      prisma.course.findUnique.mockResolvedValue(null);

      await expect(
        service.removeStudentFromCourse('c-1', 'student-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when the student is not enrolled', async () => {
      prisma.course.findUnique
        .mockResolvedValueOnce({ id: 'c-1' })
        .mockResolvedValueOnce({ students: [] });

      await expect(
        service.removeStudentFromCourse('c-1', 'student-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should disconnect the enrolled student', async () => {
      prisma.course.findUnique
        .mockResolvedValueOnce({ id: 'c-1' })
        .mockResolvedValueOnce({ students: [{ id: 'student-1' }] });
      prisma.course.update.mockResolvedValue(mockCourse);

      await service.removeStudentFromCourse('c-1', 'student-1');

      expect(prisma.course.update).toHaveBeenCalledWith({
        where: { id: 'c-1' },
        data: { students: { disconnect: { id: 'student-1' } } },
        include: expect.anything(),
      });
    });
  });

  describe('getCourseTeacher', () => {
    it('should throw NotFoundException when the course does not exist', async () => {
      prisma.course.findUnique.mockResolvedValue(null);

      await expect(service.getCourseTeacher('c-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when no teacher is assigned', async () => {
      prisma.course.findUnique.mockResolvedValue({ teacher: null });

      await expect(service.getCourseTeacher('c-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return the assigned teacher', async () => {
      prisma.course.findUnique.mockResolvedValue({
        teacher: { id: 'teacher-1' },
      });

      await expect(service.getCourseTeacher('c-1')).resolves.toEqual({
        id: 'teacher-1',
      });
    });
  });

  describe('getCourseStudents', () => {
    it('should throw NotFoundException when the course does not exist', async () => {
      prisma.course.findUnique.mockResolvedValue(null);

      await expect(service.getCourseStudents('c-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return enrolled students with a total', async () => {
      prisma.course.findUnique.mockResolvedValue({
        students: [{ id: 'student-1' }, { id: 'student-2' }],
      });

      const result = await service.getCourseStudents('c-1');

      expect(result).toEqual({ total: 2, data: expect.any(Array) });
    });
  });

  describe('findBySemester', () => {
    it('should return courses matching the semester', async () => {
      prisma.course.findMany.mockResolvedValue([mockCourse]);

      const result = await service.findBySemester(1);

      expect(prisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { semester: 1 } }),
      );
      expect(result).toEqual({ total: 1, data: [mockCourse] });
    });
  });

  describe('findByDepartment', () => {
    it('should match the department case-insensitively', async () => {
      prisma.course.findMany.mockResolvedValue([mockCourse]);

      const result = await service.findByDepartment('computer science');

      expect(prisma.course.findMany).toHaveBeenCalledWith({
        where: {
          department: { equals: 'computer science', mode: 'insensitive' },
        },
        include: expect.anything(),
      });
      expect(result).toEqual({ total: 1, data: [mockCourse] });
    });
  });

  describe('createBulk', () => {
    it('should throw ConflictException when any code already exists', async () => {
      prisma.course.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createBulk([
          {
            name: 'Course A',
            code: 'CS101',
            department: 'Computer Science',
            semester: 1,
            credits: 3,
            isActive: true,
          },
        ]),
      ).rejects.toThrow(ConflictException);
    });

    it('should create multiple courses and return them', async () => {
      prisma.course.findFirst.mockResolvedValue(null);
      prisma.course.create.mockResolvedValue(mockCourse);

      const result = await service.createBulk([
        {
          name: 'Course A',
          code: 'CS101',
          department: 'Computer Science',
          semester: 1,
          credits: 3,
          isActive: true,
        },
        {
          name: 'Course B',
          code: 'CS102',
          department: 'Computer Science',
          semester: 1,
          credits: 3,
          isActive: true,
        },
      ]);

      expect(prisma.course.create).toHaveBeenCalledTimes(2);
      expect(result.data).toHaveLength(2);
    });
  });
});
