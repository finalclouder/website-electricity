import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../utils/api';

function upsertCachedUser(cachedUsers: User[], nextUser: User): User[] {
  const existingIndex = cachedUsers.findIndex(user => user.id === nextUser.id);
  if (existingIndex === -1) {
    return [...cachedUsers, nextUser];
  }

  const nextCachedUsers = [...cachedUsers];
  nextCachedUsers[existingIndex] = nextUser;
  return nextCachedUsers;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string; // base64 data URL or empty
  bio: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  cachedUsers: User[]; // Cached user list for sync access

  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>;

  // User list (fetched from server, cached locally)
  fetchUsers: () => Promise<void>;
  fetchUserById: (userId: string) => Promise<User | null>;
  getAllUsers: () => User[]; // Sync accessor for cached users

  // Admin functions
  deleteUser: (userId: string) => Promise<void>;
  toggleUserRole: (userId: string) => Promise<void>;
  updateUserStatus: (userId: string, status: 'pending' | 'approved' | 'rejected') => Promise<void>;
  resetUserPassword: (userId: string, newPassword: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      cachedUsers: [],

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const data = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
          if (!data.token) {
            set({ isLoading: false });
            return { ok: false, error: 'Đăng nhập thất bại' };
          }
          set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
          get().fetchUsers();
          return { ok: true };
        } catch (error: any) {
          set({ isLoading: false });
          return { ok: false, error: error.message };
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true });
        try {
          const data = await api.post<{ token: string; user: User; message?: string }>('/auth/register', { name, email, password });
          if (!data.token || data.user?.status !== 'approved') {
            set({ isLoading: false });
            return { ok: true, error: data.message || 'Đăng ký thành công! Vui lòng chờ Admin phê duyệt.' };
          }
          set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
          get().fetchUsers();
          return { ok: true };
        } catch (error: any) {
          set({ isLoading: false });
          return { ok: false, error: error.message };
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, cachedUsers: [] });
      },

      updateProfile: async (updates) => {
        try {
          const updatedUser = await api.put<User>('/auth/profile', updates);
          set(state => ({
            user: updatedUser,
            cachedUsers: upsertCachedUser(state.cachedUsers, updatedUser),
          }));
        } catch (error: any) {
          console.error('Update profile error:', error.message);
        }
      },

      changePassword: async (oldPassword, newPassword) => {
        try {
          await api.put('/auth/password', { oldPassword, newPassword });
          return { ok: true };
        } catch (error: any) {
          return { ok: false, error: error.message };
        }
      },

      fetchUsers: async () => {
        const { user } = get();
        if (!user) return;
        if (user.role !== 'admin') {
          set(state => ({ cachedUsers: upsertCachedUser(state.cachedUsers, user) }));
          return;
        }
        try {
          const users = await api.get<User[]>('/auth/users');
          set(state => {
            const mergedUsers = [...users];
            if (user && !mergedUsers.some(cachedUser => cachedUser.id === user.id)) {
              mergedUsers.push(user);
            }
            return { cachedUsers: mergedUsers };
          });
        } catch {
          set(state => ({ cachedUsers: upsertCachedUser(state.cachedUsers, user) }));
        }
      },

      fetchUserById: async (userId) => {
        const { cachedUsers, user } = get();
        const cachedUser = cachedUsers.find(cached => cached.id === userId);
        if (cachedUser) return cachedUser;

        if (user?.id === userId) {
          set(state => ({ cachedUsers: upsertCachedUser(state.cachedUsers, user) }));
          return user;
        }

        try {
          const fetchedUser = await api.get<User>(`/auth/users/${userId}`);
          set(state => ({ cachedUsers: upsertCachedUser(state.cachedUsers, fetchedUser) }));
          return fetchedUser;
        } catch (error: any) {
          if (error.message === 'Không tìm thấy người dùng') {
            return null;
          }
          throw error;
        }
      },

      getAllUsers: () => {
        return get().cachedUsers;
      },

      deleteUser: async (userId) => {
        try {
          await api.delete(`/auth/users/${userId}`);
          set(state => ({ cachedUsers: state.cachedUsers.filter(u => u.id !== userId) }));
        } catch (error: any) {
          console.error('Delete user error:', error.message);
        }
      },

      toggleUserRole: async (userId) => {
        try {
          await api.put(`/auth/users/${userId}/role`);
          set(state => ({
            cachedUsers: state.cachedUsers.map(u =>
              u.id === userId ? { ...u, role: u.role === 'admin' ? 'user' as const : 'admin' as const } : u
            ),
          }));
        } catch (error: any) {
          console.error('Toggle role error:', error.message);
        }
      },

      updateUserStatus: async (userId, status) => {
        try {
          await api.put(`/auth/users/${userId}/status`, { status });
          set(state => ({
            cachedUsers: state.cachedUsers.map(u =>
              u.id === userId ? { ...u, status } : u
            ),
          }));
        } catch (error: any) {
          console.error('Update status error:', error.message);
        }
      },

      resetUserPassword: async (userId, newPassword) => {
        try {
          await api.put(`/auth/users/${userId}/password`, { newPassword });
        } catch (error: any) {
          console.error('Reset password error:', error.message);
        }
      },
    }),
    {
      name: 'patctc-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
