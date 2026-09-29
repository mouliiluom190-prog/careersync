'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  getStudentApplicationDetails,
  withdrawApplication,
  getApplicationResumeDownloadUrl,
  Application,
} from '@/lib/api-client';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Clock,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export default function StudentApplicationDetailPage() {
  const params = useParams();
  const applicationId = params?.id as string;

  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState<boolean>(false);
  const [withdrawMsg, setWithdrawMsg] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!token || !applicationId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getStudentApplicationDetails(token, applicationId);
      setApplication(data);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to load application details');
    } finally {
      setLoading(false);
    }
  }, [token, applicationId]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchDetails();
    }
  }, [authLoading, isAuthenticated, token, router, fetchDetails]);

  const handleWithdraw = async () => {
    if (!token || !applicationId) return;
    if (!confirm('Are you sure you want to withdraw this application? This action is permanent.')) {
      return;
    }

    setWithdrawing(true);
    setError(null);
    try {
      await withdrawApplication(token, applicationId, 'Withdrawn by student');
      setWithdrawMsg('Application withdrawn successfully');
      await fetchDetails();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to withdraw application');
    } finally {
      setWithdrawing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span>Loading application timeline...</span>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white p-6">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center max-w-md space-y-4">
          <h2 className="text-xl font-bold text-red-400">Application Not Found</h2>
          <p className="text-sm text-slate-400">{error}</p>
          <Link
            href="/student/applications"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Applications
          </Link>
        </div>
      </div>
    );
  }

  const canWithdraw =
    application.status === 'APPLIED' || application.status === 'UNDER_REVIEW';

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
            Back to My Applications
          </Link>

          <span
            className={`rounded-full px-3 py-1 text-xs font-bold border ${
              application.status === 'APPLIED'
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                : application.status === 'UNDER_REVIEW'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : application.status === 'SHORTLISTED' || application.status === 'INTERVIEW'
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    : application.status === 'SELECTED'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}
          >
            {application.status.replace('_', ' ')}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 pt-8 space-y-8">
        {/* Withdraw Alert */}
        {withdrawMsg && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{withdrawMsg}</p>
          </div>
        )}

        {/* Job Header Box */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
              {application.job?.company?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={application.job.company.logoUrl}
                  alt={application.job.company.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Building2 className="h-8 w-8 text-blue-400" />
              )}
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400">
                {application.job?.company?.name}
              </span>
              <h1 className="text-xl font-bold text-white">{application.job?.title}</h1>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-red-400" />
                  {application.job?.company?.location || application.job?.location?.city || 'Unspecified'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  Applied {new Date(application.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {canWithdraw && (
            <button
              disabled={withdrawing}
              onClick={handleWithdraw}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50 self-start md:self-center"
            >
              {withdrawing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              Withdraw Application
            </button>
          )}
        </div>

        {/* Recruitment Status Timeline */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-6">
          <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-400" />
            Recruitment Status Timeline
          </h2>

          <div className="space-y-6 relative pl-6 border-l-2 border-slate-800">
            {application.history && application.history.length > 0 ? (
              application.history.map((hist, idx) => (
                <div key={hist.id} className="relative">
                  {/* Timeline Dot */}
                  <div
                    className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 bg-slate-950 ${
                      idx === application.history!.length - 1
                        ? 'border-blue-500 text-blue-400'
                        : 'border-slate-700 text-slate-600'
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-white">
                        {hist.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        {new Date(hist.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {hist.note && (
                      <p className="text-xs text-slate-400 mt-1 rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
                        {hist.note}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No status timeline events recorded.</p>
            )}
          </div>
        </div>

        {/* Submission Content Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-6">
          <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-400" />
            Submitted Documents & Cover Letter
          </h2>

          <div className="space-y-4">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Submitted Resume
              </span>
              {application.resume ? (
                <div className="flex items-center justify-between p-4 rounded-xl border border-blue-500/30 bg-blue-950/20 mt-2">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-blue-400 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-white">{application.resume.originalFileName}</p>
                      <p className="text-xs text-slate-400">
                        {(application.resume.fileSize / 1024).toFixed(0)} KB • Encrypted Secure Storage
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (!token) return;
                      try {
                        const res = await getApplicationResumeDownloadUrl(token, applicationId);
                        window.open(res.downloadUrl, '_blank');
                      } catch (err: unknown) {
                        const errorObj = err as { message?: string };
                        alert(errorObj.message || 'Failed to download resume');
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors shadow-lg"
                  >
                    Download Resume
                  </button>
                </div>
              ) : application.resumeUrl ? (
                <a
                  href={application.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-400 hover:underline mt-1 block truncate p-3 border border-slate-800 rounded-xl bg-slate-950"
                >
                  {application.resumeUrl}
                </a>
              ) : (
                <p className="text-xs text-slate-500 italic mt-1">No resume document attached.</p>
              )}
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Cover Letter
              </span>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300 mt-1 leading-relaxed whitespace-pre-line">
                {application.coverLetter || 'No cover letter was submitted.'}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
