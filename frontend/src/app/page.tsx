'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { LogIn, UserPlus, LogOut, ShieldCheck, UserCheck, Briefcase, FileText } from 'lucide-react';

export default function Home() {
  const { user, isAuthenticated, logout, isLoading } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-lg">
              CS
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              CareerSync
            </span>
          </div>

          <div className="flex items-center gap-4">
            {isLoading ? (
              <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-800" />
            ) : isAuthenticated && user ? (
              <div className="flex items-center gap-4">
                <NotificationBell />
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">
                    {user.name || user.email.split('@')[0]}
                  </p>
                  <span className="inline-block rounded bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400 border border-blue-500/20">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={() => logout()}
                  className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-colors hover:bg-blue-500"
                >
                  <UserPlus className="h-4 w-4" />
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-400">
            <ShieldCheck className="h-4 w-4" />
            Phase 3: Authentication & Role-Based Access Control Active
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white">
            Connect Students & Recruiters on{' '}
            <span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              CareerSync
            </span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            A production-structured platform powered by Next.js, NestJS, Prisma, Argon2, and PostgreSQL with PostGIS.
          </p>

          {isAuthenticated && user ? (
            <div className="mx-auto mt-8 max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-left shadow-xl backdrop-blur-md space-y-3">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <UserCheck className="h-6 w-6 text-emerald-400" />
                <div>
                  <h3 className="font-semibold text-white">Authenticated Session Active</h3>
                  <p className="text-xs text-slate-400">JWT Token Validated via NestJS Auth Guard</p>
                </div>
              </div>
              <div className="text-sm space-y-1 text-slate-300">
                <p><span className="text-slate-500">User ID:</span> {user.id}</p>
                <p><span className="text-slate-500">Email:</span> {user.email}</p>
                <p><span className="text-slate-500">Assigned Role:</span> <strong className="text-blue-400">{user.role}</strong></p>
              </div>

              <div className="pt-2 space-y-2">
                {user.role === 'STUDENT' ? (
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/student/jobs"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-blue-500 shadow-lg"
                    >
                      <Briefcase className="h-4 w-4" />
                      Browse Active Jobs
                    </Link>
                    <Link
                      href="/student/applications"
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-500/20"
                    >
                      <FileText className="h-4 w-4" />
                      My Submitted Applications
                    </Link>
                    <Link
                      href="/student/resumes"
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                    >
                      <FileText className="h-4 w-4 text-blue-400" />
                      My Uploaded Resumes
                    </Link>
                    <Link
                      href="/student/profile"
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-900"
                    >
                      <UserCheck className="h-4 w-4" />
                      View Student Profile
                    </Link>
                  </div>
                ) : user.role === 'RECRUITER' ? (
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/recruiter/jobs"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-indigo-500 shadow-lg"
                    >
                      <Briefcase className="h-4 w-4" />
                      Manage & Post Jobs
                    </Link>
                    <Link
                      href="/recruiter/applications"
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20"
                    >
                      Applicant Tracking Pipeline
                    </Link>
                    <Link
                      href="/recruiter/profile"
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-900"
                    >
                      View Recruiter & Company Profile
                    </Link>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Link
                      href="/student/jobs"
                      className="flex-1 text-center rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                    >
                      Browse Jobs
                    </Link>
                    <Link
                      href="/student/profile"
                      className="flex-1 text-center rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                    >
                      Profiles
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/student/jobs"
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white shadow-xl transition-colors hover:bg-blue-500"
              >
                <Briefcase className="h-5 w-5" />
                Explore Job Openings
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-6 py-3.5 font-semibold text-slate-200 transition-colors hover:bg-slate-800"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
