import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}

export interface SafeUser {
  id: string;
  email: string;
  role: Role;
  createdAt: Date;
  studentProfile?: {
    id: string;
    name: string;
    phone?: string | null;
    college?: string | null;
    department?: string | null;
    graduationYear?: number | null;
  } | null;
  recruiterProfile?: {
    id: string;
    name: string;
    phone?: string | null;
    designation?: string | null;
    companyId?: string | null;
  } | null;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: Role;
    name: string;
  };
  accessToken: string;
  refreshToken?: string;
}
