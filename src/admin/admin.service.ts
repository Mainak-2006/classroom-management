import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { AdminEntity } from './entities/admin.entity';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

type StoredAdmin = Omit<AdminEntity, 'dateOfBirth'> & {
  dateOfBirth: Date | string;
  confirmPassword?: string;
};

type SafeAdmin = Omit<StoredAdmin, 'password' | 'confirmPassword'>;

function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

@Injectable()
export class AdminService {
  private admin: StoredAdmin[] = [];

  async validateAdmin(
    email: string,
    password: string,
  ): Promise<SafeAdmin | null> {
    const admin = this.admin.find((a) => a.email === email);
    if (admin && (await bcrypt.compare(password, admin.password))) {
      return omit(admin, ['password', 'confirmPassword']);
    }
    return null;
  }

  async create(createAdminDto: CreateAdminDto) {
    const exists = this.admin.find(
      (admin) => admin.email === createAdminDto.email,
    );

    if (exists) {
      throw new ConflictException('Admin with this email already exists.');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createAdminDto.password, salt);

    const admin: StoredAdmin = {
      id: Date.now().toString(),
      ...createAdminDto,
      password: hashedPassword,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.admin.push(admin);

    return {
      message: 'Admin created successfully',
      data: omit(admin, ['password', 'confirmPassword']),
    };
  }

  findAll() {
    return {
      total: this.admin.length,
      data: this.admin.map((admin) =>
        omit(admin, ['password', 'confirmPassword']),
      ),
    };
  }

  findOne(id: string) {
    const admin = this.admin.find((a) => a.id === id);

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    return omit(admin, ['password', 'confirmPassword']);
  }

  async update(id: string, updateAdminDto: UpdateAdminDto) {
    const index = this.admin.findIndex((admin) => admin.id === id);

    if (index === -1) {
      throw new NotFoundException('Admin not found');
    }

    // If password is being updated, hash it
    if (updateAdminDto.password) {
      const salt = await bcrypt.genSalt(10);
      updateAdminDto.password = await bcrypt.hash(
        updateAdminDto.password,
        salt,
      );
    }

    this.admin[index] = {
      ...this.admin[index],
      ...updateAdminDto,
      password: updateAdminDto.password ?? this.admin[index].password,
      updatedAt: new Date(),
    };

    return {
      message: 'Admin updated successfully',
      data: omit(this.admin[index], ['password', 'confirmPassword']),
    };
  }

  remove(id: string) {
    const index = this.admin.findIndex((admin) => admin.id === id);

    if (index === -1) {
      throw new NotFoundException('Admin not found');
    }

    const deletedAdmin = this.admin.splice(index, 1);

    return {
      message: 'Admin deleted successfully',
      data: omit(deletedAdmin[0], ['password', 'confirmPassword']),
    };
  }

  async createBulk(admins: CreateAdminDto[]) {
    const createdAdmins: StoredAdmin[] = [];

    for (const admin of admins) {
      const exists = this.admin.find((a) => a.email === admin.email);

      if (exists) {
        continue;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(admin.password, salt);

      // Generate a more unique ID using timestamp + random to ensure uniqueness even in fast loops
      const uniqueId =
        Date.now().toString() + Math.random().toString(36).substring(2, 11);

      const newAdmin: StoredAdmin = {
        id: uniqueId,
        ...admin,
        password: hashedPassword,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.admin.push(newAdmin);
      createdAdmins.push(newAdmin);
    }

    return {
      message: `${createdAdmins.length} admins created successfully`,
      total: createdAdmins.length,
      data: createdAdmins.map((admin) =>
        omit(admin, ['password', 'confirmPassword']),
      ),
    };
  }
}
