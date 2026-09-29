'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  getAdminCompanies,
  updateAdminCompanyVerification,
  AdminCompany,
} from '@/lib/api-client';
import {
  Building2,
  ArrowLeft,
  Loader2,
  Search,
  CheckCircle2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function AdminCompaniesPage() {
  const { token, user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminCompanies(token, page, 10, search || undefined);
      setCompanies(res.data || []);
      setMeta(res.meta || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to load company list');
    } finally {
      setLoading(false);
    }
  }, [token, page, search]);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || currentUser?.role !== 'ADMIN')) {
      router.push('/login');
      return;
    }
    if (token && currentUser?.role === 'ADMIN') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchCompanies();
    }
  }, [authLoading, isAuthenticated, currentUser, token, router, fetchCompanies]);

  const handleToggleVerification = async (company: AdminCompany) => {
    if (!token) return;
    setUpdatingId(company.id);
    try {
      const updated = await updateAdminCompanyVerification(
        token,
        company.id,
        !company.isVerified,
      );
      setCompanies((prev) =>
        prev.map((c) => (c.id === company.id ? { ...c, isVerified: updated.isVerified } : c)),
      );
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      alert(errorObj.message || 'Failed to update company verification');
    } finally {
      setUpdatingId(null);
    }
  };

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
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            Company Verification Module
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pt-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
              <Building2 className="h-6 w-6 text-emerald-400" />
              Company Moderation & Verification
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Verify authentic hiring organizations to grant verified badges across job listings.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search company name or website..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-800 bg-slate-900/80 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mr-2" />
            <span>Loading registered companies...</span>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-400">
            {error}
          </div>
        ) : companies.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center text-slate-500">
            No matching companies found.
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 bg-slate-950/60 font-semibold text-slate-400 uppercase">
                  <tr>
                    <th className="px-5 py-3.5">Company Name</th>
                    <th className="px-5 py-3.5">Website</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Jobs Count</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {companies.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/40">
                      <td className="px-5 py-3.5 font-bold text-white flex items-center gap-2">
                        {c.name}
                        {c.isVerified && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">
                        {c.website ? (
                          <a
                            href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-400 hover:underline"
                          >
                            {c.website}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          'Not provided'
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {c.isVerified ? (
                          <span className="inline-block rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 font-semibold text-emerald-400">
                            Verified
                          </span>
                        ) : (
                          <span className="inline-block rounded-full bg-slate-500/10 border border-slate-500/20 px-2.5 py-0.5 font-semibold text-slate-400">
                            Unverified
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-300 font-mono">
                        {c._count?.jobs ?? 0}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          disabled={updatingId === c.id}
                          onClick={() => handleToggleVerification(c)}
                          className={`rounded-xl px-3 py-1.5 font-semibold text-[11px] transition-colors disabled:opacity-40 border ${
                            c.isVerified
                              ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                        >
                          {updatingId === c.id ? (
                            <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                          ) : c.isVerified ? (
                            'Revoke Verification'
                          ) : (
                            'Verify Company'
                          )}
                        </button>
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
