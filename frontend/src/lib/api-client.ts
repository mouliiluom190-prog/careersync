const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface ApiError {
  message: string;
  statusCode?: number;
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Include HttpOnly cookies for refresh tokens
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg =
      Array.isArray(data?.message)
        ? data.message.join(', ')
        : data?.message || 'An error occurred during request execution';

    throw {
      message: errorMsg,
      statusCode: response.status,
    } as ApiError;
  }

  return data as T;
}

export type EmploymentType =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'INTERNSHIP'
  | 'CONTRACT'
  | 'TEMPORARY';

export type ExperienceLevel = 'ENTRY' | 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD';

export type WorkMode = 'ONSITE' | 'REMOTE' | 'HYBRID';

export type JobStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'EXPIRED';

export interface Company {
  id: string;
  name: string;
  website?: string | null;
  location?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  verified?: boolean;
}

export interface Location {
  id: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}

export interface Skill {
  id: string;
  name: string;
}

export interface JobSkill {
  jobId: string;
  skillId: string;
  skill: Skill;
}

export interface Job {
  id: string;
  recruiterId: string;
  companyId: string;
  title: string;
  description: string;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  workMode: WorkMode;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  locationId?: string | null;
  openings: number;
  applicationDeadline?: string | null;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  company?: Company;
  location?: Location | null;
  skills?: JobSkill[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Job API helper methods
export async function getPublicJobs(params?: {
  search?: string;
  employmentType?: string;
  experienceLevel?: string;
  workMode?: string;
  locationId?: string;
  skillId?: string;
  companyId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}): Promise<PaginatedResponse<Job>> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });
  }
  const qStr = query.toString();
  return apiFetch<PaginatedResponse<Job>>(`/jobs${qStr ? `?${qStr}` : ''}`);
}

export async function getPublicJob(id: string): Promise<Job> {
  return apiFetch<Job>(`/jobs/${id}`);
}

export async function createJob(
  token: string,
  data: {
    title: string;
    description: string;
    employmentType?: EmploymentType;
    experienceLevel?: ExperienceLevel;
    workMode?: WorkMode;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
    locationId?: string;
    openings?: number;
    applicationDeadline?: string;
    skillIds?: string[];
    status?: JobStatus;
  },
): Promise<Job> {
  return apiFetch<Job>(
    '/jobs',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token,
  );
}

export async function getRecruiterJobs(
  token: string,
  page = 1,
  limit = 10,
): Promise<PaginatedResponse<Job>> {
  return apiFetch<PaginatedResponse<Job>>(
    `/jobs/recruiter/me?page=${page}&limit=${limit}`,
    { method: 'GET' },
    token,
  );
}

export async function getRecruiterJob(
  token: string,
  id: string,
): Promise<Job> {
  return apiFetch<Job>(`/jobs/recruiter/${id}`, { method: 'GET' }, token);
}

export async function updateJob(
  token: string,
  id: string,
  data: Partial<{
    title: string;
    description: string;
    employmentType: EmploymentType;
    experienceLevel: ExperienceLevel;
    workMode: WorkMode;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
    locationId?: string;
    openings?: number;
    applicationDeadline?: string;
    skillIds?: string[];
    status?: JobStatus;
  }>,
): Promise<Job> {
  return apiFetch<Job>(
    `/jobs/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
    token,
  );
}

export async function updateJobStatus(
  token: string,
  id: string,
  status: JobStatus,
): Promise<Job> {
  return apiFetch<Job>(
    `/jobs/${id}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
    token,
  );
}

export type ApplicationStatus =
  | 'APPLIED'
  | 'UNDER_REVIEW'
  | 'SHORTLISTED'
  | 'INTERVIEW'
  | 'SELECTED'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface ApplicationStatusHistory {
  id: string;
  applicationId: string;
  status: ApplicationStatus;
  note?: string | null;
  changedByUserId: string;
  createdAt: string;
}

export interface StudentProfile {
  id: string;
  userId: string;
  name: string;
  phone?: string | null;
  college?: string | null;
  degree?: string | null;
  department?: string | null;
  cgpa?: number | null;
  profileImageUrl?: string | null;
  user?: {
    email: string;
  };
  skills?: {
    skillId: string;
    skill: Skill;
  }[];
}

export interface Resume {
  id: string;
  studentProfileId: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  isDefault: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  downloadUrl?: string;
}

export interface Application {
  id: string;
  studentProfileId: string;
  jobId: string;
  resumeId?: string | null;
  resumeUrl?: string | null;
  coverLetter?: string | null;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  job?: Job;
  studentProfile?: StudentProfile;
  resume?: Resume | null;
  history?: ApplicationStatusHistory[];
}

