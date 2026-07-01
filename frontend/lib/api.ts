import axios from 'axios';

const API_BASE = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8000/api/v1`)
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1');

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Attach token
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Error handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const authApi = {
  register: (data: { email: string; password: string; full_name: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  firebase: (data: { firebase_token: string; full_name?: string }) =>
    api.post('/auth/firebase', data),
  anonymous: () => api.post('/auth/anonymous'),
};

// Issues
export const issuesApi = {
  list: (params?: object) => api.get('/issues/', { params }),
  get: (id: string) => api.get(`/issues/${id}`),
  submit: (formData: FormData) => api.post('/issues/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  }),
  verify: (id: string, data: { vote: string; comment?: string }) =>
    api.post(`/issues/${id}/verify`, data),
  comment: (id: string, data: { content: string; is_anonymous?: boolean }) =>
    api.post(`/issues/${id}/comment`, data),
  updateStatus: (id: string, data: { status: string; notes?: string }) =>
    api.patch(`/issues/${id}/status`, data),
  resolve: (id: string, formData: FormData) =>
    api.post(`/issues/${id}/resolve`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }),
  liveStats: () => api.get('/issues/stats/live'),
};

// Users
export const usersApi = {
  me: () => api.get('/users/me'),
  myIssues: (params?: object) => api.get('/users/me/issues', { params }),
  notifications: (unread?: boolean) =>
    api.get('/users/me/notifications', { params: { unread_only: unread } }),
  markRead: () => api.post('/users/me/notifications/read'),
  leaderboard: (limit?: number) => api.get('/users/leaderboard', { params: { limit } }),
};

// Analytics
export const analyticsApi = {
  overview: () => api.get('/analytics/overview'),
  trends: (days?: number) => api.get('/analytics/trends', { params: { days } }),
  heatmap: () => api.get('/analytics/heatmap'),
  wardStats: () => api.get('/analytics/ward-stats'),
  aiInsights: () => api.get('/analytics/ai-insights'),
};

// Departments
export const deptApi = {
  list: () => api.get('/departments/'),
  stats: (id: string) => api.get(`/departments/${id}/stats`),
};
