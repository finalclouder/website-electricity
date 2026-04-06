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

  // Auth gate: show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Main app with tab navigation
  return (
    <MainLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'patctc' && <PATCTCEditorPage />}
      {activeTab === 'social' && <SocialPage />}
      {activeTab === 'documents' && <DocumentsPage />}
      {activeTab === 'profile' && <ProfilePage />}
      {activeTab === 'admin' && <AdminPage />}
    </MainLayout>
  );
}
