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
  scrollToPostId: null as string | null,
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

// ─── URL helpers ─────────────────────────────────────────────────────────────

/** Read the current tab and uid from the browser's URL query string. */
export function readTabFromUrl(): { tab: AppTab | null; uid: string | null } {
  if (typeof window === 'undefined') return { tab: null, uid: null };
  const params = new URLSearchParams(window.location.search);
  const rawTab = params.get('tab');
  const rawUid = params.get('uid');
  return {
    tab: isValidTab(rawTab) ? rawTab : null,
    uid: rawUid || null,
  };
}

/**
 * Push a new history entry reflecting the active tab (and optional userId).
 * Does nothing in SSR environments.
 */
function pushTabToUrl(tab: AppTab, uid?: string | null): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams();
  params.set('tab', tab);
  if (tab === 'user-profile' && uid) params.set('uid', uid);
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  // Avoid duplicate history entries for the exact same URL
  if (window.location.search !== `?${params.toString()}`) {
    window.history.pushState({ tab, uid: uid ?? null }, '', newUrl);
  }
}

/**
 * Replace the current history entry (used on logout / landing transitions so
 * the user can't press Back into a stale authenticated session).
 */
function replaceTabInUrl(tab: AppTab | null): void {
  if (typeof window === 'undefined') return;
  if (tab) {
    const params = new URLSearchParams();
    params.set('tab', tab);
    window.history.replaceState({ tab, uid: null }, '', `${window.location.pathname}?${params.toString()}`);
  } else {
    window.history.replaceState({}, '', window.location.pathname);
  }
}

// ─────────────────────────────────────────────────────────────────────────────

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
  scrollToPostId: string | null;
  navigateToTab: (tab: string) => void;
  navigateToPost: (postId: string) => void;
  clearScrollToPost: () => void;
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
          scrollToPostId: null,
        });
        pushTabToUrl(nextTab);
      },

      navigateToPost: (postId) => {
        set({ activeTab: 'social', viewingUserId: null, scrollToPostId: postId });
        pushTabToUrl('social');
      },

      clearScrollToPost: () => {
        set({ scrollToPostId: null });
      },

      viewUserProfile: (userId) => {
        if (!userId) return;

        set((state) => ({
          previousTab: state.activeTab === 'user-profile' ? sanitizePreviousTab(state.previousTab) : sanitizePreviousTab(state.activeTab),
          viewingUserId: userId,
          activeTab: 'user-profile',
        }));
        pushTabToUrl('user-profile', userId);
      },

      backFromUserProfile: () => {
        const prevTab = sanitizePreviousTab(get().previousTab);
        set({
          activeTab: prevTab,
          viewingUserId: null,
        });
        pushTabToUrl(prevTab);
      },

      enterFromLanding: (options) => {
        const pendingTab = sanitizePendingTab(options?.tab);
        set({
          pendingTab,
          initialRegister: !!options?.register,
          showLanding: false,
        });
        // Reflect the pending tab (or default) in URL so it survives a reload
        replaceTabInUrl(pendingTab ?? get().activeTab);
      },

      returnToLanding: () => {
        set({
          showLanding: true,
          pendingTab: null,
          initialRegister: false,
        });
        // Replace — never push — so Back doesn't re-enter the app shell
        replaceTabInUrl(null);
      },

      applyPendingTabAfterLogin: () => {
        set((state) => {
          const nextTab = sanitizeTab(state.pendingTab ?? state.activeTab);
          pushTabToUrl(nextTab);
          return {
            activeTab: nextTab,
            viewingUserId: nextTab === 'user-profile' ? state.viewingUserId : null,
            pendingTab: null,
            initialRegister: false,
            showLanding: false,
          };
        });
      },

      resetNavigation: () => {
        set(DEFAULT_STATE);
        replaceTabInUrl(null);
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
        // scrollToPostId is intentionally NOT persisted — scroll targets are session-only
      }),
      merge: (persistedState, currentState) => {
        const state = (persistedState as Partial<NavigationState>) || {};

        // URL is the highest-priority source of truth on page load.
        // If the URL carries a valid tab, it wins over localStorage.
        const { tab: urlTab, uid: urlUid } = readTabFromUrl();

        return {
          ...currentState,
          ...state,
          activeTab: urlTab ?? sanitizeTab(state.activeTab, currentState.activeTab),
          viewingUserId: urlTab === 'user-profile' && urlUid
            ? urlUid
            : (typeof state.viewingUserId === 'string' && state.viewingUserId ? state.viewingUserId : null),
          previousTab: sanitizePreviousTab(state.previousTab ?? currentState.previousTab),
          showLanding: typeof state.showLanding === 'boolean' ? state.showLanding : currentState.showLanding,
          pendingTab: sanitizePendingTab(state.pendingTab),
          initialRegister: typeof state.initialRegister === 'boolean' ? state.initialRegister : currentState.initialRegister,
        };
      },
    }
  )
);
