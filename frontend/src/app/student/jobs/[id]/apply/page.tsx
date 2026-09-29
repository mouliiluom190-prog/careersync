'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  getPublicJob,
  applyToJob,
  getStudentResumes,
  uploadResume,
  Job,
  Resume,
} from '@/lib/api-client';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Sparkles,
  FileText,
  Link2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Upload,
  Star,
  Plus,
} from 'lucide-react';

export default function ApplyJobPage() {
  const params = useParams();
  const jobId = params?.id as string;

  const { token, user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [loadingJob, setLoadingJob] = useState<boolean>(true);
  const [jobError, setJobError] = useState<string | null>(null);

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [loadingResumes, setLoadingResumes] = useState<boolean>(true);

  const [showQuickUpload, setShowQuickUpload] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [coverLetter, setCoverLetter] = useState<string>('');
  const [resumeUrl, setResumeUrl] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchJob = useCallback(async () => {
    if (!jobId) return;
    setLoadingJob(true);
    setJobError(null);
    try {
      const data = await getPublicJob(jobId);
      setJob(data);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setJobError(errorObj.message || 'Failed to load job details');
    } finally {
      setLoadingJob(false);
    }
  }, [jobId]);

  const fetchResumes = useCallback(async () => {
    if (!token) return;
    setLoadingResumes(true);
    try {
      const data = await getStudentResumes(token);
      setResumes(data);
      const defaultRes = data.find((r) => r.isDefault);
      if (defaultRes) {
        setSelectedResumeId(defaultRes.id);
      } else if (data.length > 0) {
        setSelectedResumeId(data[0].id);
      }
    } catch (err: unknown) {
      console.error('Failed to load resumes:', err);
    } finally {
      setLoadingResumes(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchJob();
    if (token) {
      void fetchResumes();
    }
  }, [authLoading, isAuthenticated, router, fetchJob, fetchResumes, token]);

  const handleQuickUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !uploadFile) return;

    setUploading(true);
    setUploadError(null);

    try {
      const newResume = await uploadResume(token, uploadFile);
      setResumes((prev) => [newResume, ...prev]);
      setSelectedResumeId(newResume.id);
      setUploadFile(null);
      setShowQuickUpload(false);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setUploadError(errorObj.message || 'Failed to upload resume');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !jobId) return;

    setSubmitting(true);
    setSubmitError(null);
    setSuccessMsg(null);

    try {
      await applyToJob(token, {
        jobId,
        resumeId: selectedResumeId || undefined,
        coverLetter: coverLetter.trim() || undefined,
        resumeUrl: resumeUrl.trim() || undefined,
      });

      setSuccessMsg('Application submitted successfully!');
      setTimeout(() => {
        router.push('/student/applications');
      }, 1500);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setSubmitError(errorObj.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loadingJob) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (jobError || !job) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white p-6">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center max-w-md space-y-4">
          <h2 className="text-xl font-bold text-red-400">Unable to Apply</h2>
          <p className="text-sm text-slate-400">{jobError || 'Job not found'}</p>
          <Link
            href="/student/jobs"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Active Jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link
            href={`/student/jobs/${job.id}`}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Job Specification
          </Link>

          <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
            Applying as {user?.name || user?.email}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pt-8 space-y-8">
        {/* Job Brief Summary */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl flex items-center gap-5">
          <div className="h-16 w-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
            {job.company?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={job.company.logoUrl}
                alt={job.company.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Building2 className="h-8 w-8 text-blue-400" />
            )}
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-400">{job.company?.name}</span>
            <h1 className="text-xl font-bold text-white">{job.title}</h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-red-400" />
                {job.company?.location || job.location?.city || 'Location unspecified'}
              </span>
              <span>•</span>
              <span className="text-blue-400 font-medium">{job.workMode}</span>
              <span>•</span>
              <span className="text-indigo-400 font-medium">{job.employmentType.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {submitError && (
            <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{submitError}</p>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{successMsg}</p>
            </div>
          )}

          {/* Section 1: Resume Selection */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-400" />
                Select Resume for Application
              </h2>
              <Link
                href="/student/resumes"
                className="text-xs font-semibold text-blue-400 hover:underline"
              >
                Manage All Resumes →
              </Link>
            </div>

            {loadingResumes ? (
              <div className="py-4 flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                Loading your resumes...
              </div>
            ) : resumes.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-center space-y-3">
                <p className="text-xs text-slate-400">You haven&apos;t uploaded any resumes yet.</p>
                <button
                  type="button"
                  onClick={() => setShowQuickUpload(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                >
                  <Plus className="h-4 w-4" />
                  Upload Resume Now
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid gap-3">
                  {resumes.map((r) => (
                    <label
                      key={r.id}
                      className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedResumeId === r.id
                          ? 'border-blue-500 bg-blue-950/30'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="resumeId"
                          value={r.id}
                          checked={selectedResumeId === r.id}
                          onChange={() => setSelectedResumeId(r.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">{r.originalFileName}</span>
                            {r.isDefault && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                                <Star className="h-2.5 w-2.5 fill-blue-400 text-blue-400" />
                                Default
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {(r.fileSize / 1024).toFixed(0)} KB • Uploaded {new Date(r.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickUpload(!showQuickUpload)}
                    className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5 text-blue-400" />
                    {showQuickUpload ? 'Cancel quick upload' : 'Upload another resume'}
                  </button>
                </div>
              </div>
            )}

            {/* Quick Upload Expandable Form */}
            {showQuickUpload && (
              <div className="rounded-xl border border-blue-500/30 bg-slate-950 p-4 space-y-3 mt-3">
                <h3 className="text-xs font-bold text-slate-200">Quick Upload Resume</h3>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                />
                {uploadError && (
                  <p className="text-xs text-red-400">{uploadError}</p>
                )}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleQuickUpload}
                    disabled={!uploadFile || uploading}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Upload & Select
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Details */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-6">
            <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-400" />
              Cover Letter & Web Reference
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Cover Letter (Optional)
              </label>
              <textarea
                rows={6}
                maxLength={3000}
                placeholder="Introduce yourself and explain why your background and skills make you a strong candidate for this position..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500 mt-1 block text-right">
                {coverLetter.length} / 3000 characters
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Link2 className="h-3.5 w-3.5 text-indigo-400" />
                Additional Portfolio Link (Optional URL)
              </label>
              <input
                type="url"
                placeholder="https://github.com/yourusername or Portfolio URL"
                value={resumeUrl}
                onChange={(e) => setResumeUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-4">
            <Link
              href={`/student/jobs/${job.id}`}
              className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xl hover:bg-blue-500 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Confirm Application Submission
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
