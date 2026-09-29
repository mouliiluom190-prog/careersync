import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { RegisterDto } from '../src/modules/auth/dto/register.dto.js';
import { LoginDto } from '../src/modules/auth/dto/login.dto.js';

describe('CareerSync Phase 3 Auth & RBAC Suite', () => {
  let app: INestApplication;
  let authService: AuthService;
  let isDbConnected = false;

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
    const prisma = moduleFixture.get<PrismaService>(PrismaService);
    try {
      await prisma.$queryRaw`SELECT 1`;
      isDbConnected = true;
    } catch {
      isDbConnected = false;
    }

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Password Security & Hashing', () => {
    it('should hash passwords using Argon2', async () => {
      const password = 'TestPassword123!';
      const hash = await argon2.hash(password);

      expect(hash).toBeDefined();
      expect(hash).not.toEqual(password);
      expect(hash.startsWith('$argon2')).toBe(true);
    });
  });

  describe('Public Registration Security', () => {
    it('should prohibit public registration of ADMIN role', async () => {
      if (!isDbConnected) return;
      const adminDto: RegisterDto = {
        email: 'attacker.admin@example.com',
        password: 'SecurePassword123!',
        role: Role.ADMIN,
        name: 'Attacker Admin',
      };

      await expect(authService.register(adminDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should register a valid STUDENT user', async () => {
      if (!isDbConnected) return;
      const studentDto: RegisterDto = {
        email: `student.test.${Date.now()}@careersync.local`,
        password: 'Password123!',
        role: Role.STUDENT,
        name: 'Test Student',
        college: 'Engineering Institute',
        department: 'Computer Science',
      };

      const result = await authService.register(studentDto);

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(studentDto.email.toLowerCase());
      expect(result.user.role).toBe(Role.STUDENT);
      expect((result.user as any).passwordHash).toBeUndefined();
    });

    it('should register a valid RECRUITER user', async () => {
      if (!isDbConnected) return;
      const recruiterDto: RegisterDto = {
        email: `recruiter.test.${Date.now()}@careersync.local`,
        password: 'Password123!',
        role: Role.RECRUITER,
        name: 'Test Recruiter',
        designation: 'Tech Lead Recruiter',
      };

      const result = await authService.register(recruiterDto);

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.user.email).toBe(recruiterDto.email.toLowerCase());
      expect(result.user.role).toBe(Role.RECRUITER);
    });

    it('should reject duplicate email registration', async () => {
      if (!isDbConnected) return;
      const email = `dup.${Date.now()}@careersync.local`;
      const dto: RegisterDto = {
        email,
        password: 'Password123!',
        role: Role.STUDENT,
        name: 'First User',
      };

      await authService.register(dto);

      await expect(authService.register(dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('Authentication & Login', () => {
    it('should login with correct credentials', async () => {
      if (!isDbConnected) return;
      const email = `login.test.${Date.now()}@careersync.local`;
      const password = 'CorrectPassword123!';

      await authService.register({
        email,
        password,
        role: Role.STUDENT,
        name: 'Login User',
      });

      const loginDto: LoginDto = { email, password };
      const result = await authService.login(loginDto);

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe(email);
    });

    it('should reject login with wrong password with generic UnauthorizedException', async () => {
      if (!isDbConnected) return;
      const email = `wrongpass.${Date.now()}@careersync.local`;
      await authService.register({
        email,
        password: 'RightPassword123!',
        role: Role.STUDENT,
        name: 'Wrong Pass User',
      });

      const loginDto: LoginDto = { email, password: 'WrongPassword123!' };
      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject login for non-existent email with generic UnauthorizedException', async () => {
      if (!isDbConnected) return;
      const loginDto: LoginDto = {
        email: 'nobody.does.not.exist@careersync.local',
        password: 'Password123!',
      };

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('Token Refresh & Session Revocation', () => {
    it('should refresh tokens and rotate session', async () => {
      if (!isDbConnected) return;
      const email = `refresh.${Date.now()}@careersync.local`;
      const registered = await authService.register({
        email,
        password: 'Password123!',
        role: Role.STUDENT,
        name: 'Refresh User',
      });

      const refreshed = await authService.refreshTokens(
        registered.user.id,
        registered.refreshToken,
      );

      expect(refreshed).toBeDefined();
      expect(refreshed.accessToken).toBeDefined();
      expect(refreshed.refreshToken).toBeDefined();
      expect(refreshed.refreshToken).not.toEqual(registered.refreshToken);
    });

    it('should revoke session on logout', async () => {
      if (!isDbConnected) return;
      const email = `logout.${Date.now()}@careersync.local`;
      const registered = await authService.register({
        email,
        password: 'Password123!',
        role: Role.STUDENT,
        name: 'Logout User',
      });

      await authService.logout(registered.user.id);

      await expect(
        authService.refreshTokens(registered.user.id, registered.refreshToken),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Protected Endpoints & Current User', () => {
    it('should fetch current user profile without passwordHash', async () => {
      if (!isDbConnected) return;
      const email = `me.${Date.now()}@careersync.local`;
      const registered = await authService.register({
        email,
        password: 'Password123!',
        role: Role.STUDENT,
        name: 'Current User Test',
      });

      const currentUser = await authService.getCurrentUser(registered.user.id);
      expect(currentUser).toBeDefined();
      expect(currentUser.email).toBe(email);
      expect((currentUser as any).passwordHash).toBeUndefined();
      expect((currentUser as any).refreshTokenHash).toBeUndefined();
    });
  });
});
