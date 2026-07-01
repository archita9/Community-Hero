import { create } from 'zustand';

interface User {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  role: string;
  points: number;
  badge_tier: string;
  trust_score?: number;
  reports_submitted: number;
  verifications_done?: number;
  reports_verified?: number;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setUser: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  isGovOrAdmin: () => boolean;
}

const safeGet = (key: string) => {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(key); } catch { return null; }
};

const safeParse = (val: string | null) => {
  if (!val) return null;
  try { return JSON.parse(val); } catch { return null; }
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: safeParse(safeGet('auth_user')),
  token: safeGet('auth_token'),
  isLoading: false,

  setUser: (user, token) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
      }
    } catch { /* ignore */ }
    set({ user, token, isLoading: false });
  },

  logout: () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    } catch { /* ignore */ }
    set({ user: null, token: null });
  },

  isAuthenticated: () => !!get().token,
  isGovOrAdmin: () => ['government', 'admin'].includes(get().user?.role || ''),
}));

interface UIStore {
  sidebarOpen: boolean;
  theme: 'dark' | 'light';
  setSidebarOpen: (v: boolean) => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  theme: 'dark',
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
}));
