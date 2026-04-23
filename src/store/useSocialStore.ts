import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuthStore } from './useAuthStore';
import { api } from '../utils/api';
import { supabase } from '../utils/supabaseClient';

// ─── Realtime channel refs ────────────────────────────────────────────────────
// Stored outside Zustand state (not serialisable) so unsubscribe can reach it.
let _notificationChannel: RealtimeChannel | null = null;
let _postsChannel: RealtimeChannel | null = null;

// ─── Debounce helper ──────────────────────────────────────────────────────────
// Returns a function that delays invoking `fn` until `wait` ms have elapsed
// since the last call. Used so rapid realtime events (e.g. bulk likes) only
// trigger one fetchPosts() instead of one per event.
function debounce<T extends (...args: any[]) => void>(fn: T, wait: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; fn(...args); }, wait);
  }) as T;
}

// ─── Client-side notification message builder ─────────────────────────────────
// Mirrors the server-side buildNotificationMessage in database.ts.
// The raw postgres_changes payload is snake_case.
function buildNotificationMessage(row: Record<string, any>): string {
  const actorName = row.data_json?.actor_name ?? 'Ai đó';
  switch (row.type as AppNotification['type']) {
    case 'follow':              return `${actorName} đã bắt đầu theo dõi bạn`;
    case 'friend_request':      return `${actorName} đã gửi lời mời kết bạn`;
    case 'friend_accept':       return `${actorName} đã chấp nhận lời mời kết bạn của bạn`;
    case 'document_download':   return `${actorName} đã tải tài liệu của bạn`;
    case 'post_like':           return `${actorName} đã thích bài viết của bạn`;
    case 'post_comment':        return `${actorName} đã bình luận về bài viết của bạn`;
    case 'post_share':          return `${actorName} đã chia sẻ bài viết của bạn`;
    case 'comment_like':        return `${actorName} đã thích bình luận của bạn`;
    default:                    return 'Bạn có thông báo mới';
  }
}

export interface SocialPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: 'admin' | 'user';
  content: string;
  images: string[];
  attachmentName?: string;
  likes: string[];
  comments: SocialComment[];
  shares: number;
  sharedBy: string[];
  createdAt: string;
  category: 'general' | 'technical' | 'safety' | 'announcement';
}

export interface SocialComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
  likes: string[];
  parentId?: string;
  editedAt?: string;
}

export interface SavedDocument {
  id: string;
  title: string;
  description: string;
  authorId: string;
  authorName: string;
  dataSnapshot: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'completed' | 'approved';
  tags: string[];
  downloadCount?: number;
}

export interface FollowUserSummary {
  id: string;
  name: string;
  // email, role, status are intentionally omitted — backend strips these
  // from social contexts to prevent privacy leaks (only auth endpoints
  // expose them to owners/admins).
  avatar: string;
  bio: string;
  createdAt?: string;
}

export interface RelationshipSummary {
  targetUserId: string;
  isFollowing: boolean;
  isFollowedBy: boolean;
  followerCount: number;
  followingCount: number;
  friendStatus: 'none' | 'incoming_request' | 'outgoing_request' | 'friends';
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  sender: FollowUserSummary;
  receiver: FollowUserSummary;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface FriendConnection {
  requestId: string;
  userId: string;
  user: FollowUserSummary;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  actorId: string | null;
  actor: FollowUserSummary | null;
  type: 'follow' | 'friend_request' | 'friend_accept' | 'document_download' | 'post_like' | 'post_comment' | 'post_share' | 'comment_like' | 'admin_post';
  entityType: 'user' | 'friend_request' | 'document' | 'post' | 'comment';
  entityId: string;
  dataJson: Record<string, any>;
  isRead: boolean;
  createdAt: string;
  message: string;
}

export interface DocumentDownloadRecord {
  id: string;
  documentId: string;
  downloaderId: string;
  ownerId: string;
  downloader: FollowUserSummary;
  owner: FollowUserSummary;
  createdAt: string;
}

interface SocialState {
  posts: SocialPost[];
  postsPage: number;
  postsHasNextPage: boolean;
  savedDocuments: SavedDocument[];
  isLoaded: boolean;
  relationshipsByUserId: Record<string, RelationshipSummary>;
  followersByUserId: Record<string, FollowUserSummary[]>;
  followingByUserId: Record<string, FollowUserSummary[]>;
  incomingFriendRequests: FriendRequest[];
  outgoingFriendRequests: FriendRequest[];
  friends: FriendConnection[];
  notifications: AppNotification[];
  unreadNotificationCount: number;
  documentDownloadsByDocumentId: Record<string, DocumentDownloadRecord[]>;

