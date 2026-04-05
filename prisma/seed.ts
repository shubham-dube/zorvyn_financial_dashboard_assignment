import { PrismaClient, Role, RecordType } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Create admin user
  console.log('[1/3] Creating demo users...');
  const adminPassword = await argon2.hash('Admin@123456', {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@financedashboard.com' },
    update: {},
    create: {
      email: 'admin@financedashboard.com',
      name: 'Admin User',
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });
  console.log(`  ✓ Admin: ${admin.email}`);

  // Create analyst user
  const analystPassword = await argon2.hash('Analyst@123456', {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const analyst = await prisma.user.upsert({
    where: { email: 'analyst@financedashboard.com' },
    update: {},
    create: {
      email: 'analyst@financedashboard.com',
      name: 'Analyst User',
      passwordHash: analystPassword,
      role: Role.ANALYST,
    },
  });
  console.log(`  ✓ Analyst: ${analyst.email}`);

  // Create viewer user
  const viewerPassword = await argon2.hash('Viewer@123456', {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@financedashboard.com' },
    update: {},
    create: {
      email: 'viewer@financedashboard.com',
      name: 'Viewer User',
      passwordHash: viewerPassword,
      role: Role.VIEWER,
    },
  });
  console.log(`  ✓ Viewer: ${viewer.email}\n`);

  // Create system categories
  console.log('[2/3] Creating system categories...');
  const incomeCategories = [
    'Salary',
    'Freelance',
    'Investment Returns',
    'Rental Income',
    'Bonus',
    'Other Income',
  ];

  const expenseCategories = [
    'Rent',
    'Utilities',
    'Groceries',
    'Transport',
    'Healthcare',
    'Entertainment',
    'Insurance',
    'Subscriptions',
    'Other Expense',
  ];

  for (const name of incomeCategories) {
    await prisma.category.upsert({
      where: { name_type: { name, type: RecordType.INCOME } },
      update: {},
      create: {
        name,
        type: RecordType.INCOME,
        isSystem: true,
      },
    });
    console.log(`  ✓ Income: ${name}`);
  }

  for (const name of expenseCategories) {
    await prisma.category.upsert({
      where: { name_type: { name, type: RecordType.EXPENSE } },
      update: {},
      create: {
        name,
        type: RecordType.EXPENSE,
        isSystem: true,
      },
    });
    console.log(`  ✓ Expense: ${name}`);
  }

  console.log(
    `\n  ✓ Created ${incomeCategories.length + expenseCategories.length} system categories\n`
  );

  // Create demo financial records
  console.log('[3/3] Creating demo financial records...');
  const salaryCategory = await prisma.category.findFirst({
    where: { name: 'Salary', type: RecordType.INCOME },
  });
  const rentCategory = await prisma.category.findFirst({
    where: { name: 'Rent', type: RecordType.EXPENSE },
  });
  const groceriesCategory = await prisma.category.findFirst({
    where: { name: 'Groceries', type: RecordType.EXPENSE },
  });

  if (salaryCategory && rentCategory && groceriesCategory) {
    await prisma.financialRecord.create({
      data: {
        amount: 5000,
        type: RecordType.INCOME,
        categoryId: salaryCategory.id,
        date: new Date('2024-01-15'),
        notes: 'January salary',
        createdById: analyst.id,
      },
    });

    await prisma.financialRecord.create({
      data: {
        amount: 1200,
        type: RecordType.EXPENSE,
        categoryId: rentCategory.id,
        date: new Date('2024-01-01'),
        notes: 'Monthly rent payment',
        createdById: analyst.id,
      },
    });

    await prisma.financialRecord.create({
      data: {
        amount: 450,
        type: RecordType.EXPENSE,
        categoryId: groceriesCategory.id,
        date: new Date('2024-01-10'),
        notes: 'Weekly groceries',
        createdById: analyst.id,
      },
    });

    console.log('  ✓ Created 3 demo financial records\n');
  }

  console.log('═══════════════════════════════════════');
  console.log('✅ Database seed completed successfully!');
  console.log('═══════════════════════════════════════\n');
  console.log('Demo Accounts:');
  console.log('  Admin:   admin@financedashboard.com / Admin@123456');
  console.log('  Analyst: analyst@financedashboard.com / Analyst@123456');
  console.log('  Viewer:  viewer@financedashboard.com / Viewer@123456\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
