import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

interface User {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setUser: (user: User) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            email,
            password,
          });

          if (!response.data.success || !response.data.data) {
            throw new Error(response.data.message || 'Login failed.');
          }

          const { user, token } = response.data.data;
          
          if (!user || !token) {
            throw new Error('The server returned an invalid response.');
          }

          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          set({
            user,
            token,
            isAuthenticated: true,
          });
        } catch (error: any) {
          console.error('Login error:', error);
          if (error.response) {
            const message = error.response.data?.message || `Login failed: ${error.response.status}`;
            throw new Error(message);
          } else if (error.request) {
            throw new Error('Unable to connect to the server. Please check whether the backend is running.');
          } else {
            throw new Error(error.message || 'Login failed.');
          }
        }
      },

      register: async (username: string, email: string, password: string) => {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/register`, {
            username,
            email,
            password,
          });

          if (!response.data.success || !response.data.data) {
            throw new Error(response.data.message || 'Registration failed.');
          }

          const { user, token } = response.data.data;
          
          if (!user || !token) {
            throw new Error('The server returned an invalid response.');
          }

          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          set({
            user,
            token,
            isAuthenticated: true,
          });
        } catch (error: any) {
          console.error('Registration error:', error);
          if (error.response) {
            const message = error.response.data?.message || `Registration failed: ${error.response.status}`;
            throw new Error(message);
          } else if (error.request) {
            throw new Error('Unable to connect to the server. Please check whether the backend is running.');
          } else {
            throw new Error(error.message || 'Registration failed.');
          }
        }
      },

      logout: () => {
        delete axios.defaults.headers.common['Authorization'];
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await axios.get(`${API_BASE_URL}/auth/me`);
          
          set({
            user: response.data.data,
            isAuthenticated: true,
          });
        } catch (error) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
        }
      },

      setUser: (user: User) => {
        set({ user });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = !!(state.token && state.user);
        }
      },
    }
  )
);

if (typeof window !== 'undefined') {
  const { checkAuth } = useAuthStore.getState();
  checkAuth();
}