  fetchPosts: (page?: number) => Promise<void>;
  fetchDocuments: () => Promise<void>;
  fetchRelationship: (userId: string) => Promise<void>;
  fetchFollowers: (userId: string) => Promise<void>;
  fetchFollowing: (userId: string) => Promise<void>;
  fetchFriends: () => Promise<void>;
  fetchFriendRequests: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  fetchUnreadNotificationCount: () => Promise<void>;
  fetchDocumentDownloads: (documentId: string) => Promise<void>;

  addPost: (post: Omit<SocialPost, 'id' | 'likes' | 'comments' | 'shares' | 'sharedBy' | 'createdAt'> & { mediaFiles?: File[] }) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  toggleLike: (postId: string, userId: string) => Promise<void>;
  addComment: (postId: string, comment: Omit<SocialComment, 'id' | 'createdAt' | 'likes'>) => Promise<void>;
  deleteComment: (postId: string, commentId: string) => Promise<void>;
  editComment: (postId: string, commentId: string, newContent: string) => Promise<void>;
  toggleCommentLike: (postId: string, commentId: string, userId: string) => Promise<void>;
  sharePost: (postId: string, userId: string) => Promise<void>;
  followUser: (targetUserId: string) => Promise<{ ok: boolean; error?: string }>;
  unfollowUser: (targetUserId: string) => Promise<{ ok: boolean; error?: string }>;
  sendFriendRequest: (targetUserId: string) => Promise<{ ok: boolean; error?: string }>;
  acceptFriendRequest: (requestId: string) => Promise<{ ok: boolean; error?: string }>;
  rejectFriendRequest: (requestId: string) => Promise<{ ok: boolean; error?: string }>;
  cancelFriendRequest: (requestId: string) => Promise<{ ok: boolean; error?: string }>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  subscribeToNotifications: (userId: string) => void;
  unsubscribeFromNotifications: () => void;
  subscribeToPosts: () => void;
  unsubscribeFromPosts: () => void;
  resetSocialState: () => void;

