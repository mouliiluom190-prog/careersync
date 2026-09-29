'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getStudentAnalytics, StudentAnalytics } from '@/lib/api-client';
import {
  BarChart3,
  FileText,
  Clock,
  CheckCircle2,
  Calendar,
  Award,
  XCircle,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

export default function StudentAnalyticsPage() {
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getStudentAnalytics(token);
      setAnalytics(data);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to load student analytics');
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
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  const statusMap = [
    { key: 'APPLIED', label: 'Applied', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: FileText },
    { key: 'UNDER_REVIEW', label: 'Under Review', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: Clock },
    { key: 'SHORTLISTED', label: 'Shortlisted', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20', icon: CheckCircle2 },
    { key: 'INTERVIEW_SCHEDULED', label: 'Interview Scheduled', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', icon: Calendar },
    { key: 'OFFERED', label: 'Offer Received', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: Award },
    { key: 'REJECTED', label: 'Rejected', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: XCircle },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/student/applications"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Applications
          </Link>
          <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
            Student Performance Dashboard
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 pt-8 space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-blue-500" />
            Application Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time analytics and application status breakdown for your recruitment journey.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-400">
            {error}
          </div>
        ) : (
          <>
            {/* Main Metric Card */}
            <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-900/20 via-slate-900/60 to-slate-950 p-6 shadow-xl backdrop-blur-md flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  Total Applications Submitted
                </p>
                <h2 className="text-4xl font-extrabold text-white mt-1">
                  {analytics?.totalApplications || 0}
                </h2>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <FileText className="h-7 w-7" />
              </div>
            </div>

            {/* Status Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {statusMap.map(({ key, label, color, bg, icon: Icon }) => {
                const count = analytics?.byStatus?.[key] || 0;
                const percent =
                  analytics?.totalApplications && analytics.totalApplications > 0
                    ? Math.round((count / analytics.totalApplications) * 100)
                    : 0;

                return (
                  <div
                    key={key}
                    className={`rounded-2xl border ${bg} p-5 shadow-lg flex flex-col justify-between space-y-3`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${color}`}>{label}</span>
                      <Icon className={`h-5 w-5 ${color}`} />
                    </div>
                    <div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-extrabold text-white">
                          {count}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {percent}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-950/80 rounded-full h-1.5 mt-2 overflow-hidden border border-slate-800">
                        <div
                          className={`h-full ${color.replace('text-', 'bg-')}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
