import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Shield, FileDown, FileText, Heart, MessageCircle, Clock, Camera, Save, X, Edit3, Lock, Eye, EyeOff, CheckCircle2, AlertTriangle, Download, ArrowLeft, Copy } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useSocialStore, SavedDocument } from '../store/useSocialStore';
import { useStore } from '../store/useStore';
import { PATCTCData } from '../types';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';
import { parseAppDate, timeAgo } from '../utils/date';
import { api, getAuthHeaders } from '../utils/api';

function getInitials(name?: string): string {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();
}

export const ProfilePage: React.FC<{ viewingUserId?: string; onBack?: () => void; onTabChange?: (tab: string) => void }> = ({ viewingUserId, onBack, onTabChange }) => {
  const { user, updateProfile, changePassword, getAllUsers, fetchUserById } = useAuthStore();
  const {
    posts,
    savedDocuments,
    saveDocument,
    relationshipsByUserId,
    followersByUserId,
    followingByUserId,
    incomingFriendRequests,
    outgoingFriendRequests,
    friends,
    documentDownloadsByDocumentId,
    fetchRelationship,
    fetchFollowers,
    fetchFollowing,
    fetchFriends,
    fetchDocumentDownloads,
    followUser,
    unfollowUser,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    trackDocumentDownload,
    updateDocumentStatus,
  } = useSocialStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileFetchMissed, setProfileFetchMissed] = useState(false);
  const [viewedUserDocuments, setViewedUserDocuments] = useState<SavedDocument[]>([]);
  const [isDocumentsLoading, setIsDocumentsLoading] = useState(false);
  const [isRelationshipLoading, setIsRelationshipLoading] = useState(false);
  const [relationshipError, setRelationshipError] = useState<string | null>(null);

  const allUsers = getAllUsers();

  const isOwner = Boolean(user && (!viewingUserId || viewingUserId === user.id));
  const isViewingOther = Boolean(viewingUserId && user && viewingUserId !== user.id);

  const viewedUser = useMemo(() => {
    if (isOwner) return user;
    if (!viewingUserId) return null;
    return allUsers.find(candidate => candidate.id === viewingUserId) ?? null;
  }, [allUsers, isOwner, user, viewingUserId]);

  const safePosts = Array.isArray(posts) ? posts : [];
  const safeSavedDocuments = Array.isArray(savedDocuments) ? savedDocuments : [];
  const safeFriends = Array.isArray(friends) ? friends : [];
  const safeIncomingFriendRequests = Array.isArray(incomingFriendRequests) ? incomingFriendRequests : [];
  const safeOutgoingFriendRequests = Array.isArray(outgoingFriendRequests) ? outgoingFriendRequests : [];
  const safeRelationshipsByUserId = relationshipsByUserId && typeof relationshipsByUserId === 'object' ? relationshipsByUserId : {};
  const safeFollowersByUserId = followersByUserId && typeof followersByUserId === 'object' ? followersByUserId : {};
  const safeFollowingByUserId = followingByUserId && typeof followingByUserId === 'object' ? followingByUserId : {};
  const safeDocumentDownloadsByDocumentId = documentDownloadsByDocumentId && typeof documentDownloadsByDocumentId === 'object' ? documentDownloadsByDocumentId : {};

  const profileUser = viewedUser ?? (isOwner ? user : null);
  const relationship = viewingUserId ? safeRelationshipsByUserId[viewingUserId] : undefined;
  const followerCount = profileUser ? (safeFollowersByUserId[profileUser.id]?.length ?? relationship?.followerCount ?? 0) : 0;
  const followingCount = profileUser ? (safeFollowingByUserId[profileUser.id]?.length ?? relationship?.followingCount ?? 0) : 0;
  const isFriend = Boolean(profileUser && safeFriends.some(friend => friend.userId === profileUser.id));
  const incomingRequest = profileUser ? safeIncomingFriendRequests.find(request => request.senderId === profileUser.id) : undefined;
  const outgoingRequest = profileUser ? safeOutgoingFriendRequests.find(request => request.receiverId === profileUser.id) : undefined;

  const userDocs = useMemo(() => {
    if (!profileUser) return [];
    return isViewingOther
      ? (Array.isArray(viewedUserDocuments) ? viewedUserDocuments : [])
      : safeSavedDocuments.filter(doc => doc.authorId === profileUser.id);
  }, [isViewingOther, profileUser, viewedUserDocuments, safeSavedDocuments]);

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
  const [profileNotification, setProfileNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Document preview state
  const [previewDoc, setPreviewDoc] = useState<SavedDocument | null>(null);
  const [previewData, setPreviewData] = useState<PATCTCData | null>(null);
  const [downloadHistoryDocId, setDownloadHistoryDocId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setEditBio(user.bio || '');
  }, [user?.id, user?.name, user?.email, user?.bio]);

  useEffect(() => {
    if (!viewingUserId || viewingUserId === user?.id) {
      setProfileFetchMissed(false);
      setIsProfileLoading(false);
      return;
    }

    const hasCachedUser = (Array.isArray(allUsers) ? allUsers : []).some(candidate => candidate.id === viewingUserId);
    if (hasCachedUser) {
      setProfileFetchMissed(false);
      setIsProfileLoading(false);
      return;
    }

    let cancelled = false;
    setIsProfileLoading(true);
    setProfileFetchMissed(false);

    fetchUserById(viewingUserId)
      .then(foundUser => {
        if (!cancelled) {
          setProfileFetchMissed(!foundUser);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfileFetchMissed(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsProfileLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [viewingUserId, user?.id, allUsers, fetchUserById]);

  useEffect(() => {
    if (!viewingUserId || viewingUserId === user?.id) {
      setViewedUserDocuments([]);
      setIsDocumentsLoading(false);
      return;
    }

    let cancelled = false;
    setIsDocumentsLoading(true);

    api.get<SavedDocument[]>(`/documents/user/${viewingUserId}`)
      .then(docs => {
        if (!cancelled) {
          setViewedUserDocuments(docs);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setViewedUserDocuments([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsDocumentsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [viewingUserId, user?.id]);

  useEffect(() => {
    if (!viewingUserId || viewingUserId === user?.id) {
      setIsRelationshipLoading(false);
      setRelationshipError(null);
      return;
    }

    let cancelled = false;
    setIsRelationshipLoading(true);
    setRelationshipError(null);

    Promise.all([
      fetchRelationship(viewingUserId),
      fetchFollowers(viewingUserId),
      fetchFollowing(viewingUserId),
      fetchFriends(),
    ])
      .catch((error: any) => {
        if (!cancelled) {
          setRelationshipError(error?.message || 'Không thể tải quan hệ người dùng');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsRelationshipLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [viewingUserId, user?.id, fetchRelationship, fetchFollowers, fetchFollowing, fetchFriends]);

  useEffect(() => {
    if (!isOwner) {
      setDownloadHistoryDocId(null);
      return;
    }

    if (activeProfileTab !== 'activity') {
      setDownloadHistoryDocId(null);
    }
  }, [activeProfileTab, isOwner]);

  useEffect(() => {
    if (!downloadHistoryDocId || !isOwner) return;
    fetchDocumentDownloads(downloadHistoryDocId);
  }, [downloadHistoryDocId, isOwner, fetchDocumentDownloads]);

  const openPreview = (doc: SavedDocument) => {
    try {
      const parsed = JSON.parse(doc.dataSnapshot) as PATCTCData;
      setPreviewData(parsed);
      setPreviewDoc(doc);
    } catch {
      alert('Không thể đọc dữ liệu tài liệu');
    }
  };

  const showProfileNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setProfileNotification({ text, type });
    setTimeout(() => setProfileNotification(null), 3000);
  };

  const handleFollowToggle = async () => {
    if (!viewingUserId || !profileUser) return;

    const result = relationship?.isFollowing
      ? await unfollowUser(viewingUserId)
      : await followUser(viewingUserId);

    if (!result.ok) {
      showProfileNotification(result.error || 'Không thể cập nhật theo dõi', 'error');
      return;
    }

    try {
      await Promise.all([
        fetchRelationship(viewingUserId),
        fetchFollowers(viewingUserId),
        user ? fetchFollowing(user.id) : Promise.resolve(),
      ]);
    } catch (error) {
      console.error('Follow toggle refetch error:', error);
    }
  };

  const handleFriendAction = async () => {
    if (!viewingUserId || !profileUser) return;

    const result = incomingRequest
      ? await acceptFriendRequest(incomingRequest.id)
      : outgoingRequest
        ? await cancelFriendRequest(outgoingRequest.id)
        : !isFriend
          ? await sendFriendRequest(viewingUserId)
          : { ok: true };

    if (!result.ok) {
      showProfileNotification(result.error || 'Không thể cập nhật trạng thái kết bạn', 'error');
      return;
    }

    try {
      await Promise.all([
        fetchRelationship(viewingUserId),
        fetchFriends(),
      ]);
    } catch (error) {
      console.error('Friend action refetch error:', error);
    }
  };

  const handleRejectIncomingRequest = async () => {
    if (!incomingRequest || !viewingUserId) return;

    const result = await rejectFriendRequest(incomingRequest.id);
    if (!result.ok) {
      showProfileNotification(result.error || 'Không thể từ chối lời mời kết bạn', 'error');
      return;
    }

    try {
      await Promise.all([
        fetchRelationship(viewingUserId),
        fetchFriends(),
      ]);
    } catch (error) {
      console.error('Reject friend request refetch error:', error);
    }
  };

  if (!user) return null;
  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-400">
        Đang tải hồ sơ...
      </div>
    );
  }
  if (!viewedUser && profileFetchMissed) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-400">
        Không tìm thấy người dùng
      </div>
    );
  }
  if (!profileUser) return null;

  // User stats - use profileUser's ID
  const userPosts = safePosts.filter(p => p.authorId === profileUser.id);
  const userComments = safePosts.reduce((acc, p) => acc + (Array.isArray(p.comments) ? p.comments : []).filter(c => c.authorId === profileUser.id).length, 0);
  const totalLikesReceived = userPosts.reduce((acc, p) => acc + (Array.isArray(p.likes) ? p.likes.length : 0), 0)
    + safePosts.reduce((acc, p) => acc + (Array.isArray(p.comments) ? p.comments : []).filter(c => c.authorId === profileUser.id).reduce((a, c) => a + (Array.isArray(c.likes) ? c.likes.length : 0), 0), 0);

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    const result = await updateProfile({ name: editName.trim(), email: editEmail.trim(), bio: editBio.trim() });
    if (result.ok) {
      showProfileNotification('Đã cập nhật hồ sơ thành công!');
      setIsEditing(false);
    } else {
      showProfileNotification(result.error || 'Lỗi cập nhật hồ sơ', 'error');
    }
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

  // Load a document into the editor and navigate
  const handleLoadDoc = async (doc: SavedDocument) => {
    try {
      if (user && doc.authorId !== user.id) {
        await trackDocumentDownload(doc.id);
      }
      const parsed = JSON.parse(doc.dataSnapshot);
      useStore.getState().setData(parsed);
      onTabChange?.('patctc');
    } catch {
      alert('Không thể tải dữ liệu');
    }
  };

  // Clone another user's document as own draft and navigate to editor
  const handleCloneDoc = (doc: SavedDocument) => {
    if (!user) return;
    try {
      const parsed = JSON.parse(doc.dataSnapshot);
      useStore.getState().setData(parsed);
      const title = `[Sao chép] ${doc.title}`;
      saveDocument({
        title,
        description: doc.description,
        authorId: user.id,
        authorName: user.name,
        dataSnapshot: JSON.stringify(parsed),
        status: 'draft',
        tags: doc.tags,
      });
      onTabChange?.('patctc');
    } catch {
      alert('Không thể sao chép tài liệu');
    }
  };

  const handleApproveDocument = async (doc: SavedDocument) => {
    const result = await updateDocumentStatus(doc.id, 'approved');
    if (!result.ok) {
      showProfileNotification(result.error || 'Không thể duyệt tài liệu', 'error');
      return;
    }

    if (isViewingOther && viewingUserId) {
      setViewedUserDocuments(currentDocs => currentDocs.map(item =>
        item.id === doc.id ? { ...item, status: 'approved', updatedAt: new Date().toISOString() } : item
      ));
    }

    showProfileNotification('Đã duyệt tài liệu');
  };

  const handleChangePassword = async () => {
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
    const result = await changePassword(oldPassword, newPassword);
    if (result.ok) {
      setPwNotification({ text: 'Đã đổi mật khẩu thành công!', type: 'success' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } else {
      setPwNotification({ text: result.error || 'Mật khẩu hiện tại không đúng', type: 'error' });
    }
    setTimeout(() => setPwNotification(null), 3000);
  };

  const exportPdf = async (doc: SavedDocument) => {
    try {
      if (user && doc.authorId !== user.id) {
        await trackDocumentDownload(doc.id);
      }

      const parsed = JSON.parse(doc.dataSnapshot);
      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(parsed),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Server error' }));
        throw new Error(errorData.error || 'Server error');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PATCTC_${parsed.soVb || 'export'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Không thể tải file PDF');
    }
  };

  const exportWord = async (doc: SavedDocument) => {
    try {
      if (user && doc.authorId !== user.id) {
        await trackDocumentDownload(doc.id);
      }

      const parsed = JSON.parse(doc.dataSnapshot);
      const res = await fetch('/api/export/docx', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(parsed),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Server error' }));
        throw new Error(errorData.error || 'Server error');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PATCTC_${parsed.soVb || 'export'}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Không thể tải file Word');
    }
  };

  const STATS = [
    { label: 'Bài viết', value: userPosts.length, icon: FileText, color: 'blue' },
    { label: 'Bình luận', value: userComments, icon: MessageCircle, color: 'green' },
    { label: 'Lượt thích', value: totalLikesReceived, icon: Heart, color: 'red' },
    { label: 'Tài liệu', value: userDocs.length, icon: FileText, color: 'purple' },
  ];

  const relationshipStats = [
    { label: 'Người theo dõi', value: followerCount },
    { label: 'Đang theo dõi', value: followingCount },
    { label: 'Bạn bè', value: isFriend ? 1 : 0 },
  ];

  const currentDownloadHistory = downloadHistoryDocId
    ? (Array.isArray(safeDocumentDownloadsByDocumentId[downloadHistoryDocId]) ? safeDocumentDownloadsByDocumentId[downloadHistoryDocId] : [])
    : [];

  const hasAvatar = profileUser.avatar && profileUser.avatar.length > 0;

  return (
    <div className="h-full overflow-y-auto">
    <div className="max-w-3xl mx-auto py-4 sm:py-6 px-3 sm:px-4">
      {/* Hidden file input for avatar */}
      {isOwner && (
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
          onClick={() => onBack ? onBack() : window.history.back()}
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
              {isOwner && (
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all cursor-pointer border-4 border-transparent"
                >
                  <Camera size={22} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                </button>
              )}
              {/* Remove avatar button */}
              {isOwner && hasAvatar && (
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
              {profileUser.email && (
                <p className="text-sm text-zinc-500">{profileUser.email}</p>
              )}
              {profileUser.bio && (
                <p className="text-sm text-zinc-600 mt-1">{profileUser.bio}</p>
              )}
              {!profileUser.bio && !isEditing && isOwner && (
                <button
                  onClick={() => { setEditName(user.name); setEditEmail(user.email); setEditBio(''); setIsEditing(true); }}
                  className="text-sm text-blue-500 hover:text-blue-600 mt-1 italic"
                >
                  + Thêm giới thiệu bản thân...
                </button>
              )}
            </div>
            {isOwner ? (
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
            ) : isViewingOther ? (
              <div className="flex flex-col gap-2 items-stretch sm:items-end">
                <button
                  onClick={handleFollowToggle}
                  disabled={isRelationshipLoading}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${relationship?.isFollowing ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20'} disabled:opacity-60`}
                >
                  {relationship?.isFollowing ? 'Bỏ theo dõi' : 'Theo dõi'}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={handleFriendAction}
                    disabled={isRelationshipLoading || isFriend}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-60 ${isFriend ? 'bg-green-100 text-green-700' : incomingRequest ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20' : outgoingRequest ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-500/20'}`}
                  >
                    {isFriend ? 'Đã là bạn' : incomingRequest ? 'Chấp nhận lời mời' : outgoingRequest ? 'Hủy lời mời' : 'Kết bạn'}
                  </button>
                  {incomingRequest && (
                    <button
                      onClick={handleRejectIncomingRequest}
                      disabled={isRelationshipLoading}
                      className="px-4 py-2 rounded-xl text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-all disabled:opacity-60"
                    >
                      Từ chối
                    </button>
                  )}
                </div>
                {relationshipError && (
                  <p className="text-xs text-red-500 text-right max-w-56">{relationshipError}</p>
                )}
              </div>
            ) : null}
          </div>

          {/* Edit Form - only own profile */}
          {isOwner && isEditing && (
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

          {!isOwner && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              {relationshipStats.map(stat => (
                <div key={stat.label} className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                  <div className="text-lg font-bold text-blue-700">{stat.value}</div>
                  <div className="text-[11px] text-blue-500">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Password Change Section - only own profile */}
      {isOwner && (
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
      {profileNotification && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-2 text-sm font-medium animate-in slide-in-from-right ${
          profileNotification.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {profileNotification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {profileNotification.text}
        </div>
      )}

      {pwNotification && (
        <div className={`fixed top-36 right-4 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-2 text-sm font-medium animate-in slide-in-from-right ${
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
            {isDocumentsLoading ? (
              <p className="text-sm text-zinc-400">Đang tải tài liệu...</p>
            ) : userDocs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
                <FileText size={40} className="mx-auto mb-3 text-zinc-200" />
                <p className="text-sm text-zinc-400">
                  {isOwner ? 'Bạn chưa có tài liệu nào' : 'Người dùng này chưa có tài liệu nào'}
                </p>
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
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-zinc-400">
                        <span className="flex items-center gap-1"><Clock size={11} /> {timeAgo(doc.updatedAt)}</span>
                        <span className="flex items-center gap-1"><Download size={11} /> {doc.downloadCount ?? 0} lượt tải</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          doc.status === 'approved' ? 'bg-green-100 text-green-700'
                          : doc.status === 'completed' ? 'bg-blue-100 text-blue-700'
                          : 'bg-zinc-100 text-zinc-500'
                        }`}>
                          {doc.status === 'approved' ? 'Đã duyệt' : doc.status === 'completed' ? 'Hoàn thành' : 'Bản nháp'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                      <button
                        onClick={() => openPreview(doc)}
                        className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                        title="Xem trước"
                      >
                        <Eye size={14} />
                        <span className="hidden sm:inline">Xem trước</span>
                      </button>
                      <button
                        onClick={() => exportPdf(doc)}
                        className="px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-600 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                        title="Tải PDF"
                      >
                        <FileDown size={14} />
                        <span className="hidden sm:inline">PDF</span>
                      </button>
                      <button
                        onClick={() => exportWord(doc)}
                        className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                        title="Tải Word"
                      >
                        <FileText size={14} />
                        <span className="hidden sm:inline">Word</span>
                      </button>
                      {isViewingOther && (
                        <button
                          onClick={() => handleCloneDoc(doc)}
                          className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-600 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                          title="Sao chép về của tôi"
                        >
                          <Copy size={14} />
                          <span className="hidden sm:inline">Sao chép</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleLoadDoc(doc)}
                        className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                        title={isViewingOther ? 'Tải về và mở' : 'Mở trong trình soạn thảo'}
                      >
                        <Download size={14} />
                        <span className="hidden sm:inline">{isViewingOther ? 'Tải về & Mở' : 'Mở'}</span>
                      </button>
                      {user?.role === 'admin' && doc.status !== 'approved' && (
                        <button
                          onClick={() => handleApproveDocument(doc)}
                          className="px-3 py-2 bg-green-50 hover:bg-green-100 text-green-600 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                          title="Duyệt"
                        >
                          <CheckCircle2 size={14} />
                          <span className="hidden sm:inline">Duyệt</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {activeProfileTab === 'activity' && (
          <div className="space-y-4">
            {isOwner && userDocs.length > 0 && (
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-zinc-100">
                  <h3 className="text-sm font-bold text-zinc-700">Lịch sử tải tài liệu</h3>
                  <p className="text-xs text-zinc-400 mt-1">Chỉ chủ sở hữu mới xem được lịch sử tải của từng tài liệu</p>
                </div>
                <div className="p-4 border-b border-zinc-100 flex flex-wrap gap-2">
                  {userDocs.map(doc => (
                    <button
                      key={doc.id}
                      onClick={() => setDownloadHistoryDocId(current => current === doc.id ? null : doc.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${downloadHistoryDocId === doc.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                    >
                      {doc.title}
                    </button>
                  ))}
                </div>
                <div className="divide-y divide-zinc-50">
                  {!downloadHistoryDocId ? (
                    <div className="p-6 text-sm text-zinc-400">Chọn một tài liệu để xem lịch sử tải</div>
                  ) : currentDownloadHistory.length === 0 ? (
                    <div className="p-6 text-sm text-zinc-400">Tài liệu này chưa có lượt tải nào</div>
                  ) : (
                    currentDownloadHistory.map(record => (
                      <div key={record.id} className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-zinc-50 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-zinc-700">{record.downloader.name || record.downloader.email}</p>
                          <p className="text-xs text-zinc-400">{record.downloader.email}</p>
                        </div>
                        <span className="text-xs text-zinc-400">{timeAgo(record.createdAt)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-zinc-100">
                <h3 className="text-sm font-bold text-zinc-700">Hoạt động gần đây</h3>
              </div>
              <div className="divide-y divide-zinc-50">
                {(() => {
                  const activityUserId = profileUser.id;
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

                  safePosts.forEach(p => {
                    p.comments.filter(c => c.authorId === activityUserId).forEach(c => {
                      activities.push({
                        type: 'comment',
                        text: `Đã bình luận: "${c.content.slice(0, 50)}${c.content.length > 50 ? '...' : ''}"`,
                        time: c.createdAt,
                        icon: MessageCircle,
                        color: 'green'
                      });
                    });
                    if (p.likes.includes(activityUserId)) {
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

                  activities.sort((a, b) => (parseAppDate(b.time)?.getTime() ?? 0) - (parseAppDate(a.time)?.getTime() ?? 0));

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
          </div>
        )}
      </div>

      <DocumentPreviewModal
        document={previewDoc}
        data={previewData}
        onClose={() => { setPreviewDoc(null); setPreviewData(null); }}
        onOpen={handleLoadDoc}
        openLabel={isViewingOther ? 'Tải về & Mở' : 'Mở phương án'}
        onExportPdf={exportPdf}
        onExportWord={exportWord}
        onClone={isViewingOther ? handleCloneDoc : undefined}
        detailMode="detailed"
        showPersonnelTable
        showToolsSection
        showTags
      />
    </div>
    </div>
  );
};
