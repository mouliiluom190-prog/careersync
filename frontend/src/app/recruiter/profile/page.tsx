'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import {
  User,
  Building2,
  Globe,
  MapPin,
  Edit3,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Loader2,
  PlusCircle,
  Briefcase,
  BadgeCheck,
} from 'lucide-react';

interface CompanyData {
  id: string;
  name: string;
  website?: string | null;
  location?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  verified: boolean;
}

interface RecruiterProfileData {
  id: string;
  userId: string;
  name: string;
  phone?: string | null;
  designation?: string | null;
  bio?: string | null;
  profileImageUrl?: string | null;
  companyId?: string | null;
  completionScore: number;
  company?: CompanyData | null;
  user?: {
    email: string;
  };
}

export default function RecruiterProfilePage() {
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<RecruiterProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Recruiter Profile Edit Form State
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    designation: '',
    bio: '',
    profileImageUrl: '',
  });
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  // Company Form State (Create or Edit)
  const [isEditingCompany, setIsEditingCompany] = useState<boolean>(false);
  const [companyForm, setCompanyForm] = useState({
    name: '',
    website: '',
    location: '',
    description: '',
    logoUrl: '',
  });
  const [savingCompany, setSavingCompany] = useState<boolean>(false);

  // Fetch Recruiter Profile
  const fetchProfile = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<RecruiterProfileData>(
        '/recruiters/me/profile',
        { method: 'GET' },
        token,
      );
      setProfile(data);

      setProfileForm({
        name: data.name || '',
        phone: data.phone || '',
        designation: data.designation || '',
        bio: data.bio || '',
        profileImageUrl: data.profileImageUrl || '',
      });

      if (data.company) {
        setCompanyForm({
          name: data.company.name || '',
          website: data.company.website || '',
          location: data.company.location || '',
          description: data.company.description || '',
          logoUrl: data.company.logoUrl || '',
        });
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to load recruiter profile');
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
      void fetchProfile();
    }
  }, [authLoading, isAuthenticated, token, router, fetchProfile]);

  // Update Recruiter Profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSavingProfile(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const updated = await apiFetch<RecruiterProfileData>(
        '/recruiters/me/profile',
        {
          method: 'PATCH',
          body: JSON.stringify({
            name: profileForm.name,
            phone: profileForm.phone || undefined,
            designation: profileForm.designation || undefined,
            bio: profileForm.bio || undefined,
            profileImageUrl: profileForm.profileImageUrl || undefined,
          }),
        },
        token,
      );

      setProfile(updated);
      setIsEditingProfile(false);
      setSuccessMsg('Recruiter profile updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to update recruiter profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // Create or Update Company
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSavingCompany(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (profile?.company?.id) {
        // Update existing company
        await apiFetch<CompanyData>(
          `/companies/${profile.company.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              name: companyForm.name,
              website: companyForm.website || undefined,
              location: companyForm.location || undefined,
              description: companyForm.description || undefined,
              logoUrl: companyForm.logoUrl || undefined,
            }),
          },
          token,
        );
        setSuccessMsg('Company details updated successfully!');
      } else {
        // Create new company and automatically link
        await apiFetch<CompanyData>(
          '/companies',
          {
            method: 'POST',
            body: JSON.stringify({
              name: companyForm.name,
              website: companyForm.website || undefined,
              location: companyForm.location || undefined,
              description: companyForm.description || undefined,
              logoUrl: companyForm.logoUrl || undefined,
            }),
          },
          token,
        );
        setSuccessMsg('Company created and linked to your recruiter profile!');
      }

      setIsEditingCompany(false);
      await fetchProfile();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to save company information');
    } finally {
      setSavingCompany(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span>Loading recruiter profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12">
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
              <Briefcase className="h-5 w-5 text-indigo-400" />
              Recruiter Profile & Company
            </h1>
          </div>

          <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
            {user?.role}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pt-8 space-y-8">
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

        {/* Recruiter Header & Score Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative h-20 w-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                {profile?.profileImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.profileImageUrl}
                    alt={profile.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-10 w-10 text-slate-500" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{profile?.name}</h2>
                <p className="text-sm text-slate-400">{user?.email}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-300">
                  <span className="flex items-center gap-1 font-medium text-indigo-300">
                    <Briefcase className="h-3.5 w-3.5 text-indigo-400" />
                    {profile?.designation || 'No designation set'}
                  </span>
                  {profile?.company && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-300">
                        <Building2 className="h-3.5 w-3.5 text-blue-400" />
                        {profile.company.name}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-indigo-500 self-start md:self-center"
            >
              <Edit3 className="h-4 w-4" />
              {isEditingProfile ? 'Cancel Edit' : 'Edit Profile'}
            </button>
          </div>

          {/* Completion Score */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-semibold text-slate-200">
                  Profile Completion Score
                </span>
              </div>
              <span className="text-sm font-bold text-indigo-400">
                {profile?.completionScore || 0}%
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-500 ease-out"
                style={{ width: `${profile?.completionScore || 0}%` }}
              />
            </div>
            <p className="text-xs text-slate-500">
              Breakdown: Basic Info (25%) + Designation (25%) + Bio (25%) + Company Association (25%)
            </p>
          </div>
        </div>

        {/* Edit Recruiter Form */}
        {isEditingProfile && (
          <form
            onSubmit={handleUpdateProfile}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4"
          >
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
              Edit Recruiter Profile Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+1 (555) 000-0000"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Designation / Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Talent Acquisition Specialist"
                  value={profileForm.designation}
                  onChange={(e) => setProfileForm({ ...profileForm, designation: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Profile Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={profileForm.profileImageUrl}
                  onChange={(e) => setProfileForm({ ...profileForm, profileImageUrl: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Professional Bio
              </label>
              <textarea
                rows={3}
                placeholder="Brief summary of your recruiting background and focus areas..."
                value={profileForm.bio}
                onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Profile
              </button>
            </div>
          </form>
        )}

        {/* Company Card / Creation Section */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-blue-400" />
              <div>
                <h3 className="text-lg font-bold text-white">Associated Company</h3>
                <p className="text-xs text-slate-400">
                  Manage your organization&apos;s corporate profile.
                </p>
              </div>
            </div>

            {profile?.company && (
              <button
                onClick={() => setIsEditingCompany(!isEditingCompany)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <Edit3 className="h-3.5 w-3.5" />
                {isEditingCompany ? 'Cancel Edit' : 'Edit Company'}
              </button>
            )}
          </div>

          {profile?.company ? (
            /* Linked Company Display */
            !isEditingCompany ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                    {profile.company.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.company.logoUrl}
                        alt={profile.company.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Building2 className="h-8 w-8 text-slate-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xl font-bold text-white">{profile.company.name}</h4>
                      {profile.company.verified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                          <BadgeCheck className="h-3.5 w-3.5" /> Verified Company
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-1 text-xs text-slate-400">
                      {profile.company.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-red-400" />
                          {profile.company.location}
                        </span>
                      )}
                      {profile.company.website && (
                        <a
                          href={profile.company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-400 hover:underline"
                        >
                          <Globe className="h-3.5 w-3.5" />
                          {profile.company.website}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Company Description
                  </span>
                  <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                    {profile.company.description || 'No description provided.'}
                  </p>
                </div>
              </div>
            ) : null
          ) : (
            /* No Company Linked - Prompt to create */
            !isEditingCompany && (
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center space-y-4">
                <Building2 className="mx-auto h-12 w-12 text-slate-600" />
                <div className="space-y-1">
                  <h4 className="text-base font-semibold text-white">No Company Linked Yet</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Create a new company profile to link your recruiter account and unlock job posting features in Phase 5.
                  </p>
                </div>
                <button
                  onClick={() => setIsEditingCompany(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 shadow-lg"
                >
                  <PlusCircle className="h-4 w-4" />
                  Create & Link Company
                </button>
              </div>
            )
          )}

          {/* Company Create / Edit Form */}
          {isEditingCompany && (
            <form onSubmit={handleSaveCompany} className="space-y-4 pt-2">
              <h4 className="text-base font-bold text-white">
                {profile?.company ? 'Edit Company Information' : 'Create New Company'}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corporation"
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Website URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://acme.com"
                    value={companyForm.website}
                    onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Headquarters / Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. San Francisco, CA"
                    value={companyForm.location}
                    onChange={(e) => setCompanyForm({ ...companyForm, location: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Company Logo URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://acme.com/logo.png"
                    value={companyForm.logoUrl}
                    onChange={(e) => setCompanyForm({ ...companyForm, logoUrl: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Company Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Overview of your company's mission, products, and tech stack..."
                  value={companyForm.description}
                  onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditingCompany(false)}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCompany}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {savingCompany && <Loader2 className="h-4 w-4 animate-spin" />}
                  {profile?.company ? 'Update Company' : 'Create & Link Company'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
