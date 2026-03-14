import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@ccs.edu' },
    update: {},
    create: {
      email: 'admin@ccs.edu',
      password: hashedPassword,
      name: 'System Admin',
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: 'faculty@ccs.edu' },
    update: {},
    create: {
      email: 'faculty@ccs.edu',
      password: hashedPassword,
      name: 'John Faculty',
      role: 'FACULTY',
    },
  });

  await prisma.user.upsert({
    where: { email: 'officer@ccs.edu' },
    update: {},
    create: {
      email: 'officer@ccs.edu',
      password: hashedPassword,
      name: 'Jane Officer',
      role: 'OFFICER',
    },
  });

  await prisma.user.upsert({
    where: { email: 'student@ccs.edu' },
    update: {},
    create: {
      email: 'student@ccs.edu',
      password: hashedPassword,
      name: 'Alex Student',
      role: 'STUDENT',
    },
  });

  console.log('✓ Seed data created. Test credentials:');
  console.log('  Admin:   admin@ccs.edu / admin123');
  console.log('  Faculty: faculty@ccs.edu / admin123');
  console.log('  Officer: officer@ccs.edu / admin123');
  console.log('  Student: student@ccs.edu / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
