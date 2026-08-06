import { Injectable, NotFoundException } from '@nestjs/common';

import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { CreateExamSubmissionDto } from './dto/create-exam-submission.dto';
import { UpdateExamSubmissionDto } from './dto/update-exam-submission.dto';
import { Exam, ExamStatus } from './entities/exam.entity';
import { ExamSubmission } from './entities/exam-submission.entity';
import { CourseService } from '../course/course.service';
import { StudentService } from '../student/student.service';

@Injectable()
export class ExamService {
  private exams: Exam[] = [];
  private submissions: ExamSubmission[] = [];

  constructor(
    private readonly courseService: CourseService,
    private readonly studentService: StudentService,
  ) {}

  create(createExamDto: CreateExamDto) {
    this.courseService.findOne(createExamDto.courseId);

    const exam: Exam = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 8),
      ...createExamDto,
      examDate: new Date(createExamDto.examDate),
      status: createExamDto.status ?? ExamStatus.DRAFT,
      isActive: createExamDto.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.exams.push(exam);

    return {
      message: 'Exam created successfully',
      data: exam,
    };
  }

  findAll() {
    return {
      total: this.exams.length,
      data: this.exams,
    };
  }

  findOne(id: string) {
    const exam = this.exams.find((exam) => exam.id === id);

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    return exam;
  }

  update(id: string, updateExamDto: UpdateExamDto) {
    const index = this.exams.findIndex((exam) => exam.id === id);

    if (index === -1) {
      throw new NotFoundException('Exam not found');
    }

    if (updateExamDto.courseId) {
      this.courseService.findOne(updateExamDto.courseId);
    }

    this.exams[index] = {
      ...this.exams[index],
      ...updateExamDto,
      examDate: updateExamDto.examDate
        ? new Date(updateExamDto.examDate)
        : this.exams[index].examDate,
      updatedAt: new Date(),
    };

    return {
      message: 'Exam updated successfully',
      data: this.exams[index],
    };
  }

  remove(id: string) {
    const index = this.exams.findIndex((exam) => exam.id === id);

    if (index === -1) {
      throw new NotFoundException('Exam not found');
    }

    const deletedExam = this.exams.splice(index, 1)[0];

    return {
      message: 'Exam deleted successfully',
      data: deletedExam,
    };
  }

  findByCourse(courseId: string) {
    this.courseService.findOne(courseId);

    const exams = this.exams.filter((exam) => exam.courseId === courseId);

    return {
      total: exams.length,
      data: exams,
    };
  }

  findByStatus(status: ExamStatus) {
    const exams = this.exams.filter((exam) => exam.status === status);

    return {
      total: exams.length,
      data: exams,
    };
  }

  submit(examId: string, createExamSubmissionDto: CreateExamSubmissionDto) {
    this.findOne(examId);
    this.studentService.findOne(createExamSubmissionDto.studentId);

    const submission: ExamSubmission = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 8),
      examId,
      ...createExamSubmissionDto,
      submittedAt: createExamSubmissionDto.submittedAt
        ? new Date(createExamSubmissionDto.submittedAt)
        : new Date(),
      createdAt: new Date(),
    };

    this.submissions.push(submission);

    return {
      message: 'Exam submitted successfully',
      data: submission,
    };
  }

  updateSubmission(
    id: string,
    updateExamSubmissionDto: UpdateExamSubmissionDto,
  ) {
    const index = this.submissions.findIndex(
      (submission) => submission.id === id,
    );

    if (index === -1) {
      throw new NotFoundException('Exam submission not found');
    }

    if (updateExamSubmissionDto.studentId) {
      this.studentService.findOne(updateExamSubmissionDto.studentId);
    }

    this.submissions[index] = {
      ...this.submissions[index],
      ...updateExamSubmissionDto,
      submittedAt: updateExamSubmissionDto.submittedAt
        ? new Date(updateExamSubmissionDto.submittedAt)
        : this.submissions[index].submittedAt,
    };

    return {
      message: 'Exam submission updated successfully',
      data: this.submissions[index],
    };
  }

  findByExam(examId: string) {
    this.findOne(examId);

    const submissions = this.submissions.filter(
      (submission) => submission.examId === examId,
    );

    return {
      total: submissions.length,
      data: submissions,
    };
  }

  findByStudent(studentId: string) {
    this.studentService.findOne(studentId);

    const submissions = this.submissions.filter(
      (submission) => submission.studentId === studentId,
    );

    return {
      total: submissions.length,
      data: submissions,
    };
  }
}
