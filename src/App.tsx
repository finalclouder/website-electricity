import React, { useEffect } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { useSocialStore } from './store/useSocialStore';
import { useLandingStore } from './store/useLandingStore';
import { useNavigationStore } from './store/useNavigationStore';
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

  // Gate 1: Public landing page (only when not logged in)
  if (showLanding && !isAuthenticated) {
    return <LandingPage onEnter={enterFromLanding} />;
  }

  // Gate 2: Auth wall
  if (!isAuthenticated) {
    return (
      <LoginPage
        onBackToLanding={returnToLanding}
        initialRegister={initialRegister}
      />
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
    <MainLayout activeTab={activeTab} onTabChange={handleTabChange}>
      {activeTab === 'patctc' && <PATCTCEditorPage />}
      {activeTab === 'social' && <SocialPage onViewProfile={handleViewUserProfile} />}
      {activeTab === 'documents' && <DocumentsPage onViewProfile={handleViewUserProfile} onTabChange={handleTabChange} />}
      {activeTab === 'profile' && <ProfilePage onTabChange={handleTabChange} />}
      {activeTab === 'user-profile' && viewingUserId && <ProfilePage viewingUserId={viewingUserId} onBack={handleBackFromProfile} onTabChange={handleTabChange} />}
      {activeTab === 'admin' && <AdminPage />}
    </MainLayout>
  );
}
