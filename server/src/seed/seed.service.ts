import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AdminService } from '../admin/admin.service';
import { CreateAdminDto, AdminRole } from '../admin/dto/create-admin.dto';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    const explicitSetting =
      this.configService.get<string>('SEED_DEFAULT_ADMIN');

    // In production the default admin is only created when explicitly enabled.
    if (explicitSetting === 'false' || (isProduction && !explicitSetting)) {
      this.logger.log('Default admin seeding disabled.');
      return;
    }

    const email =
      this.configService.get<string>('SEED_ADMIN_EMAIL') ?? 'admin@example.com';

    const password =
      this.configService.get<string>('SEED_ADMIN_PASSWORD') ?? 'admin123';

    const { data } = await this.adminService.findAll();

    const existing = data.some((admin) => admin.email === email);

    if (existing) {
      this.logger.log('Default admin already exists, skipping seed.');
      return;
    }

    const createAdminDto: CreateAdminDto = {
      firstName: 'System',
      middleName: undefined,
      lastName: 'Admin',
      email,
      phone: '+10000000000',
      dateOfBirth: '1990-01-01',
      gender: 'MALE',
      department: 'Administration',
      role: AdminRole.ADMIN,
      profileImage: undefined,
      password,
      confirmPassword: password,
    } as CreateAdminDto;

    await this.adminService.create(createAdminDto);

    this.logger.log('Default admin seeded.');
  }
}
