import React, { useState, useRef } from 'react';
import { Shield, FileText, Heart, MessageCircle, Clock, Camera, Save, X, Edit3, Lock, Eye, EyeOff, CheckCircle2, AlertTriangle, Download, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useSocialStore } from '../store/useSocialStore';
import { useStore } from '../store/useStore';

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

export const ProfilePage: React.FC<{ viewingUserId?: string }> = ({ viewingUserId }) => {
  const { user, updateProfile, changePassword, getAllUsers } = useAuthStore();
  const { posts, savedDocuments } = useSocialStore();
  const [isEditing, setIsEditing] = useState(false);

  // Determine if we're viewing another user's profile
  const allUsers = getAllUsers();
  const isViewingOther = viewingUserId && viewingUserId !== user?.id;
  const viewedUser = isViewingOther
    ? allUsers.find(u => u.id === viewingUserId)
    : user;

  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [activeProfileTab, setActiveProfileTab] = useState<'posts' | 'docs' | 'activity'>('posts');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Password change states
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwNotification, setPwNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!user) return null;
  if (!viewedUser) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <AlertTriangle size={48} className="mx-auto mb-4 text-zinc-300" />
        <p className="text-sm text-zinc-400">Không tìm thấy người dùng</p>
      </div>
    </div>
  );

  const profileUser = viewedUser;

  // User stats - use profileUser's ID
  const userPosts = posts.filter(p => p.authorId === profileUser.id);
  const userComments = posts.reduce((acc, p) => acc + p.comments.filter(c => c.authorId === profileUser.id).length, 0);
  const totalLikesReceived = userPosts.reduce((acc, p) => acc + p.likes.length, 0)
    + posts.reduce((acc, p) => acc + p.comments.filter(c => c.authorId === profileUser.id).reduce((a, c) => a + c.likes.length, 0), 0);
  const userDocs = savedDocuments.filter(d => d.authorId === profileUser.id);

  const handleSaveProfile = () => {
    if (!editName.trim()) return;
    updateProfile({ name: editName.trim(), email: editEmail.trim(), bio: editBio.trim() });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(user.name);
    setEditEmail(user.email);
    setEditBio(user.bio || '');
    setIsEditing(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Ảnh quá lớn (tối đa 5MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        updateProfile({ avatar: ev.target.result as string });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveAvatar = () => {
    updateProfile({ avatar: '' });
  };

  // Load a document into the editor
  const handleLoadDoc = (dataSnapshot: string) => {
    try {
      const parsed = JSON.parse(dataSnapshot);
      useStore.getState().setData(parsed);
      alert('Đã tải phương án vào trình soạn thảo! Chuyển sang tab "Lập phương án" để xem.');
    } catch {
      alert('Không thể tải dữ liệu');
    }
  };

  const handleChangePassword = () => {
    if (!oldPassword.trim()) {
      setPwNotification({ text: 'Vui lòng nhập mật khẩu hiện tại', type: 'error' });
      setTimeout(() => setPwNotification(null), 3000);
      return;
    }
    if (newPassword.length < 6) {
      setPwNotification({ text: 'Mật khẩu mới phải ít nhất 6 ký tự', type: 'error' });
      setTimeout(() => setPwNotification(null), 3000);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwNotification({ text: 'Mật khẩu xác nhận không khớp', type: 'error' });
      setTimeout(() => setPwNotification(null), 3000);
      return;
    }
    const success = changePassword(oldPassword, newPassword);
    if (success) {
      setPwNotification({ text: 'Đã đổi mật khẩu thành công!', type: 'success' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } else {
      setPwNotification({ text: 'Mật khẩu hiện tại không đúng', type: 'error' });
    }
    setTimeout(() => setPwNotification(null), 3000);
  };

  const STATS = [
    { label: 'Bài viết', value: userPosts.length, icon: FileText, color: 'blue' },
    { label: 'Bình luận', value: userComments, icon: MessageCircle, color: 'green' },
    { label: 'Lượt thích', value: totalLikesReceived, icon: Heart, color: 'red' },
    { label: 'Tài liệu', value: userDocs.length, icon: FileText, color: 'purple' },
  ];

  const hasAvatar = profileUser.avatar && profileUser.avatar.length > 0;

  return (
    <div className="h-full overflow-y-auto">
    <div className="max-w-3xl mx-auto py-4 sm:py-6 px-3 sm:px-4">
      {/* Hidden file input for avatar */}
      {!isViewingOther && (
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
      )}

      {/* Back button when viewing other user */}
      {isViewingOther && (
        <button
          onClick={() => window.history.back()}
          className="mb-4 px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-600 hover:bg-zinc-50 flex items-center gap-2 transition-all"
        >
          <ArrowLeft size={14} /> Quay lại
        </button>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden mb-6">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEuNSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2EpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50" />
        </div>

        {/* Avatar + Info */}
        <div className="px-6 pb-6 -mt-12 relative">
          <div className="flex items-end gap-4 mb-4">
            {/* Avatar with camera overlay */}
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl shadow-xl border-4 border-white overflow-hidden flex-shrink-0">
                {hasAvatar ? (
                  <img src={profileUser.avatar} alt={profileUser.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-3xl font-bold">
                    {getInitials(profileUser.name)}
                  </div>
                )}
              </div>
              {/* Camera overlay - only for own profile */}
              {!isViewingOther && (
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all cursor-pointer border-4 border-transparent"
                >
                  <Camera size={22} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                </button>
              )}
              {/* Remove avatar button */}
              {!isViewingOther && hasAvatar && (
                <button
                  onClick={handleRemoveAvatar}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                  title="Xóa ảnh đại diện"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex-1 pb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-zinc-900">{profileUser.name}</h1>
                {profileUser.role === 'admin' && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase rounded-full flex items-center gap-1">
                    <Shield size={10} /> Admin
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-500">{profileUser.email}</p>
              {profileUser.bio && (
                <p className="text-sm text-zinc-600 mt-1">{profileUser.bio}</p>
              )}
              {!profileUser.bio && !isEditing && !isViewingOther && (
                <button
                  onClick={() => { setEditName(user.name); setEditEmail(user.email); setEditBio(''); setIsEditing(true); }}
                  className="text-sm text-blue-500 hover:text-blue-600 mt-1 italic"
                >
                  + Thêm giới thiệu bản thân...
                </button>
              )}
            </div>
            {!isViewingOther && (
              <button
                onClick={() => {
                  if (isEditing) handleCancelEdit();
                  else { setEditName(user.name); setEditEmail(user.email); setEditBio(user.bio || ''); setIsEditing(true); }
                }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 flex-shrink-0 ${
                  isEditing
                    ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20'
                }`}
              >
                {isEditing ? <><X size={14} /> Hủy</> : <><Edit3 size={14} /> Chỉnh sửa</>}
              </button>
            )}
          </div>

          {/* Edit Form - only own profile */}
          {!isViewingOther && isEditing && (
            <div className="bg-zinc-50 rounded-xl p-4 mb-4 border border-zinc-200">
              <h3 className="text-sm font-bold text-zinc-700 mb-3">Chỉnh sửa hồ sơ</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-zinc-500 mb-1 block">Họ và tên</label>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500 mb-1 block">Email</label>
                  <input
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500 mb-1 block">Giới thiệu bản thân</label>
                  <textarea
                    value={editBio}
                    onChange={e => setEditBio(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Viết vài dòng giới thiệu về bản thân..."
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="px-4 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-sm font-medium rounded-xl transition-all flex items-center gap-2"
                  >
                    <Camera size={14} /> Đổi ảnh đại diện
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={!editName.trim()}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2"
                  >
                    <Save size={14} /> Lưu thay đổi
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STATS.map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="bg-zinc-50 rounded-xl p-3 text-center border border-zinc-100 hover:border-zinc-200 transition-colors">
                  <div className={`w-8 h-8 mx-auto mb-1.5 bg-${stat.color}-50 rounded-lg flex items-center justify-center`}>
                    <Icon size={16} className={`text-${stat.color}-500`} />
                  </div>
                  <div className="text-lg font-bold text-zinc-900">{stat.value}</div>
                  <div className="text-[11px] text-zinc-400">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Password Change Section - only own profile */}
      {!isViewingOther && (
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden mb-6">
        <button
          onClick={() => { setShowPasswordForm(!showPasswordForm); setOldPassword(''); setNewPassword(''); setConfirmPassword(''); }}
          className="w-full p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <Lock size={18} className="text-amber-500" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-zinc-700">Đổi mật khẩu</h3>
              <p className="text-xs text-zinc-400">Cập nhật mật khẩu đăng nhập của bạn</p>
            </div>
          </div>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform ${showPasswordForm ? 'rotate-180' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </button>

        {showPasswordForm && (
          <div className="px-4 pb-4 border-t border-zinc-100">
            <div className="mt-4 space-y-3 max-w-md">
              {/* Old password */}
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Mật khẩu hiện tại</label>
                <div className="relative">
                  <input
                    type={showOldPw ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại..."
                    className="w-full px-3 py-2.5 pr-10 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPw(!showOldPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showOldPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {/* New password */}
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Mật khẩu mới</label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới (≥6 ký tự)..."
                    className="w-full px-3 py-2.5 pr-10 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {/* Confirm password */}
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  onKeyDown={e => { if (e.key === 'Enter') handleChangePassword(); }}
                />
              </div>
              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleChangePassword}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <Lock size={14} /> Đổi mật khẩu
                </button>
                <button
                  onClick={() => { setShowPasswordForm(false); setOldPassword(''); setNewPassword(''); setConfirmPassword(''); }}
                  className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-sm font-medium rounded-xl transition-all"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Password notification */}
      {pwNotification && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-2 text-sm font-medium animate-in slide-in-from-right ${
          pwNotification.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {pwNotification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {pwNotification.text}
        </div>
      )}

      {/* Content Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { id: 'posts' as const, label: isViewingOther ? 'Bài viết' : 'Bài viết của tôi', icon: FileText },
          { id: 'docs' as const, label: 'Tài liệu', icon: FileText },
          { id: 'activity' as const, label: 'Hoạt động', icon: Clock },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveProfileTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
                activeProfileTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="space-y-3">
        {activeProfileTab === 'posts' && (
          <>
            {userPosts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
                <FileText size={40} className="mx-auto mb-3 text-zinc-200" />
                <p className="text-sm text-zinc-400">{isViewingOther ? 'Chưa có bài viết nào' : 'Bạn chưa đăng bài viết nào'}</p>
              </div>
            ) : (
              userPosts.map(post => (
                <div key={post.id} className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 hover:shadow-md transition-all">
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap line-clamp-3">{post.content}</p>
                  {post.images.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {post.images.slice(0, 3).map((img, i) => (
                        <div key={i} className="w-16 h-16 rounded-lg overflow-hidden bg-zinc-100">
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {post.images.length > 3 && (
                        <div className="w-16 h-16 rounded-lg bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-400">
                          +{post.images.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-xs text-zinc-400">
                    <span className="flex items-center gap-1"><Clock size={11} /> {timeAgo(post.createdAt)}</span>
                    <span className="flex items-center gap-1"><Heart size={11} /> {post.likes.length}</span>
                    <span className="flex items-center gap-1"><MessageCircle size={11} /> {post.comments.length}</span>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {activeProfileTab === 'docs' && (
          <>
            {userDocs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
                <FileText size={40} className="mx-auto mb-3 text-zinc-200" />
                <p className="text-sm text-zinc-400">{isViewingOther ? 'Chưa có tài liệu nào' : 'Bạn chưa lưu tài liệu nào'}</p>
              </div>
            ) : (
              userDocs.map(doc => (
                <div key={doc.id} className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 hover:shadow-md transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText size={20} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-zinc-900 truncate">{doc.title}</h3>
                      <p className="text-xs text-zinc-500 truncate">{doc.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-zinc-400">
                        <span className="flex items-center gap-1"><Clock size={11} /> {new Date(doc.updatedAt).toLocaleDateString('vi-VN')}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          doc.status === 'approved' ? 'bg-green-100 text-green-700'
                          : doc.status === 'completed' ? 'bg-blue-100 text-blue-700'
                          : 'bg-zinc-100 text-zinc-500'
                        }`}>
                          {doc.status === 'approved' ? 'Đã duyệt' : doc.status === 'completed' ? 'Hoàn thành' : 'Bản nháp'}
                        </span>
                      </div>
                    </div>
                    {/* Load/Download button */}
                    <button
                      onClick={() => handleLoadDoc(doc.dataSnapshot)}
                      className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 flex-shrink-0"
                      title={isViewingOther ? 'Tải về và chỉnh sửa' : 'Mở trong trình soạn thảo'}
                    >
                      <Download size={14} />
                      <span className="hidden sm:inline">{isViewingOther ? 'Tải về' : 'Mở'}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {activeProfileTab === 'activity' && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-100">
              <h3 className="text-sm font-bold text-zinc-700">Hoạt động gần đây</h3>
            </div>
            <div className="divide-y divide-zinc-50">
              {(() => {
                const activities: { type: string; text: string; time: string; icon: any; color: string }[] = [];

                userPosts.forEach(p => {
                  activities.push({
                    type: 'post',
                    text: `Đã đăng bài: "${p.content.slice(0, 60)}${p.content.length > 60 ? '...' : ''}"`,
                    time: p.createdAt,
                    icon: FileText,
                    color: 'blue'
                  });
                });

                posts.forEach(p => {
                  p.comments.filter(c => c.authorId === user.id).forEach(c => {
                    activities.push({
                      type: 'comment',
                      text: `Đã bình luận: "${c.content.slice(0, 50)}${c.content.length > 50 ? '...' : ''}"`,
                      time: c.createdAt,
                      icon: MessageCircle,
                      color: 'green'
                    });
                  });
                  if (p.likes.includes(user.id)) {
                    activities.push({
                      type: 'like',
                      text: `Đã thích bài viết của ${p.authorName}`,
                      time: p.createdAt,
                      icon: Heart,
                      color: 'red'
                    });
                  }
                });

                userDocs.forEach(d => {
                  activities.push({
                    type: 'doc',
                    text: `Đã lưu tài liệu: "${d.title}"`,
                    time: d.createdAt,
                    icon: FileText,
                    color: 'purple'
                  });
                });

                activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

                if (activities.length === 0) {
                  return (
                    <div className="p-8 text-center">
                      <Clock size={32} className="mx-auto mb-2 text-zinc-200" />
                      <p className="text-sm text-zinc-400">Chưa có hoạt động nào</p>
                    </div>
                  );
                }

                return activities.slice(0, 20).map((act, i) => {
                  const Icon = act.icon;
                  return (
                    <div key={i} className="px-4 py-3 flex items-start gap-3 hover:bg-zinc-50 transition-colors">
                      <div className={`w-8 h-8 bg-${act.color}-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon size={14} className={`text-${act.color}-500`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-700 truncate">{act.text}</p>
                        <span className="text-[11px] text-zinc-400">{timeAgo(act.time)}</span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};