  saveDocument: (doc: Omit<SavedDocument, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateDocument: (docId: string, updates: Partial<SavedDocument>) => Promise<void>;
  updateDocumentStatus: (docId: string, status: SavedDocument['status']) => Promise<{ ok: boolean; error?: string }>;
  deleteDocument: (docId: string) => Promise<void>;
  trackDocumentDownload: (documentId: string) => Promise<void>;
}

export const useSocialStore = create<SocialState>()(
  persist(
    (set, get) => ({
      posts: [],
      postsPage: 1,
      postsHasNextPage: false,
      savedDocuments: [],
      isLoaded: false,
      relationshipsByUserId: {},
      followersByUserId: {},
      followingByUserId: {},
      incomingFriendRequests: [],
      outgoingFriendRequests: [],
      friends: [],
      notifications: [],
      unreadNotificationCount: 0,
      documentDownloadsByDocumentId: {},

      fetchPosts: async (page = 1) => {
        try {
          const result = await api.get<{ data: SocialPost[]; total: number; hasNextPage: boolean }>(`/posts?page=${page}&limit=20`);
          set(state => ({
            posts: page === 1 ? result.data : [...state.posts, ...result.data],
            postsPage: page,
            postsHasNextPage: result.hasNextPage,
            isLoaded: true,
          }));
        } catch (error) {
          console.error('Fetch posts error:', error);
        }
      },

      fetchDocuments: async () => {
        try {
          const docs = await api.get<SavedDocument[]>('/documents/my');
          set({ savedDocuments: Array.isArray(docs) ? docs : [] });
        } catch (error) {
          console.error('Fetch documents error:', error);
        }
      },

      fetchRelationship: async (userId) => {
        try {
          const relationship = await api.get<RelationshipSummary>(`/social/relationships/${userId}`);
          set(state => ({
            relationshipsByUserId: {
              ...state.relationshipsByUserId,
              [userId]: relationship,
            },
          }));
        } catch (error) {
          console.error('Fetch relationship error:', error);
          throw error;
        }
      },

      fetchFollowers: async (userId) => {
        try {
          const followers = await api.get<FollowUserSummary[]>(`/social/users/${userId}/followers`);
          set(state => ({
            followersByUserId: {
              ...state.followersByUserId,
              [userId]: Array.isArray(followers) ? followers : [],
            },
          }));
        } catch (error) {
          console.error('Fetch followers error:', error);
          throw error;
        }
      },

      fetchFollowing: async (userId) => {
        try {
          const following = await api.get<FollowUserSummary[]>(`/social/users/${userId}/following`);
          set(state => ({
            followingByUserId: {
              ...state.followingByUserId,
              [userId]: Array.isArray(following) ? following : [],
            },
          }));
        } catch (error) {
          console.error('Fetch following error:', error);
          throw error;
        }
      },

      fetchFriends: async () => {
        try {
          const friends = await api.get<FriendConnection[]>('/social/friends');
          set({ friends: Array.isArray(friends) ? friends : [] });
        } catch (error) {
          console.error('Fetch friends error:', error);
          throw error;
        }
      },

      fetchFriendRequests: async () => {
        try {
          const result = await api.get<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>('/social/friend-requests');
          set({
            incomingFriendRequests: Array.isArray(result?.incoming) ? result.incoming : [],
            outgoingFriendRequests: Array.isArray(result?.outgoing) ? result.outgoing : [],
          });
        } catch (error) {
          console.error('Fetch friend requests error:', error);
        }
      },

      fetchNotifications: async () => {
        try {
          const notifications = await api.get<AppNotification[]>('/social/notifications');
          set({ notifications: Array.isArray(notifications) ? notifications : [] });
        } catch (error) {
          console.error('Fetch notifications error:', error);
        }
      },

      fetchUnreadNotificationCount: async () => {
        try {
          const result = await api.get<{ count: number }>('/social/notifications/unread-count');
          set({ unreadNotificationCount: result.count });
        } catch (error) {
          console.error('Fetch unread notification count error:', error);
        }
      },

      fetchDocumentDownloads: async (documentId) => {
        try {
          const downloads = await api.get<DocumentDownloadRecord[]>(`/documents/${documentId}/downloads`);
          set(state => ({
            documentDownloadsByDocumentId: {
              ...state.documentDownloadsByDocumentId,
              [documentId]: Array.isArray(downloads) ? downloads : [],
            },
          }));
        } catch (error) {
          console.error('Fetch document downloads error:', error);
        }
      },

      addPost: async (post) => {
        try {
          const mediaFiles = post.mediaFiles ?? [];

          if (mediaFiles.length > 0) {
            // ── R2 presigned upload flow ─────────────────────────────────────
            // 1. Request presigned URLs from server
            const presignRes = await api.post<{
              uploads: { uploadUrl: string; publicUrl: string; key: string }[];
            }>('/posts/presign', {
              files: mediaFiles.map(f => ({
                contentType: f.type,
                fileSize: f.size,
                fileName: f.name,
              })),
            });

            // 2. Upload each file directly to R2 via presigned PUT URL
            const mediaUrls: string[] = [];
            for (let i = 0; i < mediaFiles.length; i++) {
              const file = mediaFiles[i];
              const { uploadUrl, publicUrl } = presignRes.uploads[i];

              const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type },
                body: file,
              });

              if (!uploadRes.ok) {
                throw new Error(`Upload file "${file.name}" thất bại (${uploadRes.status})`);
              }

              mediaUrls.push(publicUrl);
            }

            // 3. Create post with R2 media URLs (JSON body, no multipart)
            const posts = await api.post<{ data: SocialPost[]; total: number; hasNextPage: boolean }>('/posts', {
              content: post.content,
              category: post.category,
              attachmentName: post.attachmentName || '',
              mediaUrls,
            });
            set({ posts: posts.data, postsPage: 1, postsHasNextPage: posts.hasNextPage });
          } else {
            // ── Text-only post — simple JSON ─────────────────────────────────
            const posts = await api.post<{ data: SocialPost[]; total: number; hasNextPage: boolean }>('/posts', {
              content: post.content,
              category: post.category,
              attachmentName: post.attachmentName || '',
            });
            set({ posts: posts.data, postsPage: 1, postsHasNextPage: posts.hasNextPage });
          }
        } catch (error) {
          console.error('Add post error:', error);
          throw error; // re-throw so the caller can show error feedback
        }
      },

      deletePost: async (postId) => {
        try {
          await api.delete(`/posts/${postId}`);
          set(state => ({ posts: state.posts.filter(p => p.id !== postId) }));
        } catch (error) {
          console.error('Delete post error:', error);
        }
      },

      toggleLike: async (postId, userId) => {
        set(state => ({
          posts: state.posts.map(p => {
            if (p.id !== postId) return p;
            const liked = p.likes.includes(userId);
            return { ...p, likes: liked ? p.likes.filter(id => id !== userId) : [...p.likes, userId] };
          }),
        }));
        try {
          await api.post(`/posts/${postId}/like`);
        } catch {
          get().fetchPosts();
        }
      },

      addComment: async (postId, comment) => {
        try {
          await api.post(`/posts/${postId}/comments`, {
            content: comment.content,
            parentId: comment.parentId,
          });
          get().fetchPosts();
        } catch (error) {
          console.error('Add comment error:', error);
        }
      },

      deleteComment: async (postId, commentId) => {
        try {
          await api.delete(`/posts/${postId}/comments/${commentId}`);
          set(state => ({
            posts: state.posts.map(p => {
              if (p.id !== postId) return p;
              return { ...p, comments: p.comments.filter(c => c.id !== commentId && c.parentId !== commentId) };
            }),
          }));
        } catch (error) {
          console.error('Delete comment error:', error);
        }
      },

      editComment: async (postId, commentId, newContent) => {
        try {
          await api.put(`/posts/${postId}/comments/${commentId}`, { content: newContent });
          set(state => ({
            posts: state.posts.map(p => {
              if (p.id !== postId) return p;
              return {
                ...p,
                comments: p.comments.map(c => c.id === commentId ? { ...c, content: newContent, editedAt: new Date().toISOString() } : c),
              };
            }),
          }));
        } catch (error) {
          console.error('Edit comment error:', error);
        }
      },

      toggleCommentLike: async (postId, commentId, userId) => {
        set(state => ({
          posts: state.posts.map(p => {
            if (p.id !== postId) return p;
            return {
              ...p,
              comments: p.comments.map(c => {
                if (c.id !== commentId) return c;
                const liked = c.likes.includes(userId);
                return { ...c, likes: liked ? c.likes.filter(id => id !== userId) : [...c.likes, userId] };
              }),
            };
          }),
        }));
        try {
          await api.post(`/posts/${postId}/comments/${commentId}/like`);
        } catch {
          get().fetchPosts();
        }
      },

      sharePost: async (postId, userId) => {
        set(state => ({
          posts: state.posts.map(p => {
            if (p.id !== postId) return p;
            const alreadyShared = (p.sharedBy || []).includes(userId);
            return {
              ...p,
              shares: alreadyShared ? p.shares : p.shares + 1,
              sharedBy: alreadyShared ? p.sharedBy : [...(p.sharedBy || []), userId],
            };
          }),
        }));
        try {
          await api.post(`/posts/${postId}/share`);
        } catch {
          get().fetchPosts();
        }
      },

      followUser: async (targetUserId) => {
        try {
          const currentUserId = useAuthStore.getState().user?.id;
          const result = await api.post<{ message: string; relationship: RelationshipSummary }>(`/social/users/${targetUserId}/follow`);
          set(state => ({
            relationshipsByUserId: {
              ...state.relationshipsByUserId,
              [targetUserId]: result.relationship,
            },
          }));
          await Promise.all([
            get().fetchFollowers(targetUserId),
            currentUserId ? get().fetchFollowing(currentUserId) : Promise.resolve(),
          ]);
          return { ok: true };
        } catch (error: any) {
          console.error('Follow user error:', error);
          return { ok: false, error: error?.message || 'Không thể theo dõi người dùng' };
        }
      },

      unfollowUser: async (targetUserId) => {
        try {
          const currentUserId = useAuthStore.getState().user?.id;
          const result = await api.delete<{ message: string; relationship: RelationshipSummary }>(`/social/users/${targetUserId}/follow`);
          set(state => ({
            relationshipsByUserId: {
              ...state.relationshipsByUserId,
              [targetUserId]: result.relationship,
            },
          }));
          await Promise.all([
            get().fetchFollowers(targetUserId),
            currentUserId ? get().fetchFollowing(currentUserId) : Promise.resolve(),
          ]);
          return { ok: true };
        } catch (error: any) {
          console.error('Unfollow user error:', error);
          return { ok: false, error: error?.message || 'Không thể bỏ theo dõi người dùng' };
        }
      },

      sendFriendRequest: async (targetUserId) => {
        try {
          const result = await api.post<{ message: string; incoming: FriendRequest[]; outgoing: FriendRequest[] }>(`/social/friend-requests/${targetUserId}`);
          set({
            incomingFriendRequests: result.incoming,
            outgoingFriendRequests: result.outgoing,
          });
          await get().fetchRelationship(targetUserId);
          return { ok: true };
        } catch (error: any) {
          console.error('Send friend request error:', error);
          return { ok: false, error: error?.message || 'Không thể gửi lời mời kết bạn' };
        }
      },

      acceptFriendRequest: async (requestId) => {
        const existingRequest = get().incomingFriendRequests.find(request => request.id === requestId);
        try {
          const result = await api.post<{ message: string; incoming: FriendRequest[]; outgoing: FriendRequest[]; friends: FriendConnection[] }>(`/social/friend-requests/${requestId}/accept`);
          set({
            incomingFriendRequests: result.incoming,
            outgoingFriendRequests: result.outgoing,
            friends: result.friends,
          });
          if (existingRequest) {
            await get().fetchRelationship(existingRequest.senderId);
          }
          return { ok: true };
        } catch (error: any) {
          console.error('Accept friend request error:', error);
          return { ok: false, error: error?.message || 'Không thể chấp nhận lời mời kết bạn' };
        }
      },

      rejectFriendRequest: async (requestId) => {
        const existingRequest = get().incomingFriendRequests.find(request => request.id === requestId);
        try {
          const result = await api.post<{ message: string; incoming: FriendRequest[]; outgoing: FriendRequest[] }>(`/social/friend-requests/${requestId}/reject`);
          set({
            incomingFriendRequests: result.incoming,
            outgoingFriendRequests: result.outgoing,
          });
          if (existingRequest) {
            await get().fetchRelationship(existingRequest.senderId);
          }
          return { ok: true };
        } catch (error: any) {
          console.error('Reject friend request error:', error);
          return { ok: false, error: error?.message || 'Không thể từ chối lời mời kết bạn' };
        }
      },

      cancelFriendRequest: async (requestId) => {
        const existingRequest = get().outgoingFriendRequests.find(request => request.id === requestId);
        try {
          const result = await api.delete<{ message: string; incoming: FriendRequest[]; outgoing: FriendRequest[] }>(`/social/friend-requests/${requestId}`);
          set({
            incomingFriendRequests: result.incoming,
            outgoingFriendRequests: result.outgoing,
          });
          if (existingRequest) {
            await get().fetchRelationship(existingRequest.receiverId);
          }
          return { ok: true };
        } catch (error: any) {
          console.error('Cancel friend request error:', error);
          return { ok: false, error: error?.message || 'Không thể hủy lời mời kết bạn' };
        }
      },

      markNotificationRead: async (notificationId) => {
        try {
          const result = await api.post<{ message: string; count: number }>(`/social/notifications/${notificationId}/read`);
          set(state => ({
            notifications: state.notifications.map(notification =>
              notification.id === notificationId ? { ...notification, isRead: true } : notification
            ),
            unreadNotificationCount: result.count,
          }));
        } catch (error) {
          console.error('Mark notification read error:', error);
        }
      },

      markAllNotificationsRead: async () => {
        try {
          await api.post<{ message: string; count: number }>('/social/notifications/read-all');
          set(state => ({
            notifications: state.notifications.map(notification => ({ ...notification, isRead: true })),
            unreadNotificationCount: 0,
          }));
        } catch (error) {
          console.error('Mark all notifications read error:', error);
        }
      },

      subscribeToNotifications: (userId) => {
        // Tear down any previous channel before opening a new one
        if (_notificationChannel) {
          supabase.removeChannel(_notificationChannel);
          _notificationChannel = null;
        }

        _notificationChannel = supabase
          .channel(`notifications:${userId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              const row = payload.new as Record<string, any>;

              // Build the AppNotification shape from the raw DB row
              const notification: AppNotification = {
                id: row.id,
                userId: row.user_id,
                actorId: row.actor_id ?? null,
                actor: null, // actor enrichment not available in realtime payload
                type: row.type,
                entityType: row.entity_type,
                entityId: row.entity_id,
                dataJson: row.data_json ?? {},
                isRead: false,
                createdAt: row.created_at,
                message: buildNotificationMessage(row),
              };

              // Prepend to notifications list and bump unread count
              set((state) => ({
                notifications: [notification, ...state.notifications],
                unreadNotificationCount: state.unreadNotificationCount + 1,
              }));

              // Show a toast
              toast(notification.message, {
                duration: 4000,
              });
            }
          )
          .subscribe((status) => {
            if (status === 'CHANNEL_ERROR') {
              console.error('[Realtime] Notification channel error — will retry on next login');
            }
          });
      },

      unsubscribeFromNotifications: () => {
        if (_notificationChannel) {
          supabase.removeChannel(_notificationChannel);
          _notificationChannel = null;
        }
      },

      subscribeToPosts: () => {
        if (_postsChannel) {
          supabase.removeChannel(_postsChannel);
          _postsChannel = null;
        }

        // Debounced refetch — collapses rapid bursts (e.g. multiple likes at once)
        // into a single API call 400 ms after the last event.
        const debouncedFetch = debounce(() => {
          useSocialStore.getState().fetchPosts(1);
        }, 400);

        _postsChannel = supabase
          .channel('social-feed')
          // Any post inserted, updated, or deleted
          .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, debouncedFetch)
          // Any comment added, edited, or deleted
          .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, debouncedFetch)
          // Any like toggled (post or comment)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, debouncedFetch)
          // Any share recorded
          .on('postgres_changes', { event: '*', schema: 'public', table: 'shares' }, debouncedFetch)
          .subscribe((status) => {
            if (status === 'CHANNEL_ERROR') {
              console.error('[Realtime] Posts channel error');
            }
          });
      },

      unsubscribeFromPosts: () => {
        if (_postsChannel) {
          supabase.removeChannel(_postsChannel);
          _postsChannel = null;
        }
      },

      resetSocialState: () => {
        set({
          posts: [],
          postsPage: 1,
          postsHasNextPage: false,
          savedDocuments: [],
          isLoaded: false,
          relationshipsByUserId: {},
          followersByUserId: {},
          followingByUserId: {},
          incomingFriendRequests: [],
          outgoingFriendRequests: [],
          friends: [],
          notifications: [],
          unreadNotificationCount: 0,
          documentDownloadsByDocumentId: {},
        });
      },

      saveDocument: async (doc) => {
        try {
          const result = await api.post<{ id: string }>('/documents', {
            title: doc.title,
            description: doc.description,
            dataSnapshot: doc.dataSnapshot,
            status: doc.status,
            tags: doc.tags,
          });
          set(state => ({
            savedDocuments: [{
              ...doc,
              id: result.id,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              downloadCount: 0,
            }, ...state.savedDocuments],
          }));
        } catch (error) {
          console.error('Save document error:', error);
        }
      },

      updateDocument: async (docId, updates) => {
        try {
          await api.put(`/documents/${docId}`, updates);
          set(state => ({
            savedDocuments: state.savedDocuments.map(d =>
              d.id === docId ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
            ),
          }));
        } catch (error) {
          console.error('Update document error:', error);
        }
      },

      updateDocumentStatus: async (docId, status) => {
        try {
          await api.put(`/documents/${docId}`, { status });
          set(state => ({
            savedDocuments: state.savedDocuments.map(d =>
              d.id === docId ? { ...d, status, updatedAt: new Date().toISOString() } : d
            ),
          }));
          return { ok: true };
        } catch (error: any) {
          console.error('Update document status error:', error);
          return { ok: false, error: error?.message || 'Không thể cập nhật trạng thái tài liệu' };
        }
      },

      deleteDocument: async (docId) => {
        try {
          await api.delete(`/documents/${docId}`);
          set(state => ({
            savedDocuments: state.savedDocuments.filter(d => d.id !== docId),
          }));
        } catch (error) {
          console.error('Delete document error:', error);
        }
      },

      trackDocumentDownload: async (documentId) => {
        try {
          await api.post(`/documents/${documentId}/download`);
          await get().fetchDocuments();
        } catch (error) {
          console.error('Track document download error:', error);
        }
      },
    }),
    {
      name: 'patctc-social',
      // Do NOT persist posts or savedDocuments — they contain sensitive server
      // data (including full dataSnapshot payloads) that must not survive
      // across sessions. All data is re-fetched fresh on login.
      partialize: () => ({}),
    }
  )
);
