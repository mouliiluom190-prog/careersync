'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  getRecruiterJobs,
  updateJobStatus,
  Job,
  JobStatus,
  PaginatedResponse,
} from '@/lib/api-client';
import {
  Briefcase,
  PlusCircle,
  Edit3,
  Eye,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Building2,
} from 'lucide-react';

export default function RecruiterJobsPage() {
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res: PaginatedResponse<Job> = await getRecruiterJobs(token, page, 10);
      setJobs(res.data || []);
      setMeta(res.meta || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to load recruiter jobs');
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchJobs();
    }
  }, [authLoading, isAuthenticated, token, router, fetchJobs]);

  const handleStatusToggle = async (jobId: string, currentStatus: JobStatus) => {
    if (!token) return;
    const newStatus: JobStatus = currentStatus === 'ACTIVE' ? 'CLOSED' : 'ACTIVE';
    setUpdatingStatusId(jobId);
    setError(null);

    try {
      await updateJobStatus(token, jobId, newStatus);
      setSuccessMsg(`Job status updated to ${newStatus}`);
      await fetchJobs();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to update job status');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          <span>Loading recruiter dashboard...</span>
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
              <Briefcase className="h-5 w-5 text-indigo-400" />
              Recruiter Job Management
            </h1>
          </div>

          <Link
            href="/recruiter/jobs/create"
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-indigo-500 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            Post New Job
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pt-8 space-y-8">
        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{successMsg}</p>
          </div>
        )}

        {/* Dashboard Banner */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Building2 className="h-6 w-6 text-indigo-400" />
              {user?.name}&apos;s Job Postings
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Create, edit, and control visibility for all active job listings under your company profile.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-center">
              <span className="text-slate-400 font-medium">Total Jobs</span>
              <p className="text-lg font-bold text-white mt-0.5">{meta.total}</p>
            </div>
          </div>
        </div>

        {/* Jobs List / Table */}
        {jobs.length > 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="border-b border-slate-800 bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Job Title & Details</th>
                    <th className="px-6 py-4">Company</th>
                    <th className="px-6 py-4">Type / Mode</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Posted Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-900/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{job.title}</div>
                        <span className="text-xs text-slate-500">
                          {job.openings} {job.openings === 1 ? 'opening' : 'openings'} • {job.skills?.length || 0} skills required
                        </span>
                      </td>

                      <td className="px-6 py-4 font-medium text-slate-200">
                        {job.company?.name || 'N/A'}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-xs">
                          <span className="text-blue-400 font-semibold">{job.workMode}</span>
                          <span className="text-slate-400">{job.employmentType.replace('_', ' ')}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                            job.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : job.status === 'CLOSED'
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/student/jobs/${job.id}`}
                            className="rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                            title="Preview Job Page"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          <Link
                            href={`/recruiter/jobs/${job.id}/edit`}
                            className="rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                            title="Edit Job Details"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Link>

                          <button
                            disabled={updatingStatusId === job.id}
                            onClick={() => handleStatusToggle(job.id, job.status)}
                            className={`rounded-lg border p-2 transition-colors ${
                              job.status === 'ACTIVE'
                                ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                            }`}
                            title={job.status === 'ACTIVE' ? 'Close Job' : 'Reactivate Job'}
                          >
                            {updatingStatusId === job.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : job.status === 'ACTIVE' ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
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
            <Briefcase className="mx-auto h-12 w-12 text-slate-600" />
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-white">No jobs posted yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Create your first job post to reach qualified student candidates across CareerSync.
              </p>
            </div>
            <Link
              href="/recruiter/jobs/create"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 shadow-lg"
            >
              <PlusCircle className="h-4 w-4" />
              Post Job Listing
            </Link>
          </div>
        )}

        {/* Pagination Bar */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-800 pt-6">
            <span className="text-xs text-slate-400">
              Page {meta.page} of {meta.totalPages} ({meta.total} total jobs)
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
