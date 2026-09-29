'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  getRecruiterApplications,
  getRecruiterJobs,
  Application,
  ApplicationStatus,
  Job,
  PaginatedResponse,
} from '@/lib/api-client';
import {
  Users,
  Briefcase,
  GraduationCap,
  Clock,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Eye,
  Filter,
} from 'lucide-react';

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'All Statuses', value: '' },
  { label: 'Applied', value: 'APPLIED' },
  { label: 'Under Review', value: 'UNDER_REVIEW' },
  { label: 'Shortlisted', value: 'SHORTLISTED' },
  { label: 'Interview', value: 'INTERVIEW' },
  { label: 'Selected', value: 'SELECTED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Withdrawn', value: 'WITHDRAWN' },
];

export default function RecruiterApplicationsPage() {
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [applications, setApplications] = useState<Application[]>([]);
  const [recruiterJobs, setRecruiterJobs] = useState<Job[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  // Fetch recruiter's jobs for filter dropdown
  useEffect(() => {
    if (!token) return;
    void getRecruiterJobs(token, 1, 50).then((res) => {
      setRecruiterJobs(res.data || []);
    });
  }, [token]);

  const fetchApplications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res: PaginatedResponse<Application> = await getRecruiterApplications(token, {
        jobId: selectedJobId || undefined,
        status: (selectedStatus as ApplicationStatus) || undefined,
        page,
        limit: 10,
      });
      setApplications(res.data || []);
      setMeta(res.meta || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to load applicant list');
    } finally {
      setLoading(false);
    }
  }, [token, selectedJobId, selectedStatus, page]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchApplications();
    }
  }, [authLoading, isAuthenticated, token, router, fetchApplications]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          <span>Loading applicants pipeline...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
            <div className="h-4 w-px bg-slate-800" />
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-400" />
              Applicant Tracking Pipeline
            </h1>
          </div>

          <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
            {meta.total} Applicants Total
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pt-8 space-y-8">
        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Filter Controls */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5 text-indigo-400" /> Filter by Job Listing
              </label>
              <select
                value={selectedJobId}
                onChange={(e) => {
                  setSelectedJobId(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Job Postings</option>
                {recruiterJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5 text-blue-400" /> Filter by Workflow Stage
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedJobId('');
                setSelectedStatus('');
                setPage(1);
              }}
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Applicants Table */}
        {applications.length > 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="border-b border-slate-800 bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Candidate Profile</th>
                    <th className="px-6 py-4">Job Position</th>
                    <th className="px-6 py-4">Applied Date</th>
                    <th className="px-6 py-4">Current Stage</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-900/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">
                          {app.studentProfile?.name || 'Candidate'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <GraduationCap className="h-3 w-3 text-indigo-400" />
                            {app.studentProfile?.college || 'College unlisted'}
                          </span>
                          <span>•</span>
                          <span>{app.studentProfile?.degree || 'Major unlisted'}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-200">{app.job?.title}</div>
                        <span className="text-xs text-slate-500">{app.job?.company?.name}</span>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          {new Date(app.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                            app.status === 'APPLIED'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : app.status === 'UNDER_REVIEW'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : app.status === 'SHORTLISTED' || app.status === 'INTERVIEW'
                                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                  : app.status === 'SELECTED'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}
                        >
                          {app.status.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/recruiter/applications/${app.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Review Candidate
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center space-y-4">
            <Users className="mx-auto h-12 w-12 text-slate-600" />
            <h3 className="text-lg font-semibold text-white">No candidate applications found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Applications submitted by students to your active job listings will appear here.
            </p>
          </div>
        )}

        {/* Pagination Bar */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-800 pt-6">
            <span className="text-xs text-slate-400">
              Page {meta.page} of {meta.totalPages} ({meta.total} total applicants)
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage(page + 1)}
                className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
