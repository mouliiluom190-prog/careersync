'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  getAdminApplications,
  Application,
} from '@/lib/api-client';
import {
  FileText,
  ArrowLeft,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function AdminApplicationsPage() {
  const { token, user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [applications, setApplications] = useState<Application[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  const fetchApplications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminApplications(token, page, 10, statusFilter || undefined);
      setApplications(res.data || []);
      setMeta(res.meta || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to load platform applications');
    } finally {
      setLoading(false);
    }
  }, [token, page, statusFilter]);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || currentUser?.role !== 'ADMIN')) {
      router.push('/login');
      return;
    }
    if (token && currentUser?.role === 'ADMIN') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchApplications();
    }
  }, [authLoading, isAuthenticated, currentUser, token, router, fetchApplications]);

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
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
            Platform Applications Oversight (Read-Only)
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pt-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
              <FileText className="h-6 w-6 text-indigo-400" />
              Platform Applications Overview
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Read-only view of application submissions across all hiring organizations and candidates.
            </p>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="APPLIED">APPLIED</option>
            <option value="UNDER_REVIEW">UNDER_REVIEW</option>
            <option value="SHORTLISTED">SHORTLISTED</option>
            <option value="INTERVIEW">INTERVIEW</option>
            <option value="SELECTED">SELECTED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="WITHDRAWN">WITHDRAWN</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mr-2" />
            <span>Loading application registry...</span>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-400">
            {error}
          </div>
        ) : applications.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center text-slate-500">
            No matching applications found.
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 bg-slate-950/60 font-semibold text-slate-400 uppercase">
                  <tr>
                    <th className="px-5 py-3.5">Candidate</th>
                    <th className="px-5 py-3.5">Job Title</th>
                    <th className="px-5 py-3.5">Company</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Applied Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-800/40">
                      <td className="px-5 py-3.5 font-bold text-white">
                        {app.studentProfile?.name || 'Candidate'}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {app.studentProfile?.user?.email}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-200">
                        {app.job?.title || 'Job Listing'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">
                        {app.job?.company?.name || 'Company'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 font-semibold text-[10px] border ${
                            app.status === 'APPLIED'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : app.status === 'UNDER_REVIEW'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : app.status === 'SELECTED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-400">
                        {new Date(app.createdAt).toLocaleDateString()}
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
