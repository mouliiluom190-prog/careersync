import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { RegisterDto } from '../src/modules/auth/dto/register.dto.js';
import { LoginDto } from '../src/modules/auth/dto/login.dto.js';

describe('CareerSync Phase 3 Auth & RBAC Suite', () => {
  let app: INestApplication;
  let authService: AuthService;

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

      const isValid = await argon2.verify(hash, password);
      expect(isValid).toBe(true);
    });
  });

  describe('Public Registration Security', () => {
    it('should prohibit public registration of ADMIN role', async () => {
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
      const email = `duplicate.${Date.now()}@careersync.local`;
      const dto: RegisterDto = {
        email,
        password: 'Password123!',
        role: Role.STUDENT,
        name: 'Duplicate User',
      };

      await authService.register(dto);
      await expect(authService.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('Authentication & Login', () => {
    const email = `login.test.${Date.now()}@careersync.local`;
    const password = 'Password123!';

    beforeAll(async () => {
      await authService.register({
        email,
        password,
        role: Role.STUDENT,
        name: 'Login Test User',
      });
    });

    it('should login with correct credentials', async () => {
      const loginDto: LoginDto = { email, password };
      const response = await authService.login(loginDto);

      expect(response).toBeDefined();
      expect(response.accessToken).toBeDefined();
      expect(response.refreshToken).toBeDefined();
      expect(response.user.email).toBe(email);
    });

    it('should reject login with wrong password with generic UnauthorizedException', async () => {
      const loginDto: LoginDto = { email, password: 'WrongPassword123!' };
      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject login for non-existent email with generic UnauthorizedException', async () => {
      const loginDto: LoginDto = {
        email: 'nonexistent.user@careersync.local',
        password,
      };
      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('Token Refresh & Session Revocation', () => {
    it('should refresh tokens and rotate session', async () => {
      const email = `refresh.test.${Date.now()}@careersync.local`;
      const registerRes = await authService.register({
        email,
        password: 'Password123!',
        role: Role.STUDENT,
        name: 'Refresh Test User',
      });

      const refreshRes = await authService.refresh(registerRes.refreshToken!);
      expect(refreshRes).toBeDefined();
      expect(refreshRes.accessToken).toBeDefined();
      expect(refreshRes.refreshToken).toBeDefined();
      expect(refreshRes.accessToken).not.toEqual(registerRes.accessToken);

      // Old refresh token should now be revoked
      await expect(
        authService.refresh(registerRes.refreshToken!),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should revoke session on logout', async () => {
      const email = `logout.test.${Date.now()}@careersync.local`;
      const authRes = await authService.register({
        email,
        password: 'Password123!',
        role: Role.STUDENT,
        name: 'Logout Test User',
      });

      await authService.logout(authRes.user.id, authRes.refreshToken!);

      // Revoked refresh token cannot be used again
      await expect(authService.refresh(authRes.refreshToken!)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('Protected Endpoints & Current User', () => {
    it('should fetch current user profile without passwordHash', async () => {
      const email = `me.test.${Date.now()}@careersync.local`;
      const authRes = await authService.register({
        email,
        password: 'Password123!',
        role: Role.STUDENT,
        name: 'Me Test User',
      });

      const me = await authService.getMe(authRes.user.id);
      expect(me).toBeDefined();
      expect(me.email).toBe(email);
      expect((me as any).passwordHash).toBeUndefined();
    });
  });
});
