import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../utils/api';
import { useSocialStore } from './useSocialStore';

function upsertCachedUser(cachedUsers: ProfileUser[], nextUser: ProfileUser): ProfileUser[] {
  const existingIndex = cachedUsers.findIndex(user => user.id === nextUser.id);
  if (existingIndex === -1) {
    return [...cachedUsers, nextUser];
  }

  const previousUser = cachedUsers[existingIndex];
  const mergedUser: ProfileUser = {
    ...previousUser,
    ...nextUser,
    email: nextUser.email ?? previousUser.email,
    role: nextUser.role ?? previousUser.role,
    status: nextUser.status ?? previousUser.status,
    avatar: nextUser.avatar ?? previousUser.avatar,
    bio: nextUser.bio ?? previousUser.bio,
    createdAt: nextUser.createdAt || previousUser.createdAt,
  };

  const nextCachedUsers = [...cachedUsers];
  nextCachedUsers[existingIndex] = mergedUser;
  return nextCachedUsers;
}

function getFallbackProfileUser(userId: string): ProfileUser | null {
  const socialState = useSocialStore.getState();
  const posts = Array.isArray(socialState.posts) ? socialState.posts : [];

  const authoredPost = posts.find(post => post.authorId === userId);
  if (authoredPost) {
    return {
      id: userId,
      name: authoredPost.authorName || 'Người dùng',
      email: undefined,
      avatar: authoredPost.authorAvatar || '',
      bio: '',
      role: authoredPost.authorRole,
      status: undefined,
      createdAt: authoredPost.createdAt,
    };
  }

  for (const post of posts) {
    const comments = Array.isArray(post.comments) ? post.comments : [];
    const authoredComment = comments.find(comment => comment.authorId === userId);
    if (authoredComment) {
      return {
        id: userId,
        name: authoredComment.authorName || 'Người dùng',
        email: undefined,
        avatar: authoredComment.authorAvatar || '',
        bio: '',
        role: undefined,
        status: undefined,
        createdAt: authoredComment.createdAt,
      };
    }
  }

  const documents = Array.isArray(socialState.savedDocuments) ? socialState.savedDocuments : [];
  const authoredDocument = documents.find(document => document.authorId === userId);
  if (authoredDocument) {
    return {
      id: userId,
      name: authoredDocument.authorName || 'Người dùng',
      email: undefined,
      avatar: '',
      bio: '',
      role: undefined,
      status: undefined,
      createdAt: authoredDocument.createdAt,
    };
  }

  return null;
}

export interface ProfileUser {
  id: string;
  name: string;
  email?: string;
  avatar: string; // base64 data URL or empty
  bio: string;
  role?: 'admin' | 'user';
  status?: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface User extends ProfileUser {
  email: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  cachedUsers: ProfileUser[]; // Cached user list for sync access

  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<{ ok: boolean; error?: string }>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>;

  // User list (fetched from server, cached locally)
  fetchUsers: () => Promise<void>;
  fetchUserById: (userId: string) => Promise<ProfileUser | null>;
  getAllUsers: () => ProfileUser[]; // Sync accessor for cached users

  // Admin functions
  deleteUser: (userId: string) => Promise<{ ok: boolean; error?: string }>;
  toggleUserRole: (userId: string) => Promise<{ ok: boolean; error?: string }>;
  updateUserStatus: (userId: string, status: 'pending' | 'approved' | 'rejected') => Promise<{ ok: boolean; error?: string }>;
  resetUserPassword: (userId: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>;
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
        useSocialStore.getState().resetSocialState();
        set({ user: null, token: null, isAuthenticated: false, cachedUsers: [] });
      },

      updateProfile: async (updates) => {
        try {
          const payload = { ...updates };
          const data = await api.put<{ token: string; user: User }>('/auth/profile', payload);
          set(state => ({
            token: data.token,
            user: data.user,
            cachedUsers: upsertCachedUser(state.cachedUsers, data.user),
          }));
          // Explicitly flush the new token to localStorage immediately so that
          // getAuthToken() reads the correct value on the very next request and
          // the new email/token persists across a full page reload (F5).
          try {
            const stored = localStorage.getItem('patctc-auth');
            const parsed = stored ? JSON.parse(stored) : {};
            const next = {
              ...parsed,
              state: {
                ...(parsed?.state ?? {}),
                token: data.token,
                user: data.user,
                isAuthenticated: true,
              },
            };
            localStorage.setItem('patctc-auth', JSON.stringify(next));
          } catch (lsErr) {
            console.warn('Could not flush token to localStorage:', lsErr);
          }
          return { ok: true };
        } catch (error: any) {
          console.error('Update profile error:', error.message);
          return { ok: false, error: error.message };
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
          const fetchedUser = await api.get<ProfileUser>(`/auth/users/${userId}`);
          set(state => ({ cachedUsers: upsertCachedUser(state.cachedUsers, fetchedUser) }));
          return fetchedUser;
        } catch (error: any) {
          if (error.message === 'Không tìm thấy người dùng') {
            return null;
          }

          const fallbackUser = getFallbackProfileUser(userId);
          if (fallbackUser) {
            set(state => ({ cachedUsers: upsertCachedUser(state.cachedUsers, fallbackUser) }));
            return fallbackUser;
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
          return { ok: true };
        } catch (error: any) {
          console.error('Delete user error:', error.message);
          return { ok: false, error: error.message };
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
          return { ok: true };
        } catch (error: any) {
          console.error('Toggle role error:', error.message);
          return { ok: false, error: error.message };
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
          return { ok: true };
        } catch (error: any) {
          console.error('Update status error:', error.message);
          return { ok: false, error: error.message };
        }
      },

      resetUserPassword: async (userId, newPassword) => {
        try {
          await api.put(`/auth/users/${userId}/password`, { newPassword });
          return { ok: true };
        } catch (error: any) {
          console.error('Reset password error:', error.message);
          return { ok: false, error: error.message };
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
