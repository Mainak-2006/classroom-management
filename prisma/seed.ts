import * as bcrypt from 'bcryptjs';

import { prisma } from '../lib/prisma';

async function main() {
  try {
    const adminPassword = await bcrypt.hash('admin123', 10);
    const teacherPassword = await bcrypt.hash('teacher123', 10);
    const studentPassword = await bcrypt.hash('student123', 10);

    const admin = await prisma.admin.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        firstName: 'System',
        lastName: 'Admin',
        email: 'admin@example.com',
        phone: '+10000000000',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'MALE',
        department: 'Administration',
        role: 'ADMIN',
        password: adminPassword,
      },
    });

    const teacher = await prisma.teacher.upsert({
      where: { email: 'jane.doe@example.com' },
      update: {},
      create: {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        phone: '+10000000001',
        dateOfBirth: new Date('1988-05-15'),
        gender: 'FEMALE',
        employeeId: 'TCH-001',
        department: 'Computer Science',
        designation: 'Assistant Professor',
        qualification: 'M.Sc. Computer Science',
        password: teacherPassword,
      },
    });

    const student = await prisma.student.upsert({
      where: { email: 'john.smith@example.com' },
      update: {},
      create: {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@example.com',
        phone: '+10000000002',
        dateOfBirth: new Date('2005-03-10'),
        gender: 'MALE',
        rollNumber: 'STU-001',
        registrationNumber: 'REG-2024-001',
        department: 'Computer Science',
        semester: 3,
        password: studentPassword,
      },
    });

    const course = await prisma.course.upsert({
      where: { code: 'CS-101' },
      update: {},
      create: {
        name: 'Introduction to Programming',
        code: 'CS-101',
        description: 'Foundations of programming with TypeScript',
        department: 'Computer Science',
        semester: 1,
        credits: 3,
        teacherId: teacher.id,
        students: { connect: { id: student.id } },
      },
    });

    console.log({
      admin: admin.email,
      teacher: teacher.email,
      student: student.email,
      course: course.code,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
