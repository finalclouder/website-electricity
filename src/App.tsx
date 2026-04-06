import React, { useState } from 'react';
import { useAuthStore } from './store/useAuthStore';
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

  // Auth gate: show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab !== 'profile' && tab !== 'user-profile') {
      setViewingUserId(null);
    }
  };

  const handleViewUserProfile = (userId: string) => {
    setViewingUserId(userId);
    setActiveTab('user-profile');
  };

  // Main app with tab navigation
  return (
    <MainLayout activeTab={activeTab} onTabChange={handleTabChange}>
      {activeTab === 'patctc' && <PATCTCEditorPage />}
      {activeTab === 'social' && <SocialPage onViewProfile={handleViewUserProfile} />}
      {activeTab === 'documents' && <DocumentsPage onViewProfile={handleViewUserProfile} />}
      {activeTab === 'profile' && <ProfilePage />}
      {activeTab === 'user-profile' && viewingUserId && <ProfilePage viewingUserId={viewingUserId} />}
      {activeTab === 'admin' && <AdminPage />}
    </MainLayout>
  );
}
