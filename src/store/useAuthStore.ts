import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string; // base64 data URL or empty
  bio: string;
  role: 'admin' | 'user';
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
  changePassword: (oldPassword: string, newPassword: string) => boolean;

  // Admin functions
  getAllUsers: () => (User & { password: string })[];
  deleteUser: (userId: string) => void;
  toggleUserRole: (userId: string) => void;
  resetUserPassword: (userId: string, newPassword: string) => void;
}

// Mock users database (will be replaced with real backend later)
const MOCK_USERS: (User & { password: string })[] = [
  {
    id: '1',
    name: 'Nguyễn Tuấn Anh',
    email: 'admin@patctc.vn',
    avatar: '',
    bio: 'Đội trưởng Đội sửa chữa Hotline - Công ty Điện lực Bắc Ninh',
    role: 'admin',
    password: 'admin123',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Chu Đình Dũng',
    email: 'user@patctc.vn',
    avatar: '',
    bio: 'Công nhân Hotline - Đội sửa chữa Hotline',
    role: 'user',
    password: 'user123',
    createdAt: new Date().toISOString()
  }
];

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        // Simulate API call
        await new Promise(r => setTimeout(r, 800));

        const found = MOCK_USERS.find(u => u.email === email && u.password === password);
        if (found) {
          const { password: _, ...user } = found;
          set({ user, isAuthenticated: true, isLoading: false });
          return true;
        }

        set({ isLoading: false });
        return false;
      },

      register: async (name, email, password) => {
        set({ isLoading: true });
        await new Promise(r => setTimeout(r, 800));

        // Check existing
        if (MOCK_USERS.find(u => u.email === email)) {
          set({ isLoading: false });
          return false;
        }

        const newUser: User = {
          id: Date.now().toString(),
          name,
          email,
          avatar: '',
          bio: '',
          role: 'user',
          createdAt: new Date().toISOString()
        };

        MOCK_USERS.push({ ...newUser, password });
        set({ user: newUser, isAuthenticated: true, isLoading: false });
        return true;
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },

      updateProfile: (updates) => {
        const { user } = get();
        if (!user) return;
        const updatedUser = { ...user, ...updates };
        set({ user: updatedUser });
        // Also sync to MOCK_USERS
        const idx = MOCK_USERS.findIndex(u => u.id === user.id);
        if (idx >= 0) {
          MOCK_USERS[idx] = { ...MOCK_USERS[idx], ...updates };
        }
      },

      changePassword: (oldPassword, newPassword) => {
        const { user } = get();
        if (!user) return false;
        const found = MOCK_USERS.find(u => u.id === user.id);
        if (!found || found.password !== oldPassword) return false;
        found.password = newPassword;
        return true;
      },

      getAllUsers: () => {
        return [...MOCK_USERS];
      },

      deleteUser: (userId) => {
        const { user } = get();
        if (!user || user.role !== 'admin') return;
        if (userId === user.id) return; // Can't delete yourself
        const idx = MOCK_USERS.findIndex(u => u.id === userId);
        if (idx >= 0) MOCK_USERS.splice(idx, 1);
      },

      toggleUserRole: (userId) => {
        const { user } = get();
        if (!user || user.role !== 'admin') return;
        if (userId === user.id) return; // Can't change own role
        const found = MOCK_USERS.find(u => u.id === userId);
        if (found) {
          found.role = found.role === 'admin' ? 'user' : 'admin';
        }
      },

      resetUserPassword: (userId, newPassword) => {
        const { user } = get();
        if (!user || user.role !== 'admin') return;
        const found = MOCK_USERS.find(u => u.id === userId);
        if (found) {
          found.password = newPassword;
        }
      }
    }),
    {
      name: 'patctc-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
