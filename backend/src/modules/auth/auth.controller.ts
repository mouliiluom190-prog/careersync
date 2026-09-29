import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type * as express from 'express';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { Roles } from './decorators/roles.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import type { AuthenticatedUser } from './types/auth.types.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Helper to set HttpOnly refresh token cookie
   */
  private setRefreshTokenCookie(res: express.Response, refreshToken: string) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  /**
   * Helper to clear refresh token cookie
   */
  private clearRefreshTokenCookie(res: express.Response) {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      path: '/api/auth',
    });
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const response = await this.authService.register(dto);
    if (response.refreshToken) {
      this.setRefreshTokenCookie(res, response.refreshToken);
    }
    return {
      user: response.user,
      accessToken: response.accessToken,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const response = await this.authService.login(dto);
    if (response.refreshToken) {
      this.setRefreshTokenCookie(res, response.refreshToken);
    }
    return {
      user: response.user,
      accessToken: response.accessToken,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: express.Request,
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const token = req.cookies?.refreshToken || dto.refreshToken;
    const response = await this.authService.refresh(token);
    if (response.refreshToken) {
      this.setRefreshTokenCookie(res, response.refreshToken);
    }
    return {
      user: response.user,
      accessToken: response.accessToken,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('id') userId: string,
    @Req() req: express.Request,
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const refreshToken = req.cookies?.refreshToken || dto.refreshToken;
    const result = await this.authService.logout(userId, refreshToken);
    this.clearRefreshTokenCookie(res);
    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }

  // Verification Test Endpoints for RBAC

  @Get('test/student')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  testStudent(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Access granted: Student verification endpoint',
      user,
    };
  }

  @Get('test/recruiter')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  testRecruiter(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Access granted: Recruiter verification endpoint',
      user,
    };
  }

  @Get('test/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  testAdmin(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Access granted: Admin verification endpoint',
      user,
    };
  }
}
