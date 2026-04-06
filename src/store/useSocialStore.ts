import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SocialPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: 'admin' | 'user';
  content: string;
  images: string[];
  attachmentName?: string;
  likes: string[]; // user IDs who liked
  comments: SocialComment[];
  shares: number;
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
  parentId?: string; // For reply threading
  editedAt?: string; // Track edits
}

export interface SavedDocument {
  id: string;
  title: string;
  description: string;
  authorId: string;
  authorName: string;
  dataSnapshot: string; // JSON stringified PATCTCData
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'completed' | 'approved';
  tags: string[];
}

interface SocialState {
  posts: SocialPost[];
  savedDocuments: SavedDocument[];

  // Social actions
  addPost: (post: Omit<SocialPost, 'id' | 'likes' | 'comments' | 'shares' | 'createdAt'>) => void;
  deletePost: (postId: string) => void;
  toggleLike: (postId: string, userId: string) => void;
  addComment: (postId: string, comment: Omit<SocialComment, 'id' | 'createdAt' | 'likes'>) => void;
  deleteComment: (postId: string, commentId: string) => void;
  editComment: (postId: string, commentId: string, newContent: string) => void;
  toggleCommentLike: (postId: string, commentId: string, userId: string) => void;
  sharePost: (postId: string) => void;

  // Document actions
  saveDocument: (doc: Omit<SavedDocument, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateDocument: (docId: string, updates: Partial<SavedDocument>) => void;
  deleteDocument: (docId: string) => void;
}

// Seed data
const SEED_POSTS: SocialPost[] = [
  {
    id: 'p1',
    authorId: '1',
    authorName: 'Nguyễn Tuấn Anh',
    authorAvatar: '',
    authorRole: 'admin',
    content: '🔧 Thông báo: Đã cập nhật mẫu phương án thi công mới cho tuyến 471 E7.33. Anh em kiểm tra và áp dụng từ ngày mai nhé!\n\nĐiểm thay đổi chính:\n- Bổ sung biện pháp an toàn cho khu vực có dây chéo\n- Cập nhật danh sách dụng cụ theo quy chuẩn mới\n- Thêm checklist kiểm tra trước khi thi công',
    images: [],
    likes: ['2'],
    comments: [
      {
        id: 'c1',
        authorId: '2',
        authorName: 'Chu Đình Dũng',
        authorAvatar: '',
        content: 'Em đã xem, rất chi tiết anh ạ. Em sẽ áp dụng cho PA tuần sau.',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        likes: ['1']
      }
    ],
    shares: 3,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    category: 'announcement'
  },
  {
    id: 'p2',
    authorId: '2',
    authorName: 'Chu Đình Dũng',
    authorAvatar: '',
    authorRole: 'user',
    content: '⚡ Chia sẻ kinh nghiệm: Khi thi công hotline tại khu vực giao thông đông, nhớ bố trí thêm 2 người canh gác hai đầu đường và sử dụng cọc rào + băng nilong phản quang.\n\nAn toàn là trên hết! 🛡️',
    images: [],
    likes: ['1'],
    comments: [],
    shares: 5,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    category: 'safety'
  },
  {
    id: 'p3',
    authorId: '1',
    authorName: 'Nguyễn Tuấn Anh',
    authorAvatar: '',
    authorRole: 'admin',
    content: '📋 Nhắc nhở: Tất cả phương án thi công phải được lưu trên hệ thống trước 17h thứ 6 hàng tuần để kịp duyệt vào đầu tuần sau.',
    images: [],
    likes: [],
    comments: [],
    shares: 0,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    category: 'announcement'
  }
];

export const useSocialStore = create<SocialState>()(
  persist(
    (set, get) => ({
      posts: SEED_POSTS,
      savedDocuments: [],

      addPost: (post) => set(state => ({
        posts: [{
          ...post,
          id: Date.now().toString(),
          likes: [],
          comments: [],
          shares: 0,
          createdAt: new Date().toISOString()
        }, ...state.posts]
      })),

      deletePost: (postId) => set(state => ({
        posts: state.posts.filter(p => p.id !== postId)
      })),

      toggleLike: (postId, userId) => set(state => ({
        posts: state.posts.map(p => {
          if (p.id !== postId) return p;
          const liked = p.likes.includes(userId);
          return {
            ...p,
            likes: liked ? p.likes.filter(id => id !== userId) : [...p.likes, userId]
          };
        })
      })),

      addComment: (postId, comment) => set(state => ({
        posts: state.posts.map(p => {
          if (p.id !== postId) return p;
          return {
            ...p,
            comments: [...p.comments, {
              ...comment,
              id: Date.now().toString(),
              createdAt: new Date().toISOString(),
              likes: []
            }]
          };
        })
      })),

      deleteComment: (postId, commentId) => set(state => ({
        posts: state.posts.map(p => {
          if (p.id !== postId) return p;
          // Also delete replies to this comment
          return { ...p, comments: p.comments.filter(c => c.id !== commentId && c.parentId !== commentId) };
        })
      })),

      editComment: (postId, commentId, newContent) => set(state => ({
        posts: state.posts.map(p => {
          if (p.id !== postId) return p;
          return {
            ...p,
            comments: p.comments.map(c => {
              if (c.id !== commentId) return c;
              return { ...c, content: newContent, editedAt: new Date().toISOString() };
            })
          };
        })
      })),

      toggleCommentLike: (postId, commentId, userId) => set(state => ({
        posts: state.posts.map(p => {
          if (p.id !== postId) return p;
          return {
            ...p,
            comments: p.comments.map(c => {
              if (c.id !== commentId) return c;
              const liked = c.likes.includes(userId);
              return { ...c, likes: liked ? c.likes.filter(id => id !== userId) : [...c.likes, userId] };
            })
          };
        })
      })),

      sharePost: (postId) => set(state => ({
        posts: state.posts.map(p => p.id === postId ? { ...p, shares: p.shares + 1 } : p)
      })),

      saveDocument: (doc) => set(state => ({
        savedDocuments: [{
          ...doc,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, ...state.savedDocuments]
      })),

      updateDocument: (docId, updates) => set(state => ({
        savedDocuments: state.savedDocuments.map(d =>
          d.id === docId ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
        )
      })),

      deleteDocument: (docId) => set(state => ({
        savedDocuments: state.savedDocuments.filter(d => d.id !== docId)
      }))
    }),
    {
      name: 'patctc-social'
    }
  )
);
