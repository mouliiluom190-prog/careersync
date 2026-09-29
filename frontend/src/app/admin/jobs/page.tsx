'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  getAdminJobs,
  updateAdminJobStatus,
  Job,
  JobStatus,
} from '@/lib/api-client';
import {
  Briefcase,
  ArrowLeft,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function AdminJobsPage() {
  const { token, user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminJobs(token, page, 10, statusFilter || undefined, search || undefined);
      setJobs(res.data || []);
      setMeta(res.meta || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to load job listings');
    } finally {
      setLoading(false);
    }
  }, [token, page, statusFilter, search]);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || currentUser?.role !== 'ADMIN')) {
      router.push('/login');
      return;
    }
    if (token && currentUser?.role === 'ADMIN') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchJobs();
    }
  }, [authLoading, isAuthenticated, currentUser, token, router, fetchJobs]);

  const handleUpdateStatus = async (jobId: string, newStatus: JobStatus) => {
    if (!token) return;
    setUpdatingId(jobId);
    try {
      const updated = await updateAdminJobStatus(token, jobId, newStatus);
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: updated.status } : j)),
      );
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      alert(errorObj.message || 'Failed to moderate job status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin Overview
          </Link>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            Job Moderation Module
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pt-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
              <Briefcase className="h-6 w-6 text-amber-400" />
              Job Listings Moderation
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Review platform job postings and deactivate or close problematic listings while preserving historical applications.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search job title or company..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-800 bg-slate-900/80 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DRAFT">DRAFT</option>
              <option value="CLOSED">CLOSED</option>
              <option value="EXPIRED">EXPIRED</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500 mr-2" />
            <span>Loading job registry...</span>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-400">
            {error}
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center text-slate-500">
            No matching jobs found.
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 bg-slate-950/60 font-semibold text-slate-400 uppercase">
                  <tr>
                    <th className="px-5 py-3.5">Job Title</th>
                    <th className="px-5 py-3.5">Company</th>
                    <th className="px-5 py-3.5">Work Mode / Type</th>
                    <th className="px-5 py-3.5">Current Status</th>
                    <th className="px-5 py-3.5 text-right">Moderate Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {jobs.map((j) => (
                    <tr key={j.id} className="hover:bg-slate-800/40">
                      <td className="px-5 py-3.5 font-bold text-white">
                        {j.title}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">
                        {j.company?.name || 'Unspecified'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 font-mono text-[10px]">
                        {j.workMode} • {j.employmentType}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 font-semibold text-[10px] border ${
                            j.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : j.status === 'CLOSED'
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}
                        >
                          {j.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <select
                          disabled={updatingId === j.id}
                          value={j.status}
                          onChange={(e) =>
                            handleUpdateStatus(j.id, e.target.value as JobStatus)
                          }
                          className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 disabled:opacity-40"
                        >
                          <option value="ACTIVE">Set ACTIVE</option>
                          <option value="DRAFT">Set DRAFT</option>
                          <option value="CLOSED">Set CLOSED</option>
                          <option value="EXPIRED">Set EXPIRED</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/40">
                <span className="text-xs text-slate-400">
                  Page {meta.page} of {meta.totalPages} ({meta.total} total)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={meta.page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={meta.page >= meta.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
