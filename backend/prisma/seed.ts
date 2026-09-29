import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding CareerSync database...');

  // 1. Create Skills
  const typescript = await prisma.skill.upsert({
    where: { name: 'TypeScript' },
    update: {},
    create: { name: 'TypeScript' },
  });

  const react = await prisma.skill.upsert({
    where: { name: 'React' },
    update: {},
    create: { name: 'React' },
  });

  const nestjs = await prisma.skill.upsert({
    where: { name: 'NestJS' },
    update: {},
    create: { name: 'NestJS' },
  });

  const postgresql = await prisma.skill.upsert({
    where: { name: 'PostgreSQL' },
    update: {},
    create: { name: 'PostgreSQL' },
  });

  console.log('Skills created: TypeScript, React, NestJS, PostgreSQL');

  // 2. Create Location
  const devLocation = await prisma.location.create({
    data: {
      address: '100 Innovation Way',
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      postalCode: '94105',
      latitude: 37.7749,
      longitude: -122.4194,
    },
  });

  // 3. Create Development Company
  const devCompany = await prisma.company.create({
    data: {
      name: 'TechSync Innovations',
      description: 'Building next-generation career platform solutions.',
      website: 'https://techsync.example.com',
      email: 'contact@techsync.example.com',
      phone: '+1-555-0199',
      locationId: devLocation.id,
    },
  });

  console.log(`Company created: ${devCompany.name}`);

  // 4. Create Student User & Profile
  const studentUser = await prisma.user.upsert({
    where: { email: 'student.dev@careersync.local' },
    update: {},
    create: {
      email: 'student.dev@careersync.local',
      passwordHash: '$2b$10$e8w6WzJjX.R3H1Z4rF7U1.7yN8v.Wz8Z9X0Y1Z2A3B4C5D6E7F8G9',
      role: Role.STUDENT,
      studentProfile: {
        create: {
          name: 'Alex Student',
          phone: '+1-555-0100',
          college: 'State University',
          department: 'Computer Science',
          graduationYear: 2026,
          bio: 'Passionate full-stack developer seeking software engineering internships.',
          locationId: devLocation.id,
          skills: {
            create: [
              { skillId: typescript.id },
              { skillId: react.id },
              { skillId: nestjs.id },
              { skillId: postgresql.id },
            ],
          },
        },
      },
    },
  });

  console.log(`Student user created: ${studentUser.email}`);

  // 5. Create Recruiter User & Profile
  const recruiterUser = await prisma.user.upsert({
    where: { email: 'recruiter.dev@careersync.local' },
    update: {},
    create: {
      email: 'recruiter.dev@careersync.local',
      passwordHash: '$2b$10$e8w6WzJjX.R3H1Z4rF7U1.7yN8v.Wz8Z9X0Y1Z2A3B4C5D6E7F8G9',
      role: Role.RECRUITER,
      recruiterProfile: {
        create: {
          name: 'Sarah Recruiter',
          phone: '+1-555-0200',
          designation: 'Senior Technical Talent Acquisition',
          companyId: devCompany.id,
        },
      },
    },
  });

  console.log(`Recruiter user created: ${recruiterUser.email}`);
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
