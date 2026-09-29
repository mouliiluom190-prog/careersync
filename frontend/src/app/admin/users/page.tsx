'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  getAdminUsers,
  updateAdminUserStatus,
  AdminUser,
} from '@/lib/api-client';
import {
  Users,
  ArrowLeft,
  Loader2,
  Search,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function AdminUsersPage() {
  const { token, user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminUsers(token, page, 10, roleFilter || undefined, search || undefined);
      setUsers(res.data || []);
      setMeta(res.meta || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to load user list');
    } finally {
      setLoading(false);
    }
  }, [token, page, roleFilter, search]);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || currentUser?.role !== 'ADMIN')) {
      router.push('/login');
      return;
    }
    if (token && currentUser?.role === 'ADMIN') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchUsers();
    }
  }, [authLoading, isAuthenticated, currentUser, token, router, fetchUsers]);

  const handleToggleStatus = async (user: AdminUser) => {
    if (!token) return;
    if (user.id === currentUser?.id && user.isActive) {
      alert('You cannot deactivate your own admin account');
      return;
    }
    setUpdatingId(user.id);
    try {
      const updated = await updateAdminUserStatus(token, user.id, !user.isActive);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: updated.isActive } : u)),
      );
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      alert(errorObj.message || 'Failed to update user status');
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
          <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
            User Management Module
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pt-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
              <Users className="h-6 w-6 text-blue-400" />
              Platform Users
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Inspect user roles, status, and execute administrative account activations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search email or name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-800 bg-slate-900/80 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
            >
              <option value="">All Roles</option>
              <option value="STUDENT">STUDENT</option>
              <option value="RECRUITER">RECRUITER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-red-500 mr-2" />
            <span>Loading user registry...</span>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-400">
            {error}
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center text-slate-500">
            No matching users found.
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 bg-slate-950/60 font-semibold text-slate-400 uppercase">
                  <tr>
                    <th className="px-5 py-3.5">User</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Account Status</th>
                    <th className="px-5 py-3.5">Registered</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users.map((u) => {
                    const profileName =
                      u.studentProfile?.name ||
                      u.recruiterProfile?.name ||
                      u.email.split('@')[0];

                    return (
                      <tr key={u.id} className="hover:bg-slate-800/40">
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-white">{profileName}</p>
                          <p className="text-[11px] text-slate-400">{u.email}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-block rounded px-2 py-0.5 font-mono text-[10px] font-bold border ${
                              u.role === 'ADMIN'
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : u.role === 'RECRUITER'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {u.isActive ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-400 font-semibold">
                              <XCircle className="h-3.5 w-3.5" />
                              Deactivated
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-400">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            disabled={updatingId === u.id || u.id === currentUser?.id}
                            onClick={() => handleToggleStatus(u)}
                            className={`rounded-xl px-3 py-1.5 font-semibold text-[11px] transition-colors disabled:opacity-40 border ${
                              u.isActive
                                ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                            }`}
                          >
                            {updatingId === u.id ? (
                              <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                            ) : u.isActive ? (
                              'Deactivate'
                            ) : (
                              'Activate'
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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
