import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { ExamStatus } from '@prisma/client';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { CreateExamSubmissionDto } from './dto/create-exam-submission.dto';
import { UpdateExamSubmissionDto } from './dto/update-exam-submission.dto';
import { CourseService } from '../course/course.service';
import { StudentService } from '../student/student.service';

@Injectable()
export class ExamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courseService: CourseService,
    private readonly studentService: StudentService,
  ) {}

  async create(createExamDto: CreateExamDto) {
    await this.courseService.findOne(createExamDto.courseId);

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

  async findAll() {
    const exams = await this.prisma.exam.findMany();

    return {
      total: exams.length,
      data: exams,
    };
  }

  async findOne(id: string) {
    const exam = await this.prisma.exam.findUnique({ where: { id } });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    return exam;
  }

  async update(id: string, updateExamDto: UpdateExamDto) {
    const existing = await this.prisma.exam.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Exam not found');
    }

    if (updateExamDto.courseId) {
      await this.courseService.findOne(updateExamDto.courseId);
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

  async remove(id: string) {
    const existing = await this.prisma.exam.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Exam not found');
    }

    const deletedExam = await this.prisma.exam.delete({ where: { id } });

    return {
      message: 'Exam deleted successfully',
      data: deletedExam,
    };
  }

  // Find exams by course
  async findByCourse(courseId: string) {
    await this.courseService.findOne(courseId);

    const exams = await this.prisma.exam.findMany({ where: { courseId } });

    return {
      total: exams.length,
      data: exams,
    };
  }

  // Find exams by status
  async findByStatus(status: ExamStatus) {
    const exams = await this.prisma.exam.findMany({ where: { status } });

    return {
      total: exams.length,
      data: exams,
    };
  }

  async submit(
    examId: string,
    createExamSubmissionDto: CreateExamSubmissionDto,
  ) {
    await this.findOne(examId);
    await this.studentService.findOne(createExamSubmissionDto.studentId);

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
  ) {
    const existing = await this.prisma.examSubmission.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Exam submission not found');
    }

    if (updateExamSubmissionDto.studentId) {
      await this.studentService.findOne(updateExamSubmissionDto.studentId);
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

  async findByExam(examId: string) {
    await this.findOne(examId);

    const submissions = await this.prisma.examSubmission.findMany({
      where: { examId },
    });

    return {
      total: submissions.length,
      data: submissions,
    };
  }

  async findByStudent(studentId: string) {
    await this.studentService.findOne(studentId);

    const submissions = await this.prisma.examSubmission.findMany({
      where: { studentId },
    });

    return {
      total: submissions.length,
      data: submissions,
    };
  }
}
