import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { ExamStatus } from '@prisma/client';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { CreateExamSubmissionDto } from './dto/create-exam-submission.dto';
import { UpdateExamSubmissionDto } from './dto/update-exam-submission.dto';
import { CourseService } from '../course/course.service';
import { StudentService } from '../student/student.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../auth/enums/role.enum';

@Injectable()
export class ExamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courseService: CourseService,
    private readonly studentService: StudentService,
  ) {}

  async create(createExamDto: CreateExamDto, requester: AuthenticatedUser) {
    this.assertStatusCanBeManaged(createExamDto.status);
    await this.courseService.assertTeacherOwnsCourse(
      requester,
      createExamDto.courseId,
    );

    const exam = await this.prisma.exam.create({
      data: {
        title: createExamDto.title,
        description: createExamDto.description,
        courseId: createExamDto.courseId,
        examDate: new Date(createExamDto.examDate),
        duration: createExamDto.duration,
        totalMarks: createExamDto.totalMarks,
        instructions: createExamDto.instructions,
        status: createExamDto.status ?? ExamStatus.DRAFT,
        isActive: createExamDto.isActive ?? true,
      },
    });

    return {
      message: 'Exam created successfully',
      data: exam,
    };
  }

  async findAll(requester?: AuthenticatedUser) {
    if (requester?.role === Role.STUDENT)
      return this.findByStudent(requester.id, requester);
    if (requester?.role === Role.TEACHER) {
      const data = await this.prisma.exam.findMany({
        where: { course: { teacherId: requester.id } },
      });
      return { total: data.length, data };
    }
    const exams = await this.prisma.exam.findMany();

    return {
      total: exams.length,
      data: exams,
    };
  }

  async findOne(id: string, requester?: AuthenticatedUser) {
    const exam = await this.prisma.exam.findUnique({ where: { id } });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }
    if (requester) {
      await this.courseService.assertCanViewCourse(requester, exam.courseId);
      if (
        requester.role === Role.STUDENT &&
        (exam.status !== ExamStatus.PUBLISHED || !exam.isActive)
      ) {
        throw new NotFoundException('Exam not found');
      }
    }

    return exam;
  }

  async update(
    id: string,
    updateExamDto: UpdateExamDto,
    requester: AuthenticatedUser,
  ) {
    const existing = await this.prisma.exam.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Exam not found');
    }

    this.assertNotClosed(existing.status);
    this.assertStatusCanBeManaged(updateExamDto.status);

    if (updateExamDto.courseId) {
      await this.courseService.assertTeacherOwnsCourse(
        requester,
        updateExamDto.courseId,
      );
    } else {
      await this.courseService.assertTeacherOwnsCourse(
        requester,
        existing.courseId,
      );
    }

    const { examDate, ...rest } = updateExamDto;

    const data: Parameters<typeof this.prisma.exam.update>[0]['data'] = {
      ...rest,
    };

    if (examDate) {
      data.examDate = new Date(examDate);
    }

    const exam = await this.prisma.exam.update({ where: { id }, data });

    return {
      message: 'Exam updated successfully',
      data: exam,
    };
  }

  async remove(id: string, requester: AuthenticatedUser) {
    const existing = await this.prisma.exam.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Exam not found');
    }

    this.assertNotClosed(existing.status);

    await this.courseService.assertTeacherOwnsCourse(
      requester,
      existing.courseId,
    );

    const deletedExam = await this.prisma.exam.delete({ where: { id } });

    return {
      message: 'Exam deleted successfully',
      data: deletedExam,
    };
  }

  // Find exams by course
  async findByCourse(courseId: string, requester?: AuthenticatedUser) {
    if (requester)
      await this.courseService.assertCanViewCourse(requester, courseId);
    else await this.courseService.findOne(courseId);

    const exams = await this.prisma.exam.findMany({
      where:
        requester?.role === Role.STUDENT
          ? { courseId, status: ExamStatus.PUBLISHED, isActive: true }
          : { courseId },
    });

    return {
      total: exams.length,
      data: exams,
    };
  }

  // Find exams by status
  async findByStatus(status: ExamStatus, requester?: AuthenticatedUser) {
    if (requester && requester.role !== Role.ADMIN)
      throw new ForbiddenException(
        'Only administrators can search exams by status',
      );
    const exams = await this.prisma.exam.findMany({ where: { status } });

    return {
      total: exams.length,
      data: exams,
    };
  }

  async submit(
    examId: string,
    createExamSubmissionDto: CreateExamSubmissionDto,
    requester: AuthenticatedUser,
  ) {
    const exam = await this.findOne(examId);
    await this.courseService.assertTeacherOwnsCourse(requester, exam.courseId);
    await this.studentService.findOne(createExamSubmissionDto.studentId);
    await this.courseService.assertStudentEnrolled(
      exam.courseId,
      createExamSubmissionDto.studentId,
    );
    if (exam.status === ExamStatus.DRAFT || !exam.isActive) {
      throw new ConflictException('Draft or inactive exams cannot be graded');
    }
    if (createExamSubmissionDto.score > exam.totalMarks) {
      throw new ConflictException(`Score cannot exceed ${exam.totalMarks}`);
    }
    const duplicate = await this.prisma.examSubmission.findFirst({
      where: { examId, studentId: createExamSubmissionDto.studentId },
      select: { id: true },
    });
    if (duplicate)
      throw new ConflictException(
        'An exam submission already exists for this student',
      );

    const submission = await this.prisma.examSubmission.create({
      data: {
        examId,
        studentId: createExamSubmissionDto.studentId,
        score: createExamSubmissionDto.score,
        submittedAt: createExamSubmissionDto.submittedAt
          ? new Date(createExamSubmissionDto.submittedAt)
          : new Date(),
      },
    });

    return {
      message: 'Exam submitted successfully',
      data: submission,
    };
  }

  async updateSubmission(
    id: string,
    updateExamSubmissionDto: UpdateExamSubmissionDto,
    requester: AuthenticatedUser,
  ) {
    const existing = await this.prisma.examSubmission.findUnique({
      where: { id },
      include: { exam: true },
    });

    if (!existing) {
      throw new NotFoundException('Exam submission not found');
    }

    await this.courseService.assertTeacherOwnsCourse(
      requester,
      existing.exam.courseId,
    );

    if (existing.exam.status === ExamStatus.DRAFT || !existing.exam.isActive) {
      throw new ConflictException('Draft or inactive exams cannot be graded');
    }

    if (updateExamSubmissionDto.studentId) {
      await this.studentService.findOne(updateExamSubmissionDto.studentId);
      await this.courseService.assertStudentEnrolled(
        existing.exam.courseId,
        updateExamSubmissionDto.studentId,
      );
    }

    if (
      updateExamSubmissionDto.score !== undefined &&
      updateExamSubmissionDto.score > existing.exam.totalMarks
    ) {
      throw new ConflictException(
        `Score cannot exceed ${existing.exam.totalMarks}`,
      );
    }

    const { submittedAt, ...rest } = updateExamSubmissionDto;

    const data: Parameters<
      typeof this.prisma.examSubmission.update
    >[0]['data'] = { ...rest };

    if (submittedAt) {
      data.submittedAt = new Date(submittedAt);
    }

    const submission = await this.prisma.examSubmission.update({
      where: { id },
      data,
    });

    return {
      message: 'Exam submission updated successfully',
      data: submission,
    };
  }

  async findByExam(examId: string, requester?: AuthenticatedUser) {
    const exam = await this.findOne(examId);
    if (requester)
      await this.courseService.assertTeacherOwnsCourse(
        requester,
        exam.courseId,
      );

    const submissions = await this.prisma.examSubmission.findMany({
      where: { examId },
    });

    return {
      total: submissions.length,
      data: submissions,
    };
  }

  async findByStudent(studentId: string, requester?: AuthenticatedUser) {
    if (
      requester &&
      requester.role === Role.STUDENT &&
      requester.id !== studentId
    ) {
      throw new ForbiddenException('You can only view your own exam results');
    }
    await this.studentService.findOne(studentId);

    const submissions = await this.prisma.examSubmission.findMany({
      where:
        requester?.role === Role.STUDENT
          ? {
              studentId,
              exam: {
                status: { in: [ExamStatus.PUBLISHED, ExamStatus.CLOSED] },
                isActive: true,
              },
            }
          : { studentId },
      include: { exam: { include: { course: true } } },
    });

    return {
      total: submissions.length,
      data: submissions,
    };
  }

  private assertNotClosed(status: ExamStatus) {
    if (status === ExamStatus.CLOSED) {
      throw new ConflictException('Closed exams are read-only');
    }
  }

  private assertStatusCanBeManaged(status?: ExamStatus) {
    if (status === ExamStatus.CLOSED) {
      throw new ConflictException(
        'Exams close automatically after their duration',
      );
    }
  }
}
