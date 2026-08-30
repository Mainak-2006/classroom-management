import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { CreateAdminManyDto } from './dto/create-admin-many.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import type { PaginationQuery } from '../common/pagination';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() createAdminDto: CreateAdminDto) {
    return this.adminService.create(createAdminDto);
  }

  @Roles(Role.ADMIN)
  @Post('bulk')
  createBulk(@Body() dto: CreateAdminManyDto) {
    return this.adminService.createBulk(dto.items);
  }

  @Roles(Role.ADMIN)
  @Get('profile')
  profile(@CurrentUser() user: AuthenticatedUser) {
    return this.adminService.findOne(user.id);
  }

  @Roles(Role.ADMIN)
  @Get()
  findAll(@Query() query: PaginationQuery) {
    return this.adminService.findAll(query);
  }

  @Roles(Role.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAdminDto: UpdateAdminDto) {
    return this.adminService.update(id, updateAdminDto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adminService.remove(id);
  }
}
