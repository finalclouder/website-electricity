import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from './useAuthStore';
import { api } from '../utils/api';

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
  email: string;
  avatar: string;
  bio: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
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
  type: 'follow' | 'friend_request' | 'friend_accept' | 'document_download' | 'post_like' | 'post_comment' | 'post_share' | 'comment_like';
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

  fetchPosts: () => Promise<void>;
  fetchDocuments: () => Promise<void>;
  fetchRelationship: (userId: string) => Promise<void>;
  fetchFollowers: (userId: string) => Promise<void>;
  fetchFollowing: (userId: string) => Promise<void>;
  fetchFriends: () => Promise<void>;
  fetchFriendRequests: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  fetchUnreadNotificationCount: () => Promise<void>;
  fetchDocumentDownloads: (documentId: string) => Promise<void>;

  addPost: (post: Omit<SocialPost, 'id' | 'likes' | 'comments' | 'shares' | 'sharedBy' | 'createdAt'>) => Promise<void>;
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

      fetchPosts: async () => {
        try {
          const posts = await api.get<SocialPost[]>('/posts');
          set({ posts, isLoaded: true });
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
        }
      },

      fetchFriends: async () => {
        try {
          const friends = await api.get<FriendConnection[]>('/social/friends');
          set({ friends: Array.isArray(friends) ? friends : [] });
        } catch (error) {
          console.error('Fetch friends error:', error);
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
          const posts = await api.post<SocialPost[]>('/posts', {
            content: post.content,
            images: post.images,
            attachmentName: post.attachmentName,
            category: post.category,
          });
          set({ posts });
        } catch (error) {
          console.error('Add post error:', error);
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

      resetSocialState: () => {
        set({
          posts: [],
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
      partialize: (state) => ({
        posts: state.posts,
        savedDocuments: state.savedDocuments,
      }),
    }
  )
);
