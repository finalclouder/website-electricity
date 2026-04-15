import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const APP_TABS = ['patctc', 'social', 'documents', 'profile', 'user-profile', 'admin'] as const;
export type AppTab = (typeof APP_TABS)[number];

const DEFAULT_ACTIVE_TAB: AppTab = 'patctc';
const DEFAULT_PREVIOUS_TAB: AppTab = 'social';

const DEFAULT_STATE = {
  activeTab: DEFAULT_ACTIVE_TAB,
  viewingUserId: null as string | null,
  previousTab: DEFAULT_PREVIOUS_TAB,
  showLanding: true,
  pendingTab: null as AppTab | null,
  initialRegister: false,
};

function isValidTab(tab: unknown): tab is AppTab {
  return typeof tab === 'string' && APP_TABS.includes(tab as AppTab);
}

function sanitizeTab(tab: unknown, fallback: AppTab = DEFAULT_ACTIVE_TAB): AppTab {
  return isValidTab(tab) ? tab : fallback;
}

function sanitizePreviousTab(tab: unknown): AppTab {
  const nextTab = sanitizeTab(tab, DEFAULT_PREVIOUS_TAB);
  return nextTab === 'user-profile' ? DEFAULT_PREVIOUS_TAB : nextTab;
}

function sanitizePendingTab(tab: unknown): AppTab | null {
  if (tab == null) return null;
  return isValidTab(tab) ? tab : null;
}

interface EnterOptions {
  tab?: string;
  register?: boolean;
}

interface NavigationState {
  activeTab: AppTab;
  viewingUserId: string | null;
  previousTab: AppTab;
  showLanding: boolean;
  pendingTab: AppTab | null;
  initialRegister: boolean;
  navigateToTab: (tab: string) => void;
  viewUserProfile: (userId: string) => void;
  backFromUserProfile: () => void;
  enterFromLanding: (options?: EnterOptions) => void;
  returnToLanding: () => void;
  applyPendingTabAfterLogin: () => void;
  resetNavigation: () => void;
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      navigateToTab: (tab) => {
        const nextTab = sanitizeTab(tab);
        set({
          activeTab: nextTab,
          viewingUserId: nextTab === 'user-profile' ? get().viewingUserId : null,
        });
      },

      viewUserProfile: (userId) => {
        if (!userId) return;

        set((state) => ({
          previousTab: state.activeTab === 'user-profile' ? sanitizePreviousTab(state.previousTab) : sanitizePreviousTab(state.activeTab),
          viewingUserId: userId,
          activeTab: 'user-profile',
        }));
      },

      backFromUserProfile: () => {
        set((state) => ({
          activeTab: sanitizePreviousTab(state.previousTab),
          viewingUserId: null,
        }));
      },

      enterFromLanding: (options) => {
        set({
          pendingTab: sanitizePendingTab(options?.tab),
          initialRegister: !!options?.register,
          showLanding: false,
        });
      },

      returnToLanding: () => {
        set({
          showLanding: true,
          pendingTab: null,
          initialRegister: false,
        });
      },

      applyPendingTabAfterLogin: () => {
        set((state) => {
          const nextTab = state.pendingTab ?? state.activeTab;
          return {
            activeTab: sanitizeTab(nextTab),
            viewingUserId: sanitizeTab(nextTab) === 'user-profile' ? state.viewingUserId : null,
            pendingTab: null,
            initialRegister: false,
            showLanding: false,
          };
        });
      },

      resetNavigation: () => {
        set(DEFAULT_STATE);
      },
    }),
    {
      name: 'patctc-navigation',
      partialize: (state) => ({
        activeTab: state.activeTab,
        viewingUserId: state.viewingUserId,
        previousTab: state.previousTab,
        showLanding: state.showLanding,
        pendingTab: state.pendingTab,
        initialRegister: state.initialRegister,
      }),
      merge: (persistedState, currentState) => {
        const state = (persistedState as Partial<NavigationState>) || {};

        return {
          ...currentState,
          ...state,
          activeTab: sanitizeTab(state.activeTab, currentState.activeTab),
          viewingUserId: typeof state.viewingUserId === 'string' && state.viewingUserId ? state.viewingUserId : null,
          previousTab: sanitizePreviousTab(state.previousTab ?? currentState.previousTab),
          showLanding: typeof state.showLanding === 'boolean' ? state.showLanding : currentState.showLanding,
          pendingTab: sanitizePendingTab(state.pendingTab),
          initialRegister: typeof state.initialRegister === 'boolean' ? state.initialRegister : currentState.initialRegister,
        };
      },
    }
  )
);
