'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getAdminAnalytics, AdminAnalytics } from '@/lib/api-client';
import {
  ShieldAlert,
  Users,
  Building2,
  Briefcase,
  FileText,
  Loader2,
  ArrowRight,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { token, user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminAnalytics(token);
      setAnalytics(data);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to load admin analytics');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== 'ADMIN')) {
      router.push('/login');
      return;
    }
    if (token && user?.role === 'ADMIN') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchAnalytics();
    }
  }, [authLoading, isAuthenticated, user, token, router, fetchAnalytics]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-red-500" />
          <span>Loading admin portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Admin Header */}
      <header className="border-b border-red-900/30 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white font-bold shadow-lg">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight">
                CareerSync Admin Console
              </span>
              <span className="block text-[10px] text-red-400 font-mono uppercase">
                Platform Moderation & Security
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/" className="text-slate-400 hover:text-white transition-colors">
              Main Site
            </Link>
            <span className="rounded-full bg-red-500/10 px-3 py-1 text-red-400 border border-red-500/20">
              ADMIN Role Granted
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pt-8 space-y-8">
        {/* Navigation Quick Links Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link
            href="/admin/users"
            className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-4 hover:border-red-500/40 hover:bg-slate-900 transition-all group"
          >
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-400" />
              <span className="text-sm font-bold text-white">Users</span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-red-400 group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            href="/admin/companies"
            className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-4 hover:border-red-500/40 hover:bg-slate-900 transition-all group"
          >
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-emerald-400" />
              <span className="text-sm font-bold text-white">Companies</span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-red-400 group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            href="/admin/jobs"
            className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-4 hover:border-red-500/40 hover:bg-slate-900 transition-all group"
          >
            <div className="flex items-center gap-3">
              <Briefcase className="h-5 w-5 text-amber-400" />
              <span className="text-sm font-bold text-white">Job Moderation</span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-red-400 group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            href="/admin/applications"
            className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-4 hover:border-red-500/40 hover:bg-slate-900 transition-all group"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-indigo-400" />
              <span className="text-sm font-bold text-white">Applications</span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-red-400 group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-400">
            {error}
          </div>
        ) : (
          <>
            {/* Overview Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5 shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400">Total Registered Users</span>
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <h2 className="text-3xl font-extrabold text-white">
                  {analytics?.users?.total || 0}
                </h2>
                <div className="text-xs text-slate-400 space-x-2 pt-1 border-t border-blue-500/20">
                  <span>Students: {analytics?.users?.students || 0}</span>
                  <span>•</span>
                  <span>Recruiters: {analytics?.users?.recruiters || 0}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400">Companies Registered</span>
                  <Building2 className="h-5 w-5 text-emerald-400" />
                </div>
                <h2 className="text-3xl font-extrabold text-white">
                  {analytics?.companies?.total || 0}
                </h2>
                <div className="text-xs text-emerald-400 pt-1 border-t border-emerald-500/20">
                  Verified: {analytics?.companies?.verified || 0}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400">Active Jobs</span>
                  <Briefcase className="h-5 w-5 text-amber-400" />
                </div>
                <h2 className="text-3xl font-extrabold text-white">
                  {analytics?.jobs?.active || 0}
                </h2>
                <div className="text-xs text-slate-400 pt-1 border-t border-amber-500/20">
                  Total Jobs Posted: {analytics?.jobs?.total || 0}
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-5 shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400">Total Applications</span>
                  <FileText className="h-5 w-5 text-indigo-400" />
                </div>
                <h2 className="text-3xl font-extrabold text-white">
                  {analytics?.applications?.total || 0}
                </h2>
                <div className="text-xs text-indigo-300 pt-1 border-t border-indigo-500/20">
                  Platform Activity Stream Active
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
