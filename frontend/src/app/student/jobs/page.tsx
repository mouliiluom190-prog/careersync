'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getPublicJobs, Job, PaginatedResponse } from '@/lib/api-client';
import {
  Briefcase,
  Search,
  MapPin,
  Building2,
  Clock,
  DollarSign,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Filter,
  ArrowLeft,
  BadgeCheck,
} from 'lucide-react';

export default function StudentJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 9, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [page, setPage] = useState(1);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: PaginatedResponse<Job> = await getPublicJobs({
        search: search.trim() || undefined,
        employmentType: employmentType || undefined,
        experienceLevel: experienceLevel || undefined,
        workMode: workMode || undefined,
        page,
        limit: 9,
      });
      setJobs(res.data || []);
      setMeta(res.meta || { page: 1, limit: 9, total: 0, totalPages: 1 });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [search, employmentType, experienceLevel, workMode, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchJobs();
  }, [fetchJobs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void fetchJobs();
  };

  const handleResetFilters = () => {
    setSearch('');
    setEmploymentType('');
    setExperienceLevel('');
    setWorkMode('');
    setPage(1);
  };

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
              <Briefcase className="h-5 w-5 text-blue-400" />
              Explore Active Jobs
            </h1>
          </div>
          <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 border border-blue-500/20">
            {meta.total} Active {meta.total === 1 ? 'Job' : 'Jobs'} Found
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pt-8 space-y-8">
        {/* Search & Filter Controls */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by job title, description, company, or skill (e.g. React, Engineer)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-blue-500"
            >
              <Search className="h-4 w-4" />
              Search
            </button>
          </form>

          {/* Filter Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Employment Type
              </label>
              <select
                value={employmentType}
                onChange={(e) => {
                  setEmploymentType(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Employment Types</option>
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="CONTRACT">Contract</option>
                <option value="TEMPORARY">Temporary</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Experience Level
              </label>
              <select
                value={experienceLevel}
                onChange={(e) => {
                  setExperienceLevel(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Experience Levels</option>
                <option value="ENTRY">Entry Level</option>
                <option value="JUNIOR">Junior</option>
                <option value="MID">Mid Level</option>
                <option value="SENIOR">Senior</option>
                <option value="LEAD">Lead / Manager</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Work Mode
              </label>
              <select
                value={workMode}
                onChange={(e) => {
                  setWorkMode(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Work Modes</option>
                <option value="ONSITE">Onsite</option>
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleResetFilters}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Job Cards Grid */}
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center text-slate-400">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <span>Fetching job postings...</span>
            </div>
          </div>
        ) : jobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md transition-all hover:border-blue-500/50 hover:bg-slate-900/80"
              >
                <div className="space-y-4">
                  {/* Company & Title Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                        {job.company?.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={job.company.logoUrl}
                            alt={job.company.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Building2 className="h-6 w-6 text-blue-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-400">
                            {job.company?.name || 'Company'}
                          </span>
                          {job.company?.verified && (
                            <BadgeCheck className="h-3.5 w-3.5 text-emerald-400" />
                          )}
                        </div>
                        <h2 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                          {job.title}
                        </h2>
                      </div>
                    </div>
                  </div>

                  {/* Metadata Tags */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-lg bg-blue-500/10 px-2.5 py-1 font-semibold text-blue-300 border border-blue-500/20">
                      {job.workMode}
                    </span>
                    <span className="rounded-lg bg-indigo-500/10 px-2.5 py-1 font-semibold text-indigo-300 border border-indigo-500/20">
                      {job.employmentType.replace('_', ' ')}
                    </span>
                    <span className="rounded-lg bg-slate-800 px-2.5 py-1 font-semibold text-slate-300">
                      {job.experienceLevel}
                    </span>
                  </div>

                  {/* Salary & Location */}
                  <div className="space-y-1.5 text-xs text-slate-400 pt-1">
                    {(job.salaryMin !== null && job.salaryMin !== undefined) ||
                    (job.salaryMax !== null && job.salaryMax !== undefined) ? (
                      <div className="flex items-center gap-1.5 font-medium text-emerald-400">
                        <DollarSign className="h-3.5 w-3.5" />
                        <span>
                          {job.salaryMin ? `${job.salaryMin.toLocaleString()}` : ''}
                          {job.salaryMin && job.salaryMax ? ' - ' : ''}
                          {job.salaryMax ? `${job.salaryMax.toLocaleString()}` : ''}{' '}
                          {job.salaryCurrency || 'INR'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <DollarSign className="h-3.5 w-3.5" />
                        <span>Salary Not Specified</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-red-400" />
                      <span>{job.company?.location || job.location?.city || 'Location unspecified'}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-400" />
                      <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Skills Preview */}
                  {job.skills && job.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {job.skills.slice(0, 4).map((s) => (
                        <span
                          key={s.skillId}
                          className="rounded-md bg-slate-950 px-2 py-0.5 text-[11px] text-slate-300 border border-slate-800"
                        >
                          {s.skill.name}
                        </span>
                      ))}
                      {job.skills.length > 4 && (
                        <span className="text-[11px] text-slate-500 self-center">
                          +{job.skills.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="pt-6 border-t border-slate-800/80 mt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-mono">
                    {job.openings} {job.openings === 1 ? 'opening' : 'openings'}
                  </span>
                  <Link
                    href={`/student/jobs/${job.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-600 transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    View Job Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center space-y-4">
            <Briefcase className="mx-auto h-12 w-12 text-slate-600" />
            <h3 className="text-lg font-semibold text-white">No active jobs matched your search</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting your search terms, employment filters, or work mode parameters.
            </p>
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Pagination Bar */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-800 pt-6">
            <span className="text-xs text-slate-400">
              Page {meta.page} of {meta.totalPages} ({meta.total} total items)
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
