import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { AssignmentStatus } from '@prisma/client';
import { CourseService } from '../course/course.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../auth/enums/role.enum';
import { CreateAssignmentSubmissionDto } from './dto/create-assignment-submission.dto';
import { GradeAssignmentSubmissionDto } from './dto/grade-assignment-submission.dto';

@Injectable()
export class AssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courseService: CourseService,
  ) {}

  async create(
    createAssignmentDto: CreateAssignmentDto,
    requester: AuthenticatedUser,
  ) {
    this.assertStatusCanBeManaged(createAssignmentDto.status);
    await this.courseService.assertTeacherOwnsCourse(
      requester,
      createAssignmentDto.courseId,
    );

    const assignment = await this.prisma.assignment.create({
      data: {
        title: createAssignmentDto.title,
        description: createAssignmentDto.description,
        courseId: createAssignmentDto.courseId,
        dueDate: new Date(createAssignmentDto.dueDate),
        totalMarks: createAssignmentDto.totalMarks,
        instructions: createAssignmentDto.instructions,
        status: createAssignmentDto.status ?? AssignmentStatus.DRAFT,
        isActive: createAssignmentDto.isActive ?? true,
      },
    });

    return {
      message: 'Assignment created successfully',
      data: assignment,
    };
  }

  async findAll(requester?: AuthenticatedUser) {
    if (requester && requester.role === Role.STUDENT) return this.findByStudent(requester.id);
    if (requester && requester.role === Role.TEACHER) {
      return this.prisma.assignment.findMany({ where: { course: { teacherId: requester.id } } }).then((data) => ({ total: data.length, data }));
    }
    const assignments = await this.prisma.assignment.findMany();

    return {
      total: assignments.length,
      data: assignments,
    };
  }

  async findOne(id: string, requester?: AuthenticatedUser) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (requester) {
      await this.assertCanViewAssignment(assignment, requester);
    }

    return assignment;
  }

  async update(
    id: string,
    updateAssignmentDto: UpdateAssignmentDto,
    requester: AuthenticatedUser,
  ) {
    const existing = await this.prisma.assignment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Assignment not found');
    }

    this.assertNotClosed(existing.status);
    this.assertStatusCanBeManaged(updateAssignmentDto.status);

    if (updateAssignmentDto.courseId) {
      await this.courseService.assertTeacherOwnsCourse(
        requester,
        updateAssignmentDto.courseId,
      );
    } else {
      await this.courseService.assertTeacherOwnsCourse(
        requester,
        existing.courseId,
      );
    }

    const { dueDate, ...rest } = updateAssignmentDto;

    const data: Parameters<typeof this.prisma.assignment.update>[0]['data'] = {
      ...rest,
    };

    if (dueDate) {
      data.dueDate = new Date(dueDate);
    }

    const assignment = await this.prisma.assignment.update({
      where: { id },
      data,
    });

    return {
      message: 'Assignment updated successfully',
      data: assignment,
    };
  }

  async remove(id: string, requester: AuthenticatedUser) {
    const existing = await this.prisma.assignment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Assignment not found');
    }

    this.assertNotClosed(existing.status);

    await this.courseService.assertTeacherOwnsCourse(
      requester,
      existing.courseId,
    );

    const deletedAssignment = await this.prisma.assignment.delete({
      where: { id },
    });

    return {
      message: 'Assignment deleted successfully',
      data: deletedAssignment,
    };
  }

  // Find assignments by course
  async findByCourse(courseId: string, requester?: AuthenticatedUser) {
    if (requester) await this.courseService.assertCanViewCourse(requester, courseId);
    else await this.courseService.findOne(courseId);

    const assignments = await this.prisma.assignment.findMany({
      where: requester?.role === Role.STUDENT
        ? { courseId, status: AssignmentStatus.PUBLISHED, isActive: true }
        : { courseId },
    });

    return {
      total: assignments.length,
      data: assignments,
    };
  }

  // Find assignments by status
  async findByStatus(status: AssignmentStatus, requester?: AuthenticatedUser) {
    if (requester && requester.role !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can search assignments by status');
    }
    const assignments = await this.prisma.assignment.findMany({
      where: { status },
    });

    return {
      total: assignments.length,
      data: assignments,
    };
  }

  // Find assignments for a student (enrolled courses)
  async findByStudent(studentId: string, requester?: AuthenticatedUser) {
    if (requester && requester.role === Role.STUDENT && requester.id !== studentId) {
      throw new ForbiddenException('You can only view your own assignments');
    }
    // Get student's enrolled course IDs
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { courses: { select: { id: true } } },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const courseIds = student.courses.map((c) => c.id);

    if (courseIds.length === 0) {
      return { total: 0, data: [] };
    }

    const assignments = await this.prisma.assignment.findMany({
      where: {
        courseId: { in: courseIds },
        status: AssignmentStatus.PUBLISHED,
        isActive: true,
      },
      include: {
        course: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return {
      total: assignments.length,
      data: assignments,
    };
  }

  async submit(
    assignmentId: string,
    dto: CreateAssignmentSubmissionDto,
    requester: AuthenticatedUser,
  ) {
    if (requester.role !== Role.STUDENT) {
      throw new ForbiddenException('Only students can submit assignments');
    }
    const assignment = await this.findOne(assignmentId);
    await this.courseService.assertStudentEnrolled(assignment.courseId, requester.id);
    if (assignment.status !== AssignmentStatus.PUBLISHED || !assignment.isActive || assignment.dueDate <= new Date()) {
      throw new ConflictException('This assignment is not accepting submissions');
    }
    const existing = await this.prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId: requester.id } },
    });
    const submission = existing
      ? await this.prisma.assignmentSubmission.update({
          where: { id: existing.id },
          data: { response: dto.response, submittedAt: new Date() },
        })
      : await this.prisma.assignmentSubmission.create({
          data: { assignmentId, studentId: requester.id, response: dto.response },
        });
    return { message: existing ? 'Assignment submission updated successfully' : 'Assignment submitted successfully', data: submission };
  }

  async findSubmissions(assignmentId: string, requester: AuthenticatedUser) {
    const assignment = await this.findOne(assignmentId);
    await this.courseService.assertTeacherOwnsCourse(requester, assignment.courseId);
    const data = await this.prisma.assignmentSubmission.findMany({
      where: { assignmentId },
      include: { student: { select: { id: true, firstName: true, lastName: true, rollNumber: true } } },
      orderBy: { submittedAt: 'desc' },
    });
    return { total: data.length, data };
  }

  async gradeSubmission(id: string, dto: GradeAssignmentSubmissionDto, requester: AuthenticatedUser) {
    const existing = await this.prisma.assignmentSubmission.findUnique({
      where: { id }, include: { assignment: true },
    });
    if (!existing) throw new NotFoundException('Assignment submission not found');
    await this.courseService.assertTeacherOwnsCourse(requester, existing.assignment.courseId);
    if (dto.score !== undefined && dto.score > existing.assignment.totalMarks) {
      throw new ConflictException(`Score cannot exceed ${existing.assignment.totalMarks}`);
    }
    const data = await this.prisma.assignmentSubmission.update({
      where: { id }, data: { feedback: dto.feedback, score: dto.score, gradedAt: dto.score !== undefined ? new Date() : undefined },
    });
    return { message: 'Assignment submission graded successfully', data };
  }

  async findMySubmission(assignmentId: string, requester: AuthenticatedUser) {
    if (requester.role !== Role.STUDENT) throw new ForbiddenException('Only students can view their own submission');
    await this.findOne(assignmentId, requester);
    const data = await this.prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId: requester.id } },
    });
    if (!data) throw new NotFoundException('Assignment submission not found');
    return data;
  }

  private async assertCanViewAssignment(
    assignment: { courseId: string; status: AssignmentStatus; isActive: boolean },
    requester: AuthenticatedUser,
  ) {
    await this.courseService.assertCanViewCourse(requester, assignment.courseId);
    if (requester.role === Role.STUDENT && (assignment.status !== AssignmentStatus.PUBLISHED || !assignment.isActive)) {
      throw new NotFoundException('Assignment not found');
    }
  }

  private assertNotClosed(status: AssignmentStatus) {
    if (status === AssignmentStatus.CLOSED) {
      throw new ConflictException('Closed assignments are read-only');
    }
  }

  private assertStatusCanBeManaged(status?: AssignmentStatus) {
    if (status === AssignmentStatus.CLOSED) {
      throw new ConflictException('Assignments close automatically at their due date');
    }
  }
}
