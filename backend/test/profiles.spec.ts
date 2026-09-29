import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AppModule } from '../src/app.module.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { StudentsService } from '../src/modules/students/students.service.js';
import { RecruitersService } from '../src/modules/recruiters/recruiters.service.js';
import { CompaniesService } from '../src/modules/companies/companies.service.js';
import { SkillsService } from '../src/modules/skills/skills.service.js';

describe('CareerSync Phase 4 Profile & Company Suite', () => {
  let app: INestApplication;
  let authService: AuthService;
  let studentsService: StudentsService;
  let recruitersService: RecruitersService;
  let companiesService: CompaniesService;
  let skillsService: SkillsService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    authService = moduleFixture.get<AuthService>(AuthService);
    studentsService = moduleFixture.get<StudentsService>(StudentsService);
    recruitersService = moduleFixture.get<RecruitersService>(RecruitersService);
    companiesService = moduleFixture.get<CompaniesService>(CompaniesService);
    skillsService = moduleFixture.get<SkillsService>(SkillsService);

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Student Profile & Completion Score', () => {
    it('should create and retrieve student profile with calculated completion score', async () => {
      const email = `student.profile.${Date.now()}@careersync.local`;
      const auth = await authService.register({
        email,
        password: 'Password123!',
        role: Role.STUDENT,
        name: 'Jane Student',
      });

      const profile = await studentsService.getProfile(auth.user.id);
      expect(profile).toBeDefined();
      expect(profile.name).toBe('Jane Student');
      expect(profile.profileCompletion).toBeGreaterThan(0);

      const updated = await studentsService.updateProfile(auth.user.id, {
        college: 'Tech University',
        degree: 'Bachelor of Computer Science',
        department: 'Information Technology',
        graduationYear: 2027,
        cgpa: 9.2,
        bio: 'Enthusiastic developer.',
      });

      expect(updated.college).toBe('Tech University');
      expect(updated.degree).toBe('Bachelor of Computer Science');
      expect(updated.profileCompletion).toBeGreaterThan(profile.profileCompletion);
    });
  });

  describe('Skills System & Association', () => {
    it('should normalize skill names and associate skills with student', async () => {
      const normalized1 = skillsService.normalizeName('  react  ');
      const normalized2 = skillsService.normalizeName('REACT');
      expect(normalized1).toBe('React');
      expect(normalized2).toBe('React');

      const email = `student.skills.${Date.now()}@careersync.local`;
      const auth = await authService.register({
        email,
        password: 'Password123!',
        role: Role.STUDENT,
        name: 'Skills Student',
      });

      const addedSkill = await studentsService.addSkill(auth.user.id, {
        name: 'TypeScript',
      });

      expect(addedSkill).toBeDefined();
      expect(addedSkill.skill.name).toBe('TypeScript');

      const profile = await studentsService.getProfile(auth.user.id);
      expect(profile.skills.length).toBe(1);

      await studentsService.removeSkill(auth.user.id, addedSkill.skillId);
      const updatedProfile = await studentsService.getProfile(auth.user.id);
      expect(updatedProfile.skills.length).toBe(0);
    });
  });

  describe('Recruiter Profile & Company Ownership Security', () => {
    it('should manage recruiter profile and company ownership', async () => {
      const recruiter1Email = `recruiter1.${Date.now()}@careersync.local`;
      const recruiter2Email = `recruiter2.${Date.now()}@careersync.local`;

      const recruiter1 = await authService.register({
        email: recruiter1Email,
        password: 'Password123!',
        role: Role.RECRUITER,
        name: 'Recruiter One',
      });

      const recruiter2 = await authService.register({
        email: recruiter2Email,
        password: 'Password123!',
        role: Role.RECRUITER,
        name: 'Recruiter Two',
      });

      // Test recruiter profile & completion score
      const recProfile = await recruitersService.getProfile(recruiter1.user.id);
      expect(recProfile).toBeDefined();
      expect(recProfile.name).toBe('Recruiter One');

      const updatedRecProfile = await recruitersService.updateProfile(recruiter1.user.id, {
        designation: 'VP of Talent Acquisition',
        bio: 'Looking for top software engineering candidates.',
      });
      expect(updatedRecProfile.designation).toBe('VP of Talent Acquisition');
      expect(updatedRecProfile.profileCompletion).toBeGreaterThan(recProfile.profileCompletion);

      // Recruiter 1 creates company
      const company = await companiesService.create(recruiter1.user.id, {
        name: `Acme Corp ${Date.now()}`,
        website: 'https://acme.example.com',
        description: 'Innovating widgets.',
      });

      expect(company).toBeDefined();
      expect(company.name).toContain('Acme Corp');

      // Recruiter 1 can update company
      const updatedCompany = await companiesService.update(
        recruiter1.user.id,
        Role.RECRUITER,
        company.id,
        { description: 'Updated Acme widgets.' },
      );
      expect(updatedCompany.description).toBe('Updated Acme widgets.');

      // Recruiter 2 trying to update Recruiter 1 company must throw ForbiddenException
      await expect(
        companiesService.update(
          recruiter2.user.id,
          Role.RECRUITER,
          company.id,
          { description: 'Hacked description.' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
