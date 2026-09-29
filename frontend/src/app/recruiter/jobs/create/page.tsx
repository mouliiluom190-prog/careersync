'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  createJob,
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
} from 'lucide-react';

export default function CreateJobPage() {
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

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

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

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

  const handleCreateAndAddSkill = async () => {
    if (!skillSearchQuery.trim() || !token) return;
    try {
      const newSkill = await apiFetch<Skill>(
        '/skills',
        {
          method: 'POST',
          body: JSON.stringify({ name: skillSearchQuery.trim() }),
        },
        token,
      );
      handleAddSkill(newSkill);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to create skill');
    }
  };

  const handleRemoveSkill = (skillId: string) => {
    setSelectedSkills(selectedSkills.filter((s) => s.id !== skillId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    // Client side salary validation rule check
    if (form.salaryMin && form.salaryMax && parseFloat(form.salaryMax) < parseFloat(form.salaryMin)) {
      setError('Salary Maximum cannot be less than Salary Minimum');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createJob(token, {
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

      router.push('/recruiter/jobs');
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to post job');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
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
            Post New Job Opportunity
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pt-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Alert */}
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Section 1: Job Basics */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
              1. Job Basics
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Job Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Senior Full-Stack Engineer"
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
                placeholder="Provide a detailed description of roles, responsibilities, expectations, and tech stack..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 2: Job Type & Work Mode */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
              2. Employment Classification
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

          {/* Section 3: Compensation & Openings */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
              3. Compensation & Openings
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Salary Minimum
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 80000"
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
                  placeholder="e.g. 120000"
                  value={form.salaryMax}
                  onChange={(e) => setForm({ ...form, salaryMax: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Currency
                </label>
                <input
                  type="text"
                  placeholder="INR / USD"
                  value={form.salaryCurrency}
                  onChange={(e) => setForm({ ...form, salaryCurrency: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Number of Openings
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.openings}
                  onChange={(e) => setForm({ ...form, openings: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Application Deadline
                </label>
                <input
                  type="date"
                  value={form.applicationDeadline}
                  onChange={(e) => setForm({ ...form, applicationDeadline: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Required Skills */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              4. Required Skills
            </h2>

            {/* Selected Skill Tags */}
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

            {/* Skill Search Input */}
            <div className="relative pt-2">
              <Search className="absolute left-3.5 top-5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search and select required skills (e.g., Python, Docker)..."
                value={skillSearchQuery}
                onChange={(e) => setSkillSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
              {searchingSkills && (
                <Loader2 className="absolute right-3.5 top-5 h-4 w-4 animate-spin text-indigo-400" />
              )}
            </div>

            {/* Dropdown Suggestions */}
            {skillSearchQuery.trim() !== '' && (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-2 shadow-2xl max-h-48 overflow-y-auto space-y-1">
                {skillSearchResults.length > 0 ? (
                  skillSearchResults.map((sk) => {
                    const isSelected = selectedSkills.some((s) => s.id === sk.id);
                    return (
                      <div
                        key={sk.id}
                        className="flex items-center justify-between rounded-lg p-2 hover:bg-slate-900 text-sm"
                      >
                        <span className="text-slate-200">{sk.name}</span>
                        {!isSelected ? (
                          <button
                            type="button"
                            onClick={() => handleAddSkill(sk)}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
                          >
                            <Plus className="h-3 w-3" /> Add
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">Added</span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-3 text-center text-xs text-slate-400 space-y-2">
                    <p>No matching skill found for &quot;{skillSearchQuery}&quot;</p>
                    <button
                      type="button"
                      onClick={handleCreateAndAddSkill}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                    >
                      <Plus className="h-3 w-3" /> Create & Add &quot;{skillSearchQuery.trim()}&quot;
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 5: Initial Status */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Publish Status</h3>
              <p className="text-xs text-slate-400">
                ACTIVE jobs immediately appear in public student search. DRAFT jobs remain private.
              </p>
            </div>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as JobStatus })}
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-semibold text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="ACTIVE">Publish Active</option>
              <option value="DRAFT">Save as Draft</option>
            </select>
          </div>

          {/* Submit Actions */}
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
              Publish Job Listing
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
