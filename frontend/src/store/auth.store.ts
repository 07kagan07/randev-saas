import { create } from 'zustand';
import axios from 'axios';
import api from '../services/api';
import { queryClient } from '../lib/queryClient';

interface AuthUser {
  id: string;
  full_name: string | null;
  phone: string;
  role: 'super_admin' | 'business_admin' | 'staff';
  business_id: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setAccessToken: (token: string) => void;
  login: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitialized: false,

  setAccessToken: (token) => set({ accessToken: token }),

  login: async (phone, otp) => {
    const { data } = await api.post('/auth/verify-otp', { phone, otp });
    set({
      user: data.data.user,
      accessToken: data.data.access_token,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch { /* ignore */ }
    queryClient.clear();
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  // Sayfa yüklenince HttpOnly cookie'deki refresh token ile oturumu kurtar
  initialize: async () => {
    try {
      const { data } = await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });
      set({
        accessToken: data.data.access_token,
        user: data.data.user,
        isAuthenticated: true,
      });
    } catch {
      set({ user: null, accessToken: null, isAuthenticated: false });
    } finally {
      set({ isInitialized: true });
    }
  },
}));
