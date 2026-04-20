import React, { useEffect } from 'react';
import { Toaster } from 'sonner';
import { useAuthStore } from './store/useAuthStore';
import { useSocialStore } from './store/useSocialStore';
import { useLandingStore } from './store/useLandingStore';
import { useNavigationStore, readTabFromUrl } from './store/useNavigationStore';
import { api } from './utils/api';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { MainLayout } from './components/layout/MainLayout';
import { PATCTCEditorPage } from './pages/PATCTCEditorPage';
import { SocialPage } from './pages/SocialPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';

export default function App() {
  const { isAuthenticated, logout, user } = useAuthStore();
  const {
    fetchPosts,
    fetchDocuments,
    fetchFriendRequests,
    fetchNotifications,
    fetchUnreadNotificationCount,
    subscribeToNotifications,
    unsubscribeFromNotifications,
    subscribeToPosts,
    unsubscribeFromPosts,
  } = useSocialStore();
  const { fetchConfigFromServer } = useLandingStore();
  const {
    activeTab,
    viewingUserId,
    previousTab,
    showLanding,
    pendingTab,
    initialRegister,
    navigateToTab,
    viewUserProfile,
    backFromUserProfile,
    enterFromLanding,
    returnToLanding,
    applyPendingTabAfterLogin,
    resetNavigation,
  } = useNavigationStore();

  const prevAuth = React.useRef(isAuthenticated);
  React.useEffect(() => {
    if (!prevAuth.current && isAuthenticated && pendingTab) {
      applyPendingTabAfterLogin();
    }

    if (prevAuth.current && !isAuthenticated) {
      resetNavigation();
    }

    prevAuth.current = isAuthenticated;
  }, [isAuthenticated, pendingTab, applyPendingTabAfterLogin, resetNavigation]);

  // Fetch data from server when authenticated
  useEffect(() => {
    fetchConfigFromServer();
  }, []);

  // Seed the URL with the current tab on first mount if authenticated and no
  // tab param exists yet. This covers the "returning user" case: localStorage
  // restores the last tab but the URL is bare `/`.
  useEffect(() => {
    if (!isAuthenticated) return;
    const { tab: urlTab } = readTabFromUrl();
    if (!urlTab) {
      // Use replaceState — don't pollute history on initial load
      const params = new URLSearchParams();
      params.set('tab', activeTab);
      if (activeTab === 'user-profile' && viewingUserId) params.set('uid', viewingUserId);
      window.history.replaceState({ tab: activeTab, uid: viewingUserId }, '', `${window.location.pathname}?${params.toString()}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]); // Only on auth change — intentionally not re-running on tab changes

  useEffect(() => {
    if (isAuthenticated) {
      api.get('/auth/me')
        .then((user: any) => {
           useAuthStore.setState({ user });
           useAuthStore.getState().fetchUsers();
        })
        .catch(() => {
           logout();
        });
      fetchPosts();
      fetchDocuments();
      fetchFriendRequests();
      fetchNotifications();
      fetchUnreadNotificationCount();
    }
  }, [
    isAuthenticated,
    logout,
    fetchPosts,
    fetchDocuments,
    fetchFriendRequests,
    fetchNotifications,
    fetchUnreadNotificationCount,
  ]);

  // Realtime notification subscription — subscribe on login, unsubscribe on logout.
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      subscribeToNotifications(user.id);
      subscribeToPosts();
    } else {
      unsubscribeFromNotifications();
      unsubscribeFromPosts();
    }
    return () => {
      unsubscribeFromNotifications();
      unsubscribeFromPosts();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (activeTab === 'admin' && user?.role !== 'admin') {
      navigateToTab('patctc');
      return;
    }

    if (activeTab === 'user-profile' && !viewingUserId) {
      navigateToTab(previousTab);
    }
  }, [isAuthenticated, activeTab, user?.role, viewingUserId, previousTab, navigateToTab]);

  // Sync Zustand navigation state when the user presses Back / Forward.
  // We listen to `popstate` (fired by the browser on history traversal) and
  // read the URL to determine the target tab, then update the store to match.
  // This is mounted/unmounted with the App component — one listener, no leaks.
  useEffect(() => {
    const handlePopState = () => {
      const { tab, uid } = readTabFromUrl();
      if (!tab) {
        // URL has no tab param — treat as landing / default
        returnToLanding();
        return;
      }
      if (tab === 'user-profile' && uid) {
        // Directly update state instead of calling viewUserProfile()
        // to avoid pushing another history entry on top of a popstate.
        useNavigationStore.setState((state) => ({
          previousTab: state.activeTab === 'user-profile'
            ? state.previousTab
            : (state.activeTab as typeof state.previousTab),
          viewingUserId: uid,
          activeTab: 'user-profile',
        }));
      } else {
        // Same: update state directly without a new pushState
        useNavigationStore.setState({
          activeTab: tab,
          viewingUserId: null,
        });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [returnToLanding]);

  // Preview mode: when loaded in iframe with ?preview=1, always show landing page
  const isPreviewMode = new URLSearchParams(window.location.search).get('preview') === '1';

  // Gate 1: Public landing page (only when not logged in) OR preview mode
  if ((showLanding && !isAuthenticated) || isPreviewMode) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <LandingPage onEnter={isPreviewMode ? () => {} : enterFromLanding} />
      </>
    );
  }

  // Gate 2: Auth wall
  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <LoginPage
          onBackToLanding={returnToLanding}
          initialRegister={initialRegister}
        />
      </>
    );
  }

  const handleTabChange = (tab: string) => {
    navigateToTab(tab);
  };

  const handleViewUserProfile = (userId: string) => {
    viewUserProfile(userId);
  };

  const handleBackFromProfile = () => {
    backFromUserProfile();
  };

  // Main app with tab navigation
  return (
    <>
      <Toaster position="top-right" richColors />
      <MainLayout activeTab={activeTab} onTabChange={handleTabChange}>
        {activeTab === 'patctc' && <PATCTCEditorPage />}
        {activeTab === 'social' && <SocialPage onViewProfile={handleViewUserProfile} />}
        {activeTab === 'documents' && <DocumentsPage onViewProfile={handleViewUserProfile} onTabChange={handleTabChange} />}
        {activeTab === 'profile' && <ProfilePage onTabChange={handleTabChange} />}
        {activeTab === 'user-profile' && viewingUserId && <ProfilePage viewingUserId={viewingUserId} onBack={handleBackFromProfile} onTabChange={handleTabChange} />}
        {activeTab === 'admin' && <AdminPage />}
      </MainLayout>
    </>
  );
}
