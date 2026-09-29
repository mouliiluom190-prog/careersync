'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  getStudentResumes,
  uploadResume,
  setDefaultResume,
  deleteResume,
  getResumeDownloadUrl,
  Resume,
} from '@/lib/api-client';
import {
  FileText,
  Upload,
  CheckCircle2,
  Trash2,
  Download,
  Star,
  ArrowLeft,
  Loader2,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

export default function StudentResumesPage() {
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchResumes = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getStudentResumes(token);
      setResumes(data);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to load resumes');
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
      void fetchResumes();
    }
  }, [authLoading, isAuthenticated, token, router, fetchResumes]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (!allowedMimeTypes.includes(file.type) && !['pdf', 'doc', 'docx'].includes(ext || '')) {
      setUploadError('Only PDF, DOC, and DOCX files are supported.');
      setSelectedFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must not exceed 5 MB.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedFile) return;

    setUploading(true);
    setUploadError(null);
    setActionSuccess(null);

    try {
      await uploadResume(token, selectedFile);
      setSelectedFile(null);
      setActionSuccess('Resume uploaded successfully!');
      await fetchResumes();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setUploadError(errorObj.message || 'Failed to upload resume. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSetDefault = async (resumeId: string) => {
    if (!token) return;
    setActionLoadingId(resumeId);
    setActionSuccess(null);
    setError(null);
    try {
      await setDefaultResume(token, resumeId);
      setActionSuccess('Default resume updated');
      await fetchResumes();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to update default resume');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (resumeId: string) => {
    if (!token) return;
    if (!confirm('Are you sure you want to delete this resume?')) return;

    setActionLoadingId(resumeId);
    setActionSuccess(null);
    setError(null);
    try {
      const res = await deleteResume(token, resumeId);
      setActionSuccess(res.message || 'Resume removed successfully');
      await fetchResumes();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to delete resume');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownload = async (resumeId: string) => {
    if (!token) return;
    setActionLoadingId(resumeId);
    try {
      const res = await getResumeDownloadUrl(token, resumeId);
      window.open(res.downloadUrl, '_blank');
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      alert(errorObj.message || 'Unable to download resume');
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (isoStr: string): string => {
    return new Date(isoStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Header Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <span className="text-slate-700">|</span>
            <span className="text-sm font-semibold text-blue-400 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              My Resumes
            </span>
          </div>

          <Link
            href="/student/applications"
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            My Applications
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pt-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Resume Management</h1>
          <p className="text-sm text-slate-400 mt-1">
            Upload, manage, and select resumes for your job applications.
          </p>
        </div>

        {/* Action Alerts */}
        {actionSuccess && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400 text-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p>{actionSuccess}</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Upload Resume Form */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-400" />
            Upload New Resume
          </h2>

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 bg-slate-950/50 transition-colors text-center cursor-pointer relative">
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-2">
                <FileCheck className="h-10 w-10 text-blue-400/80" />
                <p className="text-sm font-semibold text-slate-200">
                  {selectedFile ? selectedFile.name : 'Click or drag file to select resume'}
                </p>
                <p className="text-xs text-slate-500">
                  Accepted formats: <span className="text-slate-300">PDF, DOC, DOCX</span> • Max size: <span className="text-slate-300">5 MB</span>
                </p>
              </div>
            </div>

            {uploadError && (
              <div className="text-xs font-medium text-red-400 flex items-center gap-1.5 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!selectedFile || uploading}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload Resume
              </button>
            </div>
          </form>
        </section>

        {/* Existing Resumes List */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-400" />
            Uploaded Resumes ({resumes.length})
          </h2>

          {resumes.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-3">
              <FileText className="mx-auto h-12 w-12 text-slate-600" />
              <h3 className="text-base font-semibold text-slate-300">No Resumes Uploaded Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Upload your resume above to easily select it when applying for active career opportunities.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {resumes.map((resume) => (
                <div
                  key={resume.id}
                  className={`rounded-2xl border p-5 transition-all shadow-md flex flex-col justify-between space-y-4 ${
                    resume.isDefault
                      ? 'border-blue-500/50 bg-blue-950/20 shadow-blue-950/50'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-white truncate max-w-[200px]" title={resume.originalFileName}>
                            {resume.originalFileName}
                          </h3>
                          <span className="text-[11px] text-slate-400">
                            {formatFileSize(resume.fileSize)} • Uploaded {formatDate(resume.createdAt)}
                          </span>
                        </div>
                      </div>

                      {resume.isDefault && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2.5 py-0.5 rounded-full shrink-0">
                          <Star className="h-3 w-3 fill-blue-400 text-blue-400" />
                          Default
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownload(resume.id)}
                        disabled={actionLoadingId === resume.id}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                      >
                        {actionLoadingId === resume.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5 text-blue-400" />
                        )}
                        View / Download
                      </button>

                      {!resume.isDefault && (
                        <button
                          onClick={() => handleSetDefault(resume.id)}
                          disabled={actionLoadingId === resume.id}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50"
                        >
                          <Star className="h-3.5 w-3.5 text-amber-400" />
                          Make Default
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(resume.id)}
                      disabled={actionLoadingId === resume.id}
                      className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      title="Delete Resume"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
