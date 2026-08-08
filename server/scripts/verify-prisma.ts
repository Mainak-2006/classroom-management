import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '@prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const counts = {
    admin: await prisma.admin.count(),
    teacher: await prisma.teacher.count(),
    student: await prisma.student.count(),
    course: await prisma.course.count(),
    attendance: await prisma.attendance.count(),
    assignment: await prisma.assignment.count(),
    exam: await prisma.exam.count(),
    examSubmission: await prisma.examSubmission.count(),
  };

  console.log(`✅ Connected — ${JSON.stringify(counts)}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
