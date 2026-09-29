'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  getRecruiterApplicationDetails,
  updateApplicationStatus,
  getApplicationResumeDownloadUrl,
  Application,
  ApplicationStatus,
} from '@/lib/api-client';
import {
  ArrowLeft,
  User,
  GraduationCap,
  Award,
  FileText,
  Link2,
  Clock,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Building2,
  ShieldCheck,
} from 'lucide-react';

const ALLOWED_WORKFLOW_ACTIONS: { label: string; value: ApplicationStatus }[] = [
  { label: 'Mark Under Review', value: 'UNDER_REVIEW' },
  { label: 'Shortlist Candidate', value: 'SHORTLISTED' },
  { label: 'Schedule / Mark Interview Stage', value: 'INTERVIEW' },
  { label: 'Select Candidate (Offer)', value: 'SELECTED' },
  { label: 'Reject Application', value: 'REJECTED' },
];

export default function RecruiterApplicantDetailPage() {
  const params = useParams();
  const applicationId = params?.id as string;

  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Status Action Form State
  const [targetStatus, setTargetStatus] = useState<ApplicationStatus>('UNDER_REVIEW');
  const [statusNote, setStatusNote] = useState<string>('');
  const [updating, setUpdating] = useState<boolean>(false);

  const fetchDetails = useCallback(async () => {
    if (!token || !applicationId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getRecruiterApplicationDetails(token, applicationId);
      setApplication(data);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to load applicant details');
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

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !applicationId) return;

    setUpdating(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await updateApplicationStatus(token, applicationId, {
        status: targetStatus,
        note: statusNote.trim() || undefined,
      });

      setSuccessMsg(`Candidate moved to ${targetStatus}`);
      setStatusNote('');
      await fetchDetails();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to update candidate status');
    } finally {
      setUpdating(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          <span>Loading candidate dossier...</span>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white p-6">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center max-w-md space-y-4">
          <h2 className="text-xl font-bold text-red-400">Applicant Not Found</h2>
          <p className="text-sm text-slate-400">{error}</p>
          <Link
            href="/recruiter/applications"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Applicants Pipeline
          </Link>
        </div>
      </div>
    );
  }

  const student = application.studentProfile;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/recruiter/applications"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Applicants Pipeline
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
            Stage: {application.status.replace('_', ' ')}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pt-8 space-y-8">
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

        {/* Candidate Profile Dossier Header */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative h-20 w-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
              {student?.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={student.profileImageUrl}
                  alt={student.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-10 w-10 text-slate-500" />
              )}
            </div>

            <div>
              <h1 className="text-2xl font-bold text-white">{student?.name || 'Candidate Name'}</h1>
              <p className="text-xs text-slate-400">{student?.user?.email}</p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-300">
                <span className="flex items-center gap-1">
                  <GraduationCap className="h-3.5 w-3.5 text-indigo-400" />
                  {student?.college || 'College unlisted'} ({student?.degree || 'Degree'})
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-semibold text-emerald-400">
                  <Award className="h-3.5 w-3.5" />
                  CGPA: {student?.cgpa ? student.cgpa.toFixed(2) : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-1 text-xs shrink-0">
            <span className="text-slate-500">Applied For:</span>
            <p className="font-bold text-white text-sm">{application.job?.title}</p>
            <p className="text-slate-400 flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-indigo-400" />
              {application.job?.company?.name}
            </p>
          </div>
        </div>

        {/* 2-Column Details Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column: Cover Letter & Skills */}
          <div className="lg:col-span-2 space-y-8">
            {/* Cover Letter */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-400" />
                Applicant Cover Letter
              </h2>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {application.coverLetter || 'No cover letter submitted.'}
              </div>
            </div>

            {/* Candidate Skills */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-400" />
                Candidate Technical Skills
              </h2>
              {student?.skills && student.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {student.skills.map((st) => (
                    <span
                      key={st.skillId}
                      className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-semibold text-indigo-300"
                    >
                      {st.skill.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No skill tags listed on profile.</p>
              )}
            </div>

            {/* Resume Document Access */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-400" />
                Submitted Candidate Resume
              </h2>
              {application.resume ? (
                <div className="flex items-center justify-between p-4 rounded-xl border border-blue-500/30 bg-blue-950/20">
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
                        alert(errorObj.message || 'Failed to generate download URL');
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors shadow-lg"
                  >
                    View / Download Resume
                  </button>
                </div>
              ) : application.resumeUrl ? (
                <a
                  href={application.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-blue-400 hover:underline flex items-center gap-2 truncate p-3 border border-slate-800 rounded-xl bg-slate-950"
                >
                  <Link2 className="h-4 w-4 shrink-0" />
                  {application.resumeUrl}
                </a>
              ) : (
                <p className="text-xs text-slate-500 italic">No resume attached to this application.</p>
              )}
            </div>
          </div>

          {/* Sidebar: Recruitment Workflow Controls */}
          <div className="space-y-6">
            {/* Status Change Form */}
            <form
              onSubmit={handleUpdateStatus}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4"
            >
              <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                Recruitment Action Panel
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Transition Candidate To:
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as ApplicationStatus)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  {ALLOWED_WORKFLOW_ACTIONS.map((act) => (
                    <option key={act.value} value={act.value}>
                      {act.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Evaluation Note / Feedback (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Internal recruiter feedback or stage notes..."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={updating}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 shadow-lg"
              >
                {updating && <Loader2 className="h-4 w-4 animate-spin" />}
                Update Recruitment Stage
              </button>
            </form>

            {/* History Timeline Log */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-400" />
                Candidate Stage Log
              </h3>

              <div className="space-y-4 text-xs">
                {application.history?.map((hist) => (
                  <div key={hist.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-300">
                        {hist.status.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(hist.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {hist.note && <p className="text-slate-400 italic">{hist.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
