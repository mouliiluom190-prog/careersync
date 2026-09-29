import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { AuthResponse, JwtPayload, SafeUser } from './types/auth.types.js';

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET') ||
      'default-dev-access-secret-careersync-2026';
    this.accessExpiresIn =
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m';
    this.refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'default-dev-refresh-secret-careersync-2026';
    this.refreshExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
  }

  /**
   * Helper to hash refresh token for database storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Helper to calculate expiration date from duration string (e.g. '7d', '15m')
   */
  private getExpirationDate(duration: string): Date {
    const match = duration.match(/^(\d+)([smhd])$/);
    const now = new Date();
    if (!match) {
      // Default to 7 days if parsing fails
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return new Date(now.getTime() + value * 1000);
      case 'm':
        return new Date(now.getTime() + value * 60 * 1000);
      case 'h':
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'd':
      default:
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Generate access and refresh tokens for a user
   */
  private async generateTokens(user: { id: string; email: string; role: Role }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessExpiresIn as any,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshExpiresIn as any,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Save refresh token session in database
   */
  private async createSession(userId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = this.getExpirationDate(this.refreshExpiresIn);

    await this.prisma.authSession.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  }

  /**
   * Public Registration
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // Security check: Reject public ADMIN registration attempts
    if (dto.role === Role.ADMIN) {
      throw new BadRequestException(
        'Public registration of ADMIN role is prohibited',
      );
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    // Hash password with Argon2
    const passwordHash = await argon2.hash(dto.password);

    // Create user and profile in a transaction
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          role: dto.role,
        },
      });

      if (dto.role === Role.STUDENT) {
        await tx.studentProfile.create({
          data: {
            userId: newUser.id,
            name: dto.name,
            phone: dto.phone,
            college: dto.college,
            department: dto.department,
          },
        });
      } else if (dto.role === Role.RECRUITER) {
        await tx.recruiterProfile.create({
          data: {
            userId: newUser.id,
            name: dto.name,
            phone: dto.phone,
            designation: dto.designation,
          },
        });
      }

      return newUser;
    });

    const tokens = await this.generateTokens(user);
    await this.createSession(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: dto.name,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Public Login
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        studentProfile: true,
        recruiterProfile: true,
      },
    });

    // Generic error message to prevent account enumeration attacks
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user);
    await this.createSession(user.id, tokens.refreshToken);

    const displayName =
      user.studentProfile?.name ||
      user.recruiterProfile?.name ||
      user.email.split('@')[0];

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: displayName,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Token Refresh with Rotation & Revocation
   */
  async refresh(refreshToken: string): Promise<AuthResponse> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenHash = this.hashToken(refreshToken);

    const session = await this.prisma.authSession.findFirst({
      where: {
        userId: payload.sub,
        tokenHash,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid or revoked refresh token');
    }

    // Revoke old session (Rotation)
    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        studentProfile: true,
        recruiterProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const newTokens = await this.generateTokens(user);
    await this.createSession(user.id, newTokens.refreshToken);

    const displayName =
      user.studentProfile?.name ||
      user.recruiterProfile?.name ||
      user.email.split('@')[0];

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: displayName,
      },
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
    };
  }

  /**
   * Logout / Invalidate Sessions
   */
  async logout(userId: string, refreshToken?: string): Promise<{ message: string }> {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.authSession.updateMany({
        where: {
          userId,
          tokenHash,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    } else {
      // Invalidate all active sessions for user if specific token is not provided
      await this.prisma.authSession.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }

    return { message: 'Successfully logged out' };
  }

  /**
   * Get Current Authenticated User (Safe details, no passwordHash)
   */
  async getMe(userId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        studentProfile: {
          select: {
            id: true,
            name: true,
            phone: true,
            college: true,
            department: true,
            graduationYear: true,
          },
        },
        recruiterProfile: {
          select: {
            id: true,
            name: true,
            phone: true,
            designation: true,
            companyId: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
