import { Injectable, NotFoundException } from '@nestjs/common';

import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { Assignment, AssignmentStatus } from './entities/assignment.entity';
import { CourseService } from '../course/course.service';

@Injectable()
export class AssignmentService {
  private assignments: Assignment[] = [];

  constructor(private readonly courseService: CourseService) {}

  create(createAssignmentDto: CreateAssignmentDto) {
    this.courseService.findOne(createAssignmentDto.courseId);

    const assignment: Assignment = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 8),
      ...createAssignmentDto,
      dueDate: new Date(createAssignmentDto.dueDate),
      status: createAssignmentDto.status ?? AssignmentStatus.DRAFT,
      isActive: createAssignmentDto.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.assignments.push(assignment);

    return {
      message: 'Assignment created successfully',
      data: assignment,
    };
  }

  findAll() {
    return {
      total: this.assignments.length,
      data: this.assignments,
    };
  }

  findOne(id: string) {
    const assignment = this.assignments.find(
      (assignment) => assignment.id === id,
    );

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    return assignment;
  }

  update(id: string, updateAssignmentDto: UpdateAssignmentDto) {
    const index = this.assignments.findIndex(
      (assignment) => assignment.id === id,
    );

    if (index === -1) {
      throw new NotFoundException('Assignment not found');
    }

    if (updateAssignmentDto.courseId) {
      this.courseService.findOne(updateAssignmentDto.courseId);
    }

    this.assignments[index] = {
      ...this.assignments[index],
      ...updateAssignmentDto,
      dueDate: updateAssignmentDto.dueDate
        ? new Date(updateAssignmentDto.dueDate)
        : this.assignments[index].dueDate,
      updatedAt: new Date(),
    };

    return {
      message: 'Assignment updated successfully',
      data: this.assignments[index],
    };
  }

  remove(id: string) {
    const index = this.assignments.findIndex(
      (assignment) => assignment.id === id,
    );

    if (index === -1) {
      throw new NotFoundException('Assignment not found');
    }

    const deletedAssignment = this.assignments.splice(index, 1)[0];

    return {
      message: 'Assignment deleted successfully',
      data: deletedAssignment,
    };
  }

  // Find assignments by course
  findByCourse(courseId: string) {
    this.courseService.findOne(courseId);

    const assignments = this.assignments.filter(
      (assignment) => assignment.courseId === courseId,
    );

    return {
      total: assignments.length,
      data: assignments,
    };
  }

  // Find assignments by status
  findByStatus(status: AssignmentStatus) {
    const assignments = this.assignments.filter(
      (assignment) => assignment.status === status,
    );

    return {
      total: assignments.length,
      data: assignments,
    };
  }
}
