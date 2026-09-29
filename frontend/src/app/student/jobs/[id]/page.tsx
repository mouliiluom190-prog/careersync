'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getPublicJob, Job } from '@/lib/api-client';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Clock,
  Briefcase,
  Users,
  Sparkles,
  Calendar,
  Globe,
  Loader2,
  BadgeCheck,
} from 'lucide-react';

export default function StudentJobDetailPage() {
  const params = useParams();
  const jobId = params?.id as string;
  const { user } = useAuth();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobDetails = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getPublicJob(jobId);
      setJob(data);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchJobDetails();
  }, [fetchJobDetails]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span>Loading job specification...</span>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white p-6">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center max-w-md space-y-4">
          <h2 className="text-xl font-bold text-red-400">Job Not Found</h2>
          <p className="text-sm text-slate-400">
            {error || 'This position is either closed or no longer accepting applications.'}
          </p>
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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/student/jobs"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </Link>

          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            {job.status}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pt-8 space-y-8">
        {/* Main Header Banner */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl backdrop-blur-md space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="h-20 w-20 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                {job.company?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={job.company.logoUrl}
                    alt={job.company.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 className="h-10 w-10 text-blue-400" />
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-400">
                    {job.company?.name || 'Company'}
                  </span>
                  {job.company?.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400 border border-emerald-500/20">
                      <BadgeCheck className="h-3 w-3" /> Verified Company
                    </span>
                  )}
                </div>

                <h1 className="text-2xl md:text-3xl font-extrabold text-white">
                  {job.title}
                </h1>

                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-red-400" />
                    {job.company?.location || job.location?.city || 'Location unspecified'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                    Posted {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-blue-400" />
                    {job.openings} {job.openings === 1 ? 'opening' : 'openings'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Box */}
            <div className="flex flex-col gap-2 shrink-0 self-start md:self-center">
              {user && user.role === 'STUDENT' ? (
                <Link
                  href={`/student/jobs/${job.id}/apply`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-xl hover:bg-blue-500 transition-colors"
                >
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  Apply Now
                </Link>
              ) : !user ? (
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-xl hover:bg-blue-500 transition-colors"
                >
                  Sign In to Apply
                </Link>
              ) : (
                <span className="text-xs font-semibold text-slate-400 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                  Recruiter View Mode
                </span>
              )}
            </div>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80">
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
              <span className="text-[11px] font-medium text-slate-400">Employment Type</span>
              <p className="text-sm font-semibold text-blue-400 mt-0.5">
                {job.employmentType.replace('_', ' ')}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
              <span className="text-[11px] font-medium text-slate-400">Work Mode</span>
              <p className="text-sm font-semibold text-indigo-400 mt-0.5">{job.workMode}</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
              <span className="text-[11px] font-medium text-slate-400">Experience Level</span>
              <p className="text-sm font-semibold text-slate-200 mt-0.5">
                {job.experienceLevel}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
              <span className="text-[11px] font-medium text-slate-400">Salary Range</span>
              <p className="text-sm font-semibold text-emerald-400 mt-0.5">
                {job.salaryMin || job.salaryMax
                  ? `${job.salaryMin ? job.salaryMin.toLocaleString() : '0'} - ${job.salaryMax ? job.salaryMax.toLocaleString() : 'Negotiable'} ${job.salaryCurrency}`
                  : 'Undisclosed'}
              </p>
            </div>
          </div>
        </div>

        {/* Job Description & Required Skills */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-400" />
                Job Description
              </h2>
              <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {job.description}
              </div>
            </div>

            {/* Required Skills */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-400" />
                Required Skills & Knowledge
              </h2>
              {job.skills && job.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2.5">
                  {job.skills.map((s) => (
                    <span
                      key={s.skillId}
                      className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-300"
                    >
                      {s.skill.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">No specific skills listed.</p>
              )}
            </div>
          </div>

          {/* Sidebar: Company & Deadline Info */}
          <div className="space-y-6">
            {/* Company Info Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-400" />
                About {job.company?.name || 'Company'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {job.company?.description || 'No company overview provided.'}
              </p>
              {job.company?.website && (
                <a
                  href={job.company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs font-semibold text-blue-400 hover:underline pt-2"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Visit Company Website
                </a>
              )}
            </div>

            {/* Deadline & Meta */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-3 text-xs">
              <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-400" />
                Application Deadline
              </h3>
              {job.applicationDeadline ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-300 font-medium">
                  Closing on {new Date(job.applicationDeadline).toLocaleDateString()}
                </div>
              ) : (
                <p className="text-slate-400">Applications are reviewed on a rolling basis.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
