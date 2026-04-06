import React from 'react';
import { Zap, FileText, Users, FolderOpen, LogOut, Settings, User } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

interface MainLayoutProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();
}

export const MainLayout: React.FC<MainLayoutProps> = ({ activeTab, onTabChange, children }) => {
  const { user, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  const TABS = [
    { id: 'patctc', label: 'Lập phương án', icon: FileText },
    { id: 'social', label: 'Cộng đồng', icon: Users },
    { id: 'documents', label: 'Tài liệu đã lưu', icon: FolderOpen },
  ];

  return (
    <div className="h-screen flex flex-col bg-zinc-100 overflow-hidden">
      {/* Top Nav Bar */}
      <nav className="bg-white border-b border-zinc-200 px-2 sm:px-4 py-0 flex items-center justify-between flex-shrink-0 h-12 sm:h-14 shadow-sm z-50">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
            <Zap size={18} className="text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-zinc-900 leading-tight">PATCTC</h1>
            <p className="text-[10px] text-zinc-400 leading-tight">Generator</p>
          </div>
        </div>

        {/* Center: Tabs */}
        <div className="flex items-center bg-zinc-100 rounded-lg sm:rounded-xl p-0.5 sm:p-1 gap-0.5">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700 hover:bg-white/50'
                }`}
              >
                <Icon size={16} />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 hover:bg-zinc-50 rounded-xl px-2.5 py-1.5 transition-all"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt={user?.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  {user ? getInitials(user.name) : '?'}
                </div>
              )}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-zinc-700 leading-tight">{user?.name}</div>
              <div className="text-[10px] text-zinc-400 leading-tight capitalize">{user?.role}</div>
            </div>
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-12 bg-white border border-zinc-200 rounded-xl shadow-xl py-1 z-50 min-w-48">
                <div className="px-3 py-2 border-b border-zinc-100">
                  <div className="text-sm font-semibold text-zinc-800">{user?.name}</div>
                  <div className="text-xs text-zinc-400">{user?.email}</div>
                </div>
                <button
                  onClick={() => { onTabChange('profile'); setShowUserMenu(false); }}
                  className="w-full px-3 py-2.5 text-left text-sm text-zinc-600 hover:bg-zinc-50 flex items-center gap-2.5 transition-colors"
                >
                  <User size={15} className="text-zinc-400" /> Hồ sơ cá nhân
                </button>
                {user?.role === 'admin' && (
                  <button
                    onClick={() => { onTabChange('admin'); setShowUserMenu(false); }}
                    className="w-full px-3 py-2.5 text-left text-sm text-zinc-600 hover:bg-zinc-50 flex items-center gap-2.5 transition-colors"
                  >
                    <Settings size={15} className="text-zinc-400" /> Quản trị hệ thống
                  </button>
                )}
                <div className="border-t border-zinc-100 mt-1 pt-1">
                  <button
                    onClick={logout}
                    className="w-full px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                  >
                    <LogOut size={15} /> Đăng xuất
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
};