// Application API helper methods
export async function applyToJob(
  token: string,
  data: {
    jobId: string;
    resumeId?: string;
    resumeUrl?: string;
    coverLetter?: string;
  },
): Promise<Application> {
  return apiFetch<Application>(
    '/applications',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token,
  );
}

export async function getStudentApplications(
  token: string,
  params?: {
    page?: number;
    limit?: number;
    status?: ApplicationStatus;
  },
): Promise<PaginatedResponse<Application>> {
  const query = new URLSearchParams();
  if (params) {
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.status) query.append('status', params.status);
  }
  const qStr = query.toString();
  return apiFetch<PaginatedResponse<Application>>(
    `/applications/student/me${qStr ? `?${qStr}` : ''}`,
    { method: 'GET' },
    token,
  );
}

export async function getStudentApplicationDetails(
  token: string,
  id: string,
): Promise<Application> {
  return apiFetch<Application>(
    `/applications/student/${id}`,
    { method: 'GET' },
    token,
  );
}

export async function withdrawApplication(
  token: string,
  id: string,
  note?: string,
): Promise<Application> {
  return apiFetch<Application>(
    `/applications/${id}/withdraw`,
    {
      method: 'PATCH',
      body: JSON.stringify({ note }),
    },
    token,
  );
}

export async function getRecruiterApplications(
  token: string,
  params?: {
    jobId?: string;
    status?: ApplicationStatus;
    page?: number;
    limit?: number;
  },
): Promise<PaginatedResponse<Application>> {
  const query = new URLSearchParams();
  if (params) {
    if (params.jobId) query.append('jobId', params.jobId);
    if (params.status) query.append('status', params.status);
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
  }
  const qStr = query.toString();
  return apiFetch<PaginatedResponse<Application>>(
    `/recruiter/applications${qStr ? `?${qStr}` : ''}`,
    { method: 'GET' },
    token,
  );
}

export async function getRecruiterApplicationDetails(
  token: string,
  id: string,
): Promise<Application> {
  return apiFetch<Application>(
    `/recruiter/applications/${id}`,
    { method: 'GET' },
    token,
  );
}

