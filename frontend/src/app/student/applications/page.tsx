'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  getStudentApplications,
  Application,
  ApplicationStatus,
  PaginatedResponse,
} from '@/lib/api-client';
import {
  FileText,
  Building2,
  MapPin,
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

export default function StudentApplicationsPage() {
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [applications, setApplications] = useState<Application[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  const fetchApplications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res: PaginatedResponse<Application> = await getStudentApplications(token, {
        status: (selectedStatus as ApplicationStatus) || undefined,
        page,
        limit: 10,
      });
      setApplications(res.data || []);
      setMeta(res.meta || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [token, selectedStatus, page]);

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
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span>Loading submitted applications...</span>
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
              <FileText className="h-5 w-5 text-blue-400" />
              My Job Applications
            </h1>
          </div>

          <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 border border-blue-500/20">
            {meta.total} Applications Tracked
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pt-8 space-y-8">
        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Status Filter Bar */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl flex items-center gap-4 overflow-x-auto">
          <span className="text-xs font-semibold text-slate-400 shrink-0 flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-blue-400" />
            Filter by Status:
          </span>

          <div className="flex items-center gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setSelectedStatus(opt.value);
                  setPage(1);
                }}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors border ${
                  selectedStatus === opt.value
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Applications List */}
        {applications.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {applications.map((app) => (
              <div
                key={app.id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md transition-all hover:border-blue-500/50"
              >
                <div className="space-y-4">
                  {/* Job & Company Info */}
                  <div className="flex items-start gap-4">
                    <div className="h-14 w-14 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                      {app.job?.company?.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={app.job.company.logoUrl}
                          alt={app.job.company.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Building2 className="h-7 w-7 text-blue-400" />
                      )}
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-slate-400">
                        {app.job?.company?.name || 'Company'}
                      </span>
                      <h2 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                        {app.job?.title || 'Job Title'}
                      </h2>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-red-400" />
                          {app.job?.company?.location || app.job?.location?.city || 'Location unspecified'}
                        </span>
                        <span>•</span>
                        <span className="text-blue-400 font-medium">{app.job?.workMode}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border ${
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

                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      Applied {new Date(app.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Footer Link */}
                <div className="pt-4 mt-4 border-t border-slate-800/60 flex justify-end">
                  <Link
                    href={`/student/applications/${app.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-200 border border-slate-800 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Track Timeline & Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center space-y-4">
            <FileText className="mx-auto h-12 w-12 text-slate-600" />
            <h3 className="text-lg font-semibold text-white">No applications found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Explore active job postings to submit applications and track your progress.
            </p>
            <Link
              href="/student/jobs"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 shadow-lg"
            >
              Explore Job Openings
            </Link>
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-800 pt-6">
            <span className="text-xs text-slate-400">
              Page {meta.page} of {meta.totalPages} ({meta.total} total applications)
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
