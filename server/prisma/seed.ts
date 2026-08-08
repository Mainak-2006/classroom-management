import * as bcrypt from 'bcryptjs';

import { prisma } from '../lib/prisma';
import { AdminRole, Gender } from '@prisma/client';

async function hashPassword(raw: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(raw, salt);
}

async function main() {
  const password = await hashPassword('password123');
  const adminPassword = await hashPassword('admin123');

  const admin = await prisma.admin.upsert({
    where: { email: 'admin@example.com' },
    update: { isActive: true },
    create: {
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@example.com',
      phone: '+10000000000',
      dateOfBirth: new Date('1990-01-01'),
      gender: Gender.MALE,
      department: 'Administration',
      role: AdminRole.ADMIN,
      password: adminPassword,
    },
  });

  const teacher = await prisma.teacher.upsert({
    where: { email: 'teacher@example.com' },
    update: { isActive: true },
    create: {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'teacher@example.com',
      phone: '+12025550145',
      dateOfBirth: new Date('1985-03-15'),
      gender: Gender.FEMALE,
      employeeId: 'T001',
      department: 'Computer Science',
      designation: 'Senior Lecturer',
      qualification: 'PhD in Computer Science',
      specialization: 'Software Engineering',
      officeRoom: 'B-204',
      password,
    },
  });

  const student = await prisma.student.upsert({
    where: { email: 'student@example.com' },
    update: { isActive: true },
    create: {
      firstName: 'John',
      lastName: 'Smith',
      email: 'student@example.com',
      phone: '+12025550147',
      dateOfBirth: new Date('2004-08-22'),
      gender: Gender.MALE,
      rollNumber: 'S001',
      registrationNumber: 'R001',
      department: 'Computer Science',
      semester: 1,
      section: 'A',
      address: '123 Campus Drive',
      guardianName: 'Mary Smith',
      guardianPhone: '+12025550148',
      password,
    },
  });

  const course = await prisma.course.upsert({
    where: { code: 'CS101' },
    update: {
      isActive: true,
      teacherId: teacher.id,
      students: { connect: { id: student.id } },
    },
    create: {
      name: 'Introduction to Programming',
      code: 'CS101',
      description:
        'Foundational programming course covering core computer science concepts.',
      department: 'Computer Science',
      semester: 1,
      credits: 4,
      teacherId: teacher.id,
      students: { connect: { id: student.id } },
    },
  });

  console.log('Seeded:');
  console.log(`  admin  : ${admin.email} (admin123)`);
  console.log(`  teacher: ${teacher.email} (password123)`);
  console.log(`  student: ${student.email} (password123)`);
  console.log(`  course : ${course.code} - ${course.name}`);
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());