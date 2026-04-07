import React, { useState } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { MainLayout } from './components/layout/MainLayout';
import { PATCTCEditorPage } from './pages/PATCTCEditorPage';
import { SocialPage } from './pages/SocialPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';

export default function App() {
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState('patctc');
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [previousTab, setPreviousTab] = useState('social');
  const [showLanding, setShowLanding] = useState(true);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [initialRegister, setInitialRegister] = useState(false);

  // When user logs in successfully, check if there's a pending tab from quick actions
  const prevAuth = React.useRef(isAuthenticated);
  React.useEffect(() => {
    if (!prevAuth.current && isAuthenticated && pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
    prevAuth.current = isAuthenticated;
  }, [isAuthenticated, pendingTab]);

  // Gate 1: Public landing page (only when not logged in)
  if (showLanding && !isAuthenticated) {
    return (
      <LandingPage
        onEnter={(options) => {
          if (options?.tab) {
            setPendingTab(options.tab);
          }
          if (options?.register) {
            setInitialRegister(true);
          } else {
            setInitialRegister(false);
          }
          setShowLanding(false);
        }}
      />
    );
  }

  // Gate 2: Auth wall
  if (!isAuthenticated) {
    return (
      <LoginPage
        onBackToLanding={() => {
          setShowLanding(true);
          setPendingTab(null);
          setInitialRegister(false);
        }}
        initialRegister={initialRegister}
      />
    );
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab !== 'profile' && tab !== 'user-profile') {
      setViewingUserId(null);
    }
  };

  const handleViewUserProfile = (userId: string) => {
    setPreviousTab(activeTab);
    setViewingUserId(userId);
    setActiveTab('user-profile');
  };

  const handleBackFromProfile = () => {
    setViewingUserId(null);
    setActiveTab(previousTab);
  };

  // Main app with tab navigation
  return (
    <MainLayout activeTab={activeTab} onTabChange={handleTabChange}>
      {activeTab === 'patctc' && <PATCTCEditorPage />}
      {activeTab === 'social' && <SocialPage onViewProfile={handleViewUserProfile} />}
      {activeTab === 'documents' && <DocumentsPage onViewProfile={handleViewUserProfile} />}
      {activeTab === 'profile' && <ProfilePage />}
      {activeTab === 'user-profile' && viewingUserId && <ProfilePage viewingUserId={viewingUserId} onBack={handleBackFromProfile} />}
      {activeTab === 'admin' && <AdminPage />}
    </MainLayout>
  );
}
