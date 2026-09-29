'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import {
  User,
  GraduationCap,
  Building,
  BookOpen,
  Award,
  Edit3,
  Plus,
  Trash2,
  CheckCircle,
  ArrowLeft,
  Search,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  category?: string;
}

interface StudentSkill {
  id: string;
  skillId: string;
  skill: Skill;
}

interface StudentProfileData {
  id: string;
  userId: string;
  name: string;
  phone?: string | null;
  college?: string | null;
  department?: string | null;
  degree?: string | null;
  cgpa?: number | null;
  profileImageUrl?: string | null;
  completionScore: number;
  skills: StudentSkill[];
  user?: {
    email: string;
  };
}

export default function StudentProfilePage() {
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<StudentProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Profile Edit State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    college: '',
    department: '',
    degree: '',
    cgpa: '',
    profileImageUrl: '',
  });
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  // Skill Management State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [skillResults, setSkillResults] = useState<Skill[]>([]);
  const [searchingSkills, setSearchingSkills] = useState<boolean>(false);
  const [addingSkill, setAddingSkill] = useState<boolean>(false);

  // Fetch Student Profile
  const fetchProfile = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<StudentProfileData>(
        '/students/me/profile',
        { method: 'GET' },
        token,
      );
      setProfile(data);
      setEditForm({
        name: data.name || '',
        phone: data.phone || '',
        college: data.college || '',
        department: data.department || '',
        degree: data.degree || '',
        cgpa: data.cgpa ? String(data.cgpa) : '',
        profileImageUrl: data.profileImageUrl || '',
      });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to load profile');
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

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSavingProfile(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const updated = await apiFetch<StudentProfileData>(
        '/students/me/profile',
        {
          method: 'PATCH',
          body: JSON.stringify({
            name: editForm.name,
            phone: editForm.phone || undefined,
            college: editForm.college || undefined,
            department: editForm.department || undefined,
            degree: editForm.degree || undefined,
            cgpa: editForm.cgpa ? parseFloat(editForm.cgpa) : undefined,
            profileImageUrl: editForm.profileImageUrl || undefined,
          }),
        },
        token,
      );

      setProfile(updated);
      setIsEditing(false);
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // Search Skills
  useEffect(() => {
    if (!searchQuery.trim() || !token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSkillResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingSkills(true);
      try {
        const results = await apiFetch<Skill[]>(
          `/skills?search=${encodeURIComponent(searchQuery.trim())}`,
          { method: 'GET' },
          token,
        );
        setSkillResults(results);
      } catch {
        setSkillResults([]);
      } finally {
        setSearchingSkills(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, token]);

  // Add Existing Skill
  const handleAddSkill = async (skillId: string) => {
    if (!token || !profile) return;
    setAddingSkill(true);
    setError(null);

    try {
      await apiFetch(
        '/students/me/skills',
        {
          method: 'POST',
          body: JSON.stringify({ skillId }),
        },
        token,
      );

      setSearchQuery('');
      setSkillResults([]);
      await fetchProfile();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to add skill');
    } finally {
      setAddingSkill(false);
    }
  };

  // Create and Add Custom Skill
  const handleCreateAndAddSkill = async () => {
    if (!searchQuery.trim() || !token || !profile) return;
    setAddingSkill(true);
    setError(null);

    try {
      // Create skill
      const newSkill = await apiFetch<Skill>(
        '/skills',
        {
          method: 'POST',
          body: JSON.stringify({ name: searchQuery.trim() }),
        },
        token,
      );

      // Add to student profile
      await apiFetch(
        '/students/me/skills',
        {
          method: 'POST',
          body: JSON.stringify({ skillId: newSkill.id }),
        },
        token,
      );

      setSearchQuery('');
      setSkillResults([]);
      await fetchProfile();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to create skill');
    } finally {
      setAddingSkill(false);
    }
  };

  // Remove Skill
  const handleRemoveSkill = async (skillId: string) => {
    if (!token || !profile) return;
    setError(null);

    try {
      await apiFetch(
        `/students/me/skills/${skillId}`,
        { method: 'DELETE' },
        token,
      );

      await fetchProfile();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to remove skill');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span>Loading student profile...</span>
        </div>
      </div>
    );
  }

  const existingSkillIds = new Set(profile?.skills?.map((s) => s.skillId) || []);

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
              <GraduationCap className="h-5 w-5 text-blue-400" />
              Student Profile
            </h1>
          </div>

          <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 border border-blue-500/20">
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
            <CheckCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{successMsg}</p>
          </div>
        )}

        {/* Profile Card & Score Banner */}
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
                  <span className="flex items-center gap-1">
                    <Building className="h-3.5 w-3.5 text-blue-400" />
                    {profile?.college || 'No college specified'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
                    {profile?.department || 'No department specified'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-blue-500 self-start md:self-center"
            >
              <Edit3 className="h-4 w-4" />
              {isEditing ? 'Cancel Edit' : 'Edit Profile'}
            </button>
          </div>

          {/* Profile Completion Score Bar */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-semibold text-slate-200">
                  Profile Completion Score
                </span>
              </div>
              <span className="text-sm font-bold text-blue-400">
                {profile?.completionScore || 0}%
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
                style={{ width: `${profile?.completionScore || 0}%` }}
              />
            </div>
            <p className="text-xs text-slate-500">
              Breakdown: Basic Info (20%) + Phone (15%) + College/Dept (25%) + Degree/CGPA (20%) + Skills (20%)
            </p>
          </div>
        </div>

        {/* Edit Modal / Form */}
        {isEditing && (
          <form
            onSubmit={handleUpdateProfile}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4"
          >
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
              Edit Academic & Personal Info
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+1 (555) 000-0000"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  College / University
                </label>
                <input
                  type="text"
                  placeholder="e.g. Stanford University"
                  value={editForm.college}
                  onChange={(e) => setEditForm({ ...editForm, college: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Department / Major
                </label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science"
                  value={editForm.department}
                  onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Degree Program
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bachelor of Science"
                  value={editForm.degree}
                  onChange={(e) => setEditForm({ ...editForm, degree: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  CGPA / Grade Point Average (0.00 - 10.00 or 4.00)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  placeholder="e.g. 3.85"
                  value={editForm.cgpa}
                  onChange={(e) => setEditForm({ ...editForm, cgpa: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Profile Image URL
              </label>
              <input
                type="url"
                placeholder="https://example.com/avatar.jpg"
                value={editForm.profileImageUrl}
                onChange={(e) => setEditForm({ ...editForm, profileImageUrl: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        )}

        {/* Academic Details Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
          <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-400" />
            Academic Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <span className="text-xs text-slate-400 font-medium">Degree</span>
              <p className="text-base font-semibold text-slate-100 mt-1">
                {profile?.degree || 'Not specified'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <span className="text-xs text-slate-400 font-medium">Department</span>
              <p className="text-base font-semibold text-slate-100 mt-1">
                {profile?.department || 'Not specified'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <span className="text-xs text-slate-400 font-medium">College</span>
              <p className="text-base font-semibold text-slate-100 mt-1">
                {profile?.college || 'Not specified'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <span className="text-xs text-slate-400 font-medium">CGPA</span>
              <p className="text-base font-semibold text-blue-400 mt-1 flex items-center gap-1">
                <Award className="h-4 w-4" />
                {profile?.cgpa !== null && profile?.cgpa !== undefined
                  ? profile.cgpa.toFixed(2)
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Skills Management Section */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-400" />
                Skills & Technologies
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Add skills to highlight your technical proficiency to recruiters.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
              {profile?.skills?.length || 0} Skills Added
            </span>
          </div>

          {/* Current Skills Chips */}
          <div className="flex flex-wrap gap-2">
            {profile?.skills && profile.skills.length > 0 ? (
              profile.skills.map((st) => (
                <div
                  key={st.id}
                  className="group inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3.5 py-1.5 text-sm font-medium text-blue-300 transition-colors hover:border-blue-500/50 hover:bg-blue-500/20"
                >
                  <span>{st.skill.name}</span>
                  <button
                    onClick={() => handleRemoveSkill(st.skillId)}
                    className="text-blue-400 hover:text-red-400 transition-colors"
                    title={`Remove ${st.skill.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 italic">
                No skills added yet. Search or add skills below.
              </p>
            )}
          </div>

          {/* Interactive Skill Search & Addition */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-semibold text-slate-300">
              Add Skills (Type to search or create custom skill)
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search skill (e.g., Python, React, PostgreSQL, Docker)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
              {searchingSkills && (
                <Loader2 className="absolute right-3.5 top-3 h-4 w-4 animate-spin text-blue-400" />
              )}
            </div>

            {/* Search Dropdown / Suggestion List */}
            {searchQuery.trim() !== '' && (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-2 space-y-1 shadow-2xl max-h-48 overflow-y-auto">
                {skillResults.length > 0 ? (
                  skillResults.map((skill) => {
                    const isAdded = existingSkillIds.has(skill.id);
                    return (
                      <div
                        key={skill.id}
                        className="flex items-center justify-between rounded-lg p-2 hover:bg-slate-900 text-sm"
                      >
                        <span className="text-slate-200 font-medium">{skill.name}</span>
                        {isAdded ? (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                            Added
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAddSkill(skill.id)}
                            disabled={addingSkill}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                          >
                            <Plus className="h-3 w-3" />
                            Add
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-3 text-center text-sm space-y-2">
                    <p className="text-slate-400">
                      No matching skill found for &quot;{searchQuery}&quot;.
                    </p>
                    <button
                      onClick={handleCreateAndAddSkill}
                      disabled={addingSkill}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {addingSkill ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      Create and add &quot;{searchQuery.trim()}&quot;
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
