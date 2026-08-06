import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { AssignmentStatus } from '@prisma/client';
import { CourseService } from '../course/course.service';

@Injectable()
export class AssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courseService: CourseService,
  ) {}

  async create(createAssignmentDto: CreateAssignmentDto) {
    await this.courseService.findOne(createAssignmentDto.courseId);

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

  async findAll() {
    const assignments = await this.prisma.assignment.findMany();

    return {
      total: assignments.length,
      data: assignments,
    };
  }

  async findOne(id: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    return assignment;
  }

  async update(id: string, updateAssignmentDto: UpdateAssignmentDto) {
    const existing = await this.prisma.assignment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Assignment not found');
    }

    if (updateAssignmentDto.courseId) {
      await this.courseService.findOne(updateAssignmentDto.courseId);
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

  async remove(id: string) {
    const existing = await this.prisma.assignment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Assignment not found');
    }

    const deletedAssignment = await this.prisma.assignment.delete({
      where: { id },
    });

    return {
      message: 'Assignment deleted successfully',
      data: deletedAssignment,
    };
  }

  // Find assignments by course
  async findByCourse(courseId: string) {
    await this.courseService.findOne(courseId);

    const assignments = await this.prisma.assignment.findMany({
      where: { courseId },
    });

    return {
      total: assignments.length,
      data: assignments,
    };
  }

  // Find assignments by status
  async findByStatus(status: AssignmentStatus) {
    const assignments = await this.prisma.assignment.findMany({
      where: { status },
    });

    return {
      total: assignments.length,
      data: assignments,
    };
  }
}
