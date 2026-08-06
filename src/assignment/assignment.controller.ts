import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { AssignmentService } from './assignment.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { AssignmentStatus } from './entities/assignment.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@Controller('assignment')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Roles(Role.ADMIN, Role.TEACHER)
  @Post()
  create(@Body() createAssignmentDto: CreateAssignmentDto) {
    return this.assignmentService.create(createAssignmentDto);
  }

  @Get()
  findAll() {
    return this.assignmentService.findAll();
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAssignmentDto: UpdateAssignmentDto,
  ) {
    return this.assignmentService.update(id, updateAssignmentDto);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assignmentService.remove(id);
  }

  // Find assignments by course
  @Get('course/:courseId')
  findByCourse(@Param('courseId') courseId: string) {
    return this.assignmentService.findByCourse(courseId);
  }

  // Find assignments by status
  @Get('status/:status')
  findByStatus(@Param('status') status: AssignmentStatus) {
    return this.assignmentService.findByStatus(status);
  }

  // Get a single assignment by id (must be last to avoid shadowing other routes)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assignmentService.findOne(id);
  }
}
