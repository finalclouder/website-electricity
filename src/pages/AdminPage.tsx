import React, { useState } from 'react';
import { Users, Shield, Trash2, Key, Search, UserPlus, Activity, FileText, MessageCircle, BarChart3, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuthStore, User } from '../store/useAuthStore';
import { useSocialStore } from '../store/useSocialStore';

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();
}

export const AdminPage: React.FC = () => {
  const { user, getAllUsers, deleteUser, toggleUserRole, resetUserPassword } = useAuthStore();
  const { posts, savedDocuments } = useSocialStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Shield size={48} className="mx-auto mb-4 text-red-300" />
          <h2 className="text-lg font-bold text-zinc-700">Không có quyền truy cập</h2>
          <p className="text-sm text-zinc-400 mt-1">Trang này chỉ dành cho quản trị viên</p>
        </div>
      </div>
    );
  }

  const allUsers = getAllUsers();
  const filteredUsers = allUsers.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const showNotif = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteUser = (userId: string) => {
    deleteUser(userId);
    setShowConfirmDelete(null);
    setRefreshKey(k => k + 1);
    showNotif('Đã xóa tài khoản');
  };

  const handleToggleRole = (userId: string) => {
    toggleUserRole(userId);
    setRefreshKey(k => k + 1);
    showNotif('Đã thay đổi quyền');
  };

  const handleResetPassword = (userId: string) => {
    if (!newPassword.trim() || newPassword.length < 6) {
      showNotif('Mật khẩu phải ít nhất 6 ký tự', 'error');
      return;
    }
    resetUserPassword(userId, newPassword.trim());
    setResetPasswordUserId(null);
    setNewPassword('');
    showNotif('Đã đặt lại mật khẩu');
  };

  // System stats
  const totalPosts = posts.length;
  const totalComments = posts.reduce((acc, p) => acc + p.comments.length, 0);
  const totalDocs = savedDocuments.length;
  const totalUsers = allUsers.length;
  const adminCount = allUsers.filter(u => u.role === 'admin').length;

  const STATS = [
    { label: 'Người dùng', value: totalUsers, icon: Users, color: 'blue', sub: `${adminCount} admin` },
    { label: 'Bài viết', value: totalPosts, icon: FileText, color: 'green', sub: 'trên cộng đồng' },
    { label: 'Bình luận', value: totalComments, icon: MessageCircle, color: 'amber', sub: 'tổng cộng' },
    { label: 'Tài liệu', value: totalDocs, icon: FileText, color: 'purple', sub: 'đã lưu' },
  ];

  return (
    <div className="h-full overflow-y-auto" key={refreshKey}>
      <div className="max-w-5xl mx-auto py-4 sm:py-6 px-3 sm:px-4">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-2 text-sm font-medium animate-in slide-in-from-right ${
          notification.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {notification.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <Shield size={22} className="text-blue-600" /> Quản trị hệ thống
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">Quản lý người dùng và theo dõi hệ thống</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {STATS.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 bg-${stat.color}-50 rounded-xl flex items-center justify-center`}>
                  <Icon size={20} className={`text-${stat.color}-500`} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-zinc-900">{stat.value}</div>
                  <div className="text-xs text-zinc-400">{stat.label}</div>
                </div>
              </div>
              <div className="text-[11px] text-zinc-300 mt-2">{stat.sub}</div>
            </div>
          );
        })}
      </div>

      {/* User Management */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-700 flex items-center gap-2">
            <Users size={16} /> Quản lý người dùng ({allUsers.length})
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                placeholder="Tìm kiếm người dùng..."
              />
            </div>
          </div>
        </div>

        {/* User Table */}
        <div className="divide-y divide-zinc-50">
          {/* Table Header - hidden on mobile */}
          <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2.5 bg-zinc-50 text-[11px] font-bold text-zinc-400 uppercase">
            <div className="col-span-4">Người dùng</div>
            <div className="col-span-2">Quyền</div>
            <div className="col-span-2">Bài viết</div>
            <div className="col-span-2">Ngày tạo</div>
            <div className="col-span-2 text-right">Thao tác</div>
          </div>

          {filteredUsers.map(u => {
            const userPostCount = posts.filter(p => p.authorId === u.id).length;
            const isCurrentUser = u.id === user.id;
            const userCommentCount = posts.reduce((acc, p) => acc + p.comments.filter(c => c.authorId === u.id).length, 0);

            return (
              <div key={u.id}>
                {/* Desktop row */}
                <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-zinc-50/50 transition-colors">
                  {/* User info */}
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
                      {u.avatar ? (
                        <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                          {getInitials(u.name)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-zinc-800 truncate flex items-center gap-1.5">
                        {u.name}
                        {isCurrentUser && <span className="text-[10px] text-blue-500 font-normal">(bạn)</span>}
                      </div>
                      <div className="text-xs text-zinc-400 truncate">{u.email}</div>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="col-span-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-zinc-100 text-zinc-500'
                    }`}>
                      <Shield size={10} /> {u.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </div>

                  {/* Posts */}
                  <div className="col-span-2 text-sm text-zinc-600">
                    <span>{userPostCount} bài</span>
                    <span className="text-zinc-300 mx-1">·</span>
                    <span>{userCommentCount} cmt</span>
                  </div>

                  {/* Date */}
                  <div className="col-span-2 text-xs text-zinc-400">
                    {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    {!isCurrentUser && (
                      <>
                        <button
                          onClick={() => handleToggleRole(u.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                          title={u.role === 'admin' ? 'Hạ quyền xuống User' : 'Nâng quyền lên Admin'}
                        >
                          <Shield size={14} />
                        </button>
                        <button
                          onClick={() => { setResetPasswordUserId(resetPasswordUserId === u.id ? null : u.id); setNewPassword(''); }}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                          title="Đặt lại mật khẩu"
                        >
                          <Key size={14} />
                        </button>
                        <button
                          onClick={() => setShowConfirmDelete(showConfirmDelete === u.id ? null : u.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          title="Xóa tài khoản"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Mobile card */}
                <div className="sm:hidden px-3 py-3 hover:bg-zinc-50/50 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
                      {u.avatar ? (
                        <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                          {getInitials(u.name)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-zinc-800 truncate flex items-center gap-1.5">
                        {u.name}
                        {isCurrentUser && <span className="text-[10px] text-blue-500 font-normal">(bạn)</span>}
                      </div>
                      <div className="text-xs text-zinc-400 truncate">{u.email}</div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-zinc-100 text-zinc-500'
                    }`}>
                      <Shield size={10} /> {u.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                      <span>{userPostCount} bài · {userCommentCount} cmt</span>
                      <span>{new Date(u.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {!isCurrentUser && (
                        <>
                          <button
                            onClick={() => handleToggleRole(u.id)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                          >
                            <Shield size={14} />
                          </button>
                          <button
                            onClick={() => { setResetPasswordUserId(resetPasswordUserId === u.id ? null : u.id); setNewPassword(''); }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                          >
                            <Key size={14} />
                          </button>
                          <button
                            onClick={() => setShowConfirmDelete(showConfirmDelete === u.id ? null : u.id)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reset Password Panel */}
                {resetPasswordUserId === u.id && (
                  <div className="px-3 sm:px-4 pb-3">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <div className="flex items-center gap-2">
                        <Key size={16} className="text-amber-500 flex-shrink-0" />
                        <span className="text-xs text-amber-700 font-medium whitespace-nowrap">Mật khẩu mới cho {u.name}:</span>
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          type="password"
                          placeholder="Nhập mật khẩu mới (≥6 ký tự)..."
                          className="flex-1 px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                        <button
                          onClick={() => handleResetPassword(u.id)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-all"
                        >
                          Đặt lại
                        </button>
                        <button
                          onClick={() => { setResetPasswordUserId(null); setNewPassword(''); }}
                          className="px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-600"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Confirm Delete Panel */}
                {showConfirmDelete === u.id && (
                  <div className="px-3 sm:px-4 pb-3">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                      <span className="text-xs text-red-700 font-medium flex-1">
                        Xác nhận xóa tài khoản <strong>{u.name}</strong>? Hành động này không thể hoàn tác.
                      </span>
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-all"
                      >
                        Xóa
                      </button>
                      <button
                        onClick={() => setShowConfirmDelete(null)}
                        className="px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-600"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredUsers.length === 0 && (
            <div className="p-8 text-center">
              <Users size={32} className="mx-auto mb-2 text-zinc-200" />
              <p className="text-sm text-zinc-400">Không tìm thấy người dùng nào</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden mt-6">
        <div className="p-4 border-b border-zinc-100">
          <h2 className="text-sm font-bold text-zinc-700 flex items-center gap-2">
            <Activity size={16} /> Hoạt động gần đây trên hệ thống
          </h2>
        </div>
        <div className="divide-y divide-zinc-50 max-h-80 overflow-y-auto">
          {(() => {
            const activities: { text: string; time: string; icon: any; color: string }[] = [];

            posts.forEach(p => {
              activities.push({
                text: `${p.authorName} đã đăng bài viết`,
                time: p.createdAt,
                icon: FileText,
                color: 'blue'
              });
              p.comments.forEach(c => {
                activities.push({
                  text: `${c.authorName} đã bình luận`,
                  time: c.createdAt,
                  icon: MessageCircle,
                  color: 'green'
                });
              });
            });

            savedDocuments.forEach(d => {
              activities.push({
                text: `${d.authorName} đã lưu tài liệu "${d.title.slice(0, 40)}"`,
                time: d.createdAt,
                icon: FileText,
                color: 'purple'
              });
            });

            activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

            if (activities.length === 0) {
              return (
                <div className="p-8 text-center">
                  <Activity size={32} className="mx-auto mb-2 text-zinc-200" />
                  <p className="text-sm text-zinc-400">Chưa có hoạt động nào</p>
                </div>
              );
            }

            const timeAgo = (dateStr: string) => {
              const diff = Date.now() - new Date(dateStr).getTime();
              const mins = Math.floor(diff / 60000);
              if (mins < 1) return 'Vừa xong';
              if (mins < 60) return `${mins} phút trước`;
              const hrs = Math.floor(mins / 60);
              if (hrs < 24) return `${hrs} giờ trước`;
              const days = Math.floor(hrs / 24);
              if (days < 7) return `${days} ngày trước`;
              return new Date(dateStr).toLocaleDateString('vi-VN');
            };

            return activities.slice(0, 30).map((act, i) => {
              const Icon = act.icon;
              return (
                <div key={i} className="px-4 py-2.5 flex items-center gap-3 hover:bg-zinc-50 transition-colors">
                  <div className={`w-7 h-7 bg-${act.color}-50 rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon size={13} className={`text-${act.color}-500`} />
                  </div>
                  <p className="text-sm text-zinc-600 flex-1 truncate">{act.text}</p>
                  <span className="text-[11px] text-zinc-300 flex-shrink-0">{timeAgo(act.time)}</span>
                </div>
              );
            });
          })()}
        </div>
      </div>
      </div>
    </div>
  );
};
