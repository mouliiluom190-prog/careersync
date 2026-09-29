'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getRecruiterAnalytics, RecruiterAnalytics } from '@/lib/api-client';
import {
  TrendingUp,
  Briefcase,
  Users,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

export default function RecruiterAnalyticsPage() {
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [analytics, setAnalytics] = useState<RecruiterAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getRecruiterAnalytics(token);
      setAnalytics(data);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to load recruiter analytics');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchAnalytics();
    }
  }, [authLoading, isAuthenticated, token, router, fetchAnalytics]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span>Loading recruiter analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/recruiter/jobs"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Job Manager
          </Link>
          <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
            Recruitment Intelligence Dashboard
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pt-8 space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-blue-500" />
            Recruitment Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Performance metrics for jobs posted by your organization and total applicant volume.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-400">
            {error}
          </div>
        ) : (
          <>
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400">Total Posted Jobs</span>
                  <Briefcase className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="text-3xl font-extrabold text-white mt-2">
                  {analytics?.totalJobs || 0}
                </h3>
              </div>

              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400">Active Openings</span>
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                </div>
                <h3 className="text-3xl font-extrabold text-white mt-2">
                  {analytics?.activeJobs || 0}
                </h3>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">Closed Listings</span>
                  <XCircle className="h-5 w-5 text-slate-400" />
                </div>
                <h3 className="text-3xl font-extrabold text-white mt-2">
                  {analytics?.closedJobs || 0}
                </h3>
              </div>

              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400">Total Applicants</span>
                  <Users className="h-5 w-5 text-indigo-400" />
                </div>
                <h3 className="text-3xl font-extrabold text-white mt-2">
                  {analytics?.totalApplications || 0}
                </h3>
              </div>
            </div>

            {/* Per-Job Performance Breakdown Table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
                Job Performance Breakdown
              </h2>

              {!analytics?.jobPerformance || analytics.jobPerformance.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">
                  No jobs posted yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="border-b border-slate-800 bg-slate-950/50 text-xs font-semibold text-slate-400 uppercase">
                      <tr>
                        <th className="px-4 py-3">Job Title</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Total Applicants</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {analytics.jobPerformance.map((job) => (
                        <tr key={job.jobId} className="hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-semibold text-white">
                            {job.title}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                                job.status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                              }`}
                            >
                              {job.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-extrabold text-blue-400">
                            {job.applicationCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
