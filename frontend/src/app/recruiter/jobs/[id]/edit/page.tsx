'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  getRecruiterJob,
  updateJob,
  apiFetch,
  Skill,
  EmploymentType,
  ExperienceLevel,
  WorkMode,
  JobStatus,
} from '@/lib/api-client';
import {
  Briefcase,
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export default function EditJobPage() {
  const params = useParams();
  const jobId = params?.id as string;

  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [loadingJob, setLoadingJob] = useState(true);
  const [form, setForm] = useState({
    title: '',
    description: '',
    employmentType: 'FULL_TIME' as EmploymentType,
    experienceLevel: 'ENTRY' as ExperienceLevel,
    workMode: 'ONSITE' as WorkMode,
    salaryMin: '',
    salaryMax: '',
    salaryCurrency: 'INR',
    openings: '1',
    applicationDeadline: '',
    status: 'ACTIVE' as JobStatus,
  });

  // Skill Selection State
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);
  const [skillSearchQuery, setSkillSearchQuery] = useState('');
  const [skillSearchResults, setSkillSearchResults] = useState<Skill[]>([]);
  const [searchingSkills, setSearchingSkills] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadJobData = useCallback(async () => {
    if (!token || !jobId) return;
    setLoadingJob(true);
    setError(null);
    try {
      const existing = await getRecruiterJob(token, jobId);
      setForm({
        title: existing.title || '',
        description: existing.description || '',
        employmentType: existing.employmentType || 'FULL_TIME',
        experienceLevel: existing.experienceLevel || 'ENTRY',
        workMode: existing.workMode || 'ONSITE',
        salaryMin: existing.salaryMin !== null && existing.salaryMin !== undefined ? String(existing.salaryMin) : '',
        salaryMax: existing.salaryMax !== null && existing.salaryMax !== undefined ? String(existing.salaryMax) : '',
        salaryCurrency: existing.salaryCurrency || 'INR',
        openings: String(existing.openings || 1),
        applicationDeadline: existing.applicationDeadline
          ? new Date(existing.applicationDeadline).toISOString().split('T')[0]
          : '',
        status: existing.status || 'ACTIVE',
      });

      if (existing.skills && existing.skills.length > 0) {
        setSelectedSkills(existing.skills.map((s) => s.skill));
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to load job details');
    } finally {
      setLoadingJob(false);
    }
  }, [token, jobId]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadJobData();
    }
  }, [authLoading, isAuthenticated, token, router, loadJobData]);

  // Skill Search Debounce
  useEffect(() => {
    if (!skillSearchQuery.trim() || !token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSkillSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingSkills(true);
      try {
        const results = await apiFetch<Skill[]>(
          `/skills?search=${encodeURIComponent(skillSearchQuery.trim())}`,
          { method: 'GET' },
          token,
        );
        setSkillSearchResults(results);
      } catch {
        setSkillSearchResults([]);
      } finally {
        setSearchingSkills(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [skillSearchQuery, token]);

  const handleAddSkill = (skill: Skill) => {
    if (!selectedSkills.some((s) => s.id === skill.id)) {
      setSelectedSkills([...selectedSkills, skill]);
    }
    setSkillSearchQuery('');
    setSkillSearchResults([]);
  };

  const handleRemoveSkill = (skillId: string) => {
    setSelectedSkills(selectedSkills.filter((s) => s.id !== skillId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !jobId) return;

    if (form.salaryMin && form.salaryMax && parseFloat(form.salaryMax) < parseFloat(form.salaryMin)) {
      setError('Salary Maximum cannot be less than Salary Minimum');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await updateJob(token, jobId, {
        title: form.title,
        description: form.description,
        employmentType: form.employmentType,
        experienceLevel: form.experienceLevel,
        workMode: form.workMode,
        salaryMin: form.salaryMin ? parseFloat(form.salaryMin) : undefined,
        salaryMax: form.salaryMax ? parseFloat(form.salaryMax) : undefined,
        salaryCurrency: form.salaryCurrency,
        openings: form.openings ? parseInt(form.openings, 10) : 1,
        applicationDeadline: form.applicationDeadline || undefined,
        skillIds: selectedSkills.map((s) => s.id),
        status: form.status,
      });

      setSuccessMsg('Job updated successfully!');
      setTimeout(() => {
        router.push('/recruiter/jobs');
      }, 1500);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to update job');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loadingJob) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/recruiter/jobs"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Recruiter Dashboard
          </Link>
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-indigo-400" />
            Edit Job Specification
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pt-8">
        <form onSubmit={handleSubmit} className="space-y-8">
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

          {/* Section 1: Job Basics */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
              1. Job Details
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Job Title *
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Job Description *
              </label>
              <textarea
                rows={6}
                required
                minLength={10}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 2: Classification */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
              2. Classification & Work Mode
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Employment Type
                </label>
                <select
                  value={form.employmentType}
                  onChange={(e) => setForm({ ...form, employmentType: e.target.value as EmploymentType })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="INTERNSHIP">Internship</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="TEMPORARY">Temporary</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Experience Level
                </label>
                <select
                  value={form.experienceLevel}
                  onChange={(e) => setForm({ ...form, experienceLevel: e.target.value as ExperienceLevel })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="ENTRY">Entry Level</option>
                  <option value="JUNIOR">Junior</option>
                  <option value="MID">Mid Level</option>
                  <option value="SENIOR">Senior</option>
                  <option value="LEAD">Lead / Manager</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Work Mode
                </label>
                <select
                  value={form.workMode}
                  onChange={(e) => setForm({ ...form, workMode: e.target.value as WorkMode })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="ONSITE">Onsite</option>
                  <option value="REMOTE">Remote</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Compensation */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
              3. Compensation & Status
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Salary Minimum
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.salaryMin}
                  onChange={(e) => setForm({ ...form, salaryMin: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Salary Maximum
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.salaryMax}
                  onChange={(e) => setForm({ ...form, salaryMax: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Job Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as JobStatus })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="CLOSED">CLOSED</option>
                  <option value="EXPIRED">EXPIRED</option>
                </select>
              </div>
            </div>
          </div>

          {/* Required Skills */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              Required Skills
            </h2>

            <div className="flex flex-wrap gap-2">
              {selectedSkills.map((sk) => (
                <div
                  key={sk.id}
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-medium text-indigo-300"
                >
                  <span>{sk.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(sk.id)}
                    className="text-indigo-400 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="relative pt-2">
              <Search className="absolute left-3.5 top-5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search skills to add..."
                value={skillSearchQuery}
                onChange={(e) => setSkillSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
              {searchingSkills && (
                <Loader2 className="absolute right-3.5 top-5 h-4 w-4 animate-spin text-indigo-400" />
              )}
            </div>

            {skillSearchQuery.trim() !== '' && (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-2 shadow-2xl max-h-48 overflow-y-auto space-y-1">
                {skillSearchResults.map((sk) => (
                  <div
                    key={sk.id}
                    className="flex items-center justify-between rounded-lg p-2 hover:bg-slate-900 text-sm"
                  >
                    <span className="text-slate-200">{sk.name}</span>
                    <button
                      type="button"
                      onClick={() => handleAddSkill(sk)}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
                    >
                      <Plus className="h-3 w-3" /> Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-4 pt-4">
            <Link
              href="/recruiter/jobs"
              className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-xl hover:bg-indigo-500 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Job Changes
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