export async function updateApplicationStatus(
  token: string,
  id: string,
  data: {
    status: ApplicationStatus;
    note?: string;
  },
): Promise<Application> {
  return apiFetch<Application>(
    `/recruiter/applications/${id}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
    token,
  );
}

// Resume API helper methods
export async function uploadResume(
  token: string,
  file: File,
): Promise<Resume> {
  const formData = new FormData();
  formData.append('file', file);

  return apiFetch<Resume>(
    '/resumes',
    {
      method: 'POST',
      body: formData,
    },
    token,
  );
}

export async function getStudentResumes(token: string): Promise<Resume[]> {
  return apiFetch<Resume[]>('/resumes/me', { method: 'GET' }, token);
}

export async function getResumeById(
  token: string,
  id: string,
): Promise<Resume> {
  return apiFetch<Resume>(`/resumes/${id}`, { method: 'GET' }, token);
}

export async function getResumeDownloadUrl(
  token: string,
  id: string,
): Promise<{ downloadUrl: string; originalFileName: string }> {
  return apiFetch<{ downloadUrl: string; originalFileName: string }>(
    `/resumes/${id}/download`,
    { method: 'GET' },
    token,
  );
}

export async function setDefaultResume(
  token: string,
  id: string,
): Promise<Resume> {
  return apiFetch<Resume>(
    `/resumes/${id}/default`,
    { method: 'PATCH' },
    token,
  );
}

export async function deleteResume(
  token: string,
  id: string,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(
    `/resumes/${id}`,
    { method: 'DELETE' },
    token,
  );
}

export async function getApplicationResumeDownloadUrl(
  token: string,
  applicationId: string,
): Promise<{ downloadUrl: string; originalFileName: string }> {
  return apiFetch<{ downloadUrl: string; originalFileName: string }>(
    `/resumes/application/${applicationId}/download`,
    { method: 'GET' },
    token,
  );
}

// ==========================================
// Phase 8: Notification API Helpers & Types
// ==========================================

export type NotificationType =
  | 'APPLICATION_SUBMITTED'
  | 'APPLICATION_STATUS_CHANGED'
  | 'JOB_POSTED'
  | 'JOB_CLOSED'
  | 'RESUME_REQUIRED'
  | 'SYSTEM';

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getNotifications(
  token: string,
  page = 1,
  limit = 10,
  unreadOnly = false,
): Promise<PaginatedResponse<NotificationItem>> {
  const query = new URLSearchParams();
  query.append('page', String(page));
  query.append('limit', String(limit));
  if (unreadOnly) query.append('unreadOnly', 'true');
  return apiFetch<PaginatedResponse<NotificationItem>>(
    `/notifications?${query.toString()}`,
    { method: 'GET' },
    token,
  );
}

export async function getUnreadNotificationCount(
  token: string,
): Promise<{ unreadCount: number }> {
  return apiFetch<{ unreadCount: number }>(
    '/notifications/unread-count',
    { method: 'GET' },
    token,
  );
}

export async function markNotificationAsRead(
  token: string,
  id: string,
): Promise<NotificationItem> {
  return apiFetch<NotificationItem>(
    `/notifications/${id}/read`,
    { method: 'PATCH' },
    token,
  );
}

export async function markAllNotificationsAsRead(
  token: string,
): Promise<{ count: number }> {
  return apiFetch<{ count: number }>(
    '/notifications/read-all',
    { method: 'PATCH' },
    token,
  );
}

export async function deleteNotification(
  token: string,
  id: string,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(
    `/notifications/${id}`,
    { method: 'DELETE' },
    token,
  );
}

// ==========================================
// Phase 8: Analytics API Helpers & Types
// ==========================================

export interface StudentAnalytics {
  totalApplications: number;
  byStatus: Record<string, number>;
}

export async function getStudentAnalytics(
  token: string,
): Promise<StudentAnalytics> {
  return apiFetch<StudentAnalytics>(
    '/students/me/analytics',
    { method: 'GET' },
    token,
  );
}

export interface RecruiterAnalytics {
  totalJobs: number;
  activeJobs: number;
  closedJobs: number;
  totalApplications: number;
  byStatus: Record<string, number>;
  jobPerformance: Array<{
    jobId: string;
    title: string;
    status: JobStatus;
    applicationCount: number;
  }>;
}

export async function getRecruiterAnalytics(
  token: string,
): Promise<RecruiterAnalytics> {
  return apiFetch<RecruiterAnalytics>(
    '/recruiters/me/analytics',
    { method: 'GET' },
    token,
  );
}

// ==========================================
// Phase 8: Admin API Helpers & Types
// ==========================================

export interface AdminAnalytics {
  users: { total: number; students: number; recruiters: number; admins: number };
  companies: { total: number; verified: number };
  jobs: { total: number; active: number; closed: number };
  applications: { total: number; byStatus: Record<string, number> };
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'STUDENT' | 'RECRUITER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  studentProfile?: { id: string; name: string; college?: string; degree?: string };
  recruiterProfile?: { id: string; name: string; designation?: string; company?: { id: string; name: string } };
}

export interface AdminCompany {
  id: string;
  name: string;
  website?: string | null;
  isVerified: boolean;
  createdAt: string;
  location?: Location | null;
  _count?: { jobs: number };
}

export async function getAdminAnalytics(token: string): Promise<AdminAnalytics> {
  return apiFetch<AdminAnalytics>('/admin/analytics', { method: 'GET' }, token);
}

export async function getAdminUsers(
  token: string,
  page = 1,
  limit = 10,
  role?: string,
  search?: string,
): Promise<PaginatedResponse<AdminUser>> {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (role) query.append('role', role);
  if (search) query.append('search', search);
  return apiFetch<PaginatedResponse<AdminUser>>(`/admin/users?${query.toString()}`, { method: 'GET' }, token);
}

export async function updateAdminUserStatus(
  token: string,
  userId: string,
  isActive: boolean,
): Promise<AdminUser> {
  return apiFetch<AdminUser>(
    `/admin/users/${userId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    },
    token,
  );
}

export async function getAdminCompanies(
  token: string,
  page = 1,
  limit = 10,
  search?: string,
): Promise<PaginatedResponse<AdminCompany>> {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) query.append('search', search);
  return apiFetch<PaginatedResponse<AdminCompany>>(`/admin/companies?${query.toString()}`, { method: 'GET' }, token);
}

export async function updateAdminCompanyVerification(
  token: string,
  companyId: string,
  isVerified: boolean,
): Promise<AdminCompany> {
  return apiFetch<AdminCompany>(
    `/admin/companies/${companyId}/verify`,
    {
      method: 'PATCH',
      body: JSON.stringify({ isVerified }),
    },
    token,
  );
}

export async function getAdminJobs(
  token: string,
  page = 1,
  limit = 10,
  status?: string,
  search?: string,
): Promise<PaginatedResponse<Job>> {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) query.append('status', status);
  if (search) query.append('search', search);
  return apiFetch<PaginatedResponse<Job>>(`/admin/jobs?${query.toString()}`, { method: 'GET' }, token);
}

export async function updateAdminJobStatus(
  token: string,
  jobId: string,
  status: JobStatus,
): Promise<Job> {
  return apiFetch<Job>(
    `/admin/jobs/${jobId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
    token,
  );
}

export async function getAdminApplications(
  token: string,
  page = 1,
  limit = 10,
  status?: string,
): Promise<PaginatedResponse<Application>> {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) query.append('status', status);
  return apiFetch<PaginatedResponse<Application>>(`/admin/applications?${query.toString()}`, { method: 'GET' }, token);
}




