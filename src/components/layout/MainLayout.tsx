import React from 'react';
import { Bell, FileText, LogOut, Settings, User, Users, FolderOpen, UserCheck, X } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useSocialStore } from '../../store/useSocialStore';
import { useNavigationStore } from '../../store/useNavigationStore';
import { timeAgo } from '../../utils/date';

interface MainLayoutProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

function getInitials(name?: string): string {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();
}

export const MainLayout: React.FC<MainLayoutProps> = ({ activeTab, onTabChange, children }) => {
  const { user, logout } = useAuthStore();
  const {
    notifications,
    unreadNotificationCount,
    incomingFriendRequests,
    fetchNotifications,
    fetchUnreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    acceptFriendRequest,
    rejectFriendRequest,
  } = useSocialStore();
  const { viewUserProfile, navigateToTab, navigateToPost } = useNavigationStore();
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = React.useState(false);
  const [friendActionLoading, setFriendActionLoading] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!showNotificationMenu) return;
    fetchNotifications();
    fetchUnreadNotificationCount();
  }, [showNotificationMenu, fetchNotifications, fetchUnreadNotificationCount]);

  const TABS = [
    { id: 'patctc', label: 'Lập phương án', icon: FileText },
    { id: 'social', label: 'Cộng đồng', icon: Users },
    { id: 'documents', label: 'Tài liệu đã lưu', icon: FolderOpen },
  ];

  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const safeUnreadNotificationCount = typeof unreadNotificationCount === 'number' ? unreadNotificationCount : 0;
  const recentNotifications = safeNotifications.slice(0, 8);

  /** Navigate to the relevant entity when a notification row is clicked */
  function handleNotificationClick(notification: (typeof safeNotifications)[number]) {
    if (!notification.isRead) {
      markNotificationRead(notification.id);
    }
    setShowNotificationMenu(false);

    switch (notification.type) {
      case 'follow':
      case 'friend_accept':
        // Go to the actor's profile
        if (notification.actorId) {
          viewUserProfile(notification.actorId);
        }
        break;
      case 'friend_request':
        // Go to sender's profile so they can accept right there too
        if (notification.actorId) {
          viewUserProfile(notification.actorId);
        }
        break;
      case 'post_like':
      case 'post_comment':
      case 'post_share':
      case 'comment_like':
        // Navigate to social tab and scroll to the specific post
        navigateToPost(notification.entityId);
        break;
      case 'document_download':
        navigateToTab('documents');
        break;
      default:
        break;
    }
  }

  async function handleAcceptFromNotification(notification: (typeof safeNotifications)[number]) {
    if (!notification.actorId) return;
    const request = incomingFriendRequests.find(r => r.senderId === notification.actorId);
    if (!request) return;
    setFriendActionLoading(notification.id);
    try {
      await acceptFriendRequest(request.id);
      markNotificationRead(notification.id);
    } finally {
      setFriendActionLoading(null);
    }
  }

  async function handleRejectFromNotification(notification: (typeof safeNotifications)[number]) {
    if (!notification.actorId) return;
    const request = incomingFriendRequests.find(r => r.senderId === notification.actorId);
    if (!request) return;
    setFriendActionLoading(notification.id + '_reject');
    try {
      await rejectFriendRequest(request.id);
      markNotificationRead(notification.id);
    } finally {
      setFriendActionLoading(null);
    }
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-100 overflow-hidden">
      <nav className="bg-white border-b border-zinc-200 px-2 sm:px-4 py-0 flex items-center justify-between flex-shrink-0 h-12 sm:h-14 shadow-sm z-50">
        <div className="flex items-center gap-3">
          <img src="/logo-square.png" alt="Logo" className="w-8 h-8 object-contain rounded-md border border-zinc-200 shadow-sm bg-white p-0.5" />
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-zinc-900 leading-tight">PATCTC</h1>
            <p className="text-[10px] text-zinc-400 leading-tight">Generator</p>
          </div>
        </div>

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

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => {
                setShowNotificationMenu(prev => !prev);
                setShowUserMenu(false);
              }}
              aria-label="Mở thông báo"
              className="relative flex items-center justify-center w-10 h-10 hover:bg-zinc-50 rounded-xl transition-all"
            >
              <Bell size={18} className={showNotificationMenu ? 'text-blue-600' : 'text-zinc-500'} />
              {safeUnreadNotificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                  {safeUnreadNotificationCount > 99 ? '99+' : safeUnreadNotificationCount}
                </span>
              )}
            </button>

            {showNotificationMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotificationMenu(false)} />
                <div className="absolute right-0 top-12 bg-white border border-zinc-200 rounded-2xl shadow-xl z-50 w-[320px] sm:w-[360px] overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-zinc-800">Thông báo</div>
                      <div className="text-xs text-zinc-400">{safeUnreadNotificationCount} chưa đọc</div>
                    </div>
                    <button
                      onClick={() => markAllNotificationsRead()}
                      disabled={safeNotifications.length === 0 || safeUnreadNotificationCount === 0}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:text-zinc-300"
                    >
                      Đánh dấu tất cả
                    </button>
                  </div>

                  <div className="max-h-[480px] overflow-y-auto">
                    {recentNotifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-zinc-400">
                        Chưa có thông báo nào
                      </div>
                    ) : (
                      recentNotifications.map(notification => {
                        const isFriendRequest = notification.type === 'friend_request';
                        const hasPendingRequest = isFriendRequest && notification.actorId
                          ? incomingFriendRequests.some(r => r.senderId === notification.actorId)
                          : false;
                        const isLoadingAccept = friendActionLoading === notification.id;
                        const isLoadingReject = friendActionLoading === notification.id + '_reject';

                        return (
                          <div
                            key={notification.id}
                            className={`px-4 py-3 border-b border-zinc-50 last:border-b-0 ${notification.isRead ? 'bg-white' : 'bg-blue-50/50'}`}
                          >
                            {/* Clickable row — navigates to the relevant entity */}
                            <button
                              className="flex items-start gap-3 w-full text-left hover:opacity-80 transition-opacity"
                              onClick={() => handleNotificationClick(notification)}
                            >
                              <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${notification.isRead ? 'bg-zinc-200' : 'bg-blue-500'}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-zinc-700 leading-5">{notification.message || 'Bạn có một thông báo mới'}</p>
                                <p className="text-[11px] text-zinc-400 mt-0.5">{timeAgo(notification.createdAt)}</p>
                              </div>
                            </button>

                            {/* Inline accept/reject for pending friend requests */}
                            {hasPendingRequest && (
                              <div className="flex gap-2 mt-2 ml-5">
                                <button
                                  onClick={() => handleAcceptFromNotification(notification)}
                                  disabled={isLoadingAccept || isLoadingReject}
                                  className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-60"
                                >
                                  <UserCheck size={12} />
                                  {isLoadingAccept ? 'Đang xử lý...' : 'Chấp nhận'}
                                </button>
                                <button
                                  onClick={() => handleRejectFromNotification(notification)}
                                  disabled={isLoadingAccept || isLoadingReject}
                                  className="flex items-center gap-1 px-3 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-xs font-medium rounded-lg transition-colors disabled:opacity-60"
                                >
                                  <X size={12} />
                                  {isLoadingReject ? 'Đang xử lý...' : 'Từ chối'}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(prev => !prev);
                setShowNotificationMenu(false);
              }}
              aria-label="Mở menu người dùng"
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
        </div>
      </nav>

      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
};
