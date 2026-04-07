import React, { useState, useRef } from 'react';
import { Heart, MessageCircle, Share2, Send, MoreHorizontal, Trash2, Shield, AlertTriangle, Megaphone, Lightbulb, Clock, Image, Video, X, Play, Reply, Pencil, Check } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useSocialStore, SocialPost } from '../store/useSocialStore';

const CATEGORIES = [
  { value: 'general', label: 'Chung', icon: Lightbulb, color: 'blue' },
  { value: 'technical', label: 'Kỹ thuật', icon: Shield, color: 'green' },
  { value: 'safety', label: 'An toàn', icon: AlertTriangle, color: 'amber' },
  { value: 'announcement', label: 'Thông báo', icon: Megaphone, color: 'purple' },
] as const;

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

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();
}

function isVideoUrl(url: string): boolean {
  return url.startsWith('data:video/') || /\.(mp4|webm|ogg|mov)$/i.test(url);
}

// ============ Media Gallery Component ============
const MediaGallery: React.FC<{ media: string[] }> = ({ media }) => {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (media.length === 0) return null;

  const gridClass = media.length === 1
    ? 'grid-cols-1'
    : media.length === 2
      ? 'grid-cols-2'
      : media.length === 3
        ? 'grid-cols-2'
        : 'grid-cols-2';

  return (
    <>
      <div className={`grid ${gridClass} gap-1 px-4 pb-2`}>
        {media.map((src, idx) => {
          const isVideo = isVideoUrl(src);

          if (media.length === 3 && idx === 0) {
            // First image takes full first column for 3 media
            return (
              <div key={idx} className="row-span-2 relative cursor-pointer rounded-xl overflow-hidden bg-zinc-100" onClick={() => setLightbox(src)}>
                {isVideo ? (
                  <div className="relative w-full h-full min-h-[240px]">
                    <video src={src} className="w-full h-full object-cover" muted />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                        <Play size={20} className="text-zinc-700 ml-0.5" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <img src={src} alt="" className="w-full h-full object-cover min-h-[240px]" />
                )}
              </div>
            );
          }

          return (
            <div key={idx} className="relative cursor-pointer rounded-xl overflow-hidden bg-zinc-100 aspect-square" onClick={() => setLightbox(src)}>
              {isVideo ? (
                <div className="relative w-full h-full">
                  <video src={src} className="w-full h-full object-cover" muted />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center">
                      <Play size={16} className="text-zinc-700 ml-0.5" />
                    </div>
                  </div>
                </div>
              ) : (
                <img src={src} alt="" className="w-full h-full object-cover" />
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors" onClick={() => setLightbox(null)}>
            <X size={24} className="text-white" />
          </button>
          <div className="max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {isVideoUrl(lightbox) ? (
              <video src={lightbox} controls autoPlay className="max-w-full max-h-[85vh] rounded-lg" />
            ) : (
              <img src={lightbox} alt="" className="max-w-full max-h-[85vh] object-contain rounded-lg" />
            )}
          </div>
        </div>
      )}
    </>
  );
};

// ============ Post Card ============
const PostCard: React.FC<{ post: SocialPost; onViewProfile?: (userId: string) => void }> = ({ post, onViewProfile }) => {
  const { user, getAllUsers } = useAuthStore();
  const { toggleLike, addComment, deletePost, deleteComment, editComment, sharePost, toggleCommentLike } = useSocialStore();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const commentInputRef = useRef<HTMLInputElement>(null);
  const [showLikesPopup, setShowLikesPopup] = useState(false);
  const [showSharesPopup, setShowSharesPopup] = useState(false);

  const allUsers = getAllUsers();

  const isLiked = user ? post.likes.includes(user.id) : false;
  const catInfo = CATEGORIES.find(c => c.value === post.category) || CATEGORIES[0];
  const CatIcon = catInfo.icon;

  const handleComment = () => {
    if (!commentText.trim() || !user) return;
    addComment(post.id, {
      authorId: user.id,
      authorName: user.name,
      authorAvatar: user.avatar,
      content: commentText.trim(),
      parentId: replyTo?.id
    });
    setCommentText('');
    setReplyTo(null);
  };

  const handleReply = (commentId: string, authorName: string) => {
    setReplyTo({ id: commentId, name: authorName });
    setEditingComment(null);
    setTimeout(() => commentInputRef.current?.focus(), 50);
  };

  const handleStartEdit = (commentId: string, currentContent: string) => {
    setEditingComment(commentId);
    setEditText(currentContent);
    setReplyTo(null);
  };

  const handleSaveEdit = (commentId: string) => {
    if (!editText.trim()) return;
    editComment(post.id, commentId, editText.trim());
    setEditingComment(null);
    setEditText('');
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setEditText('');
  };

  const handleShare = () => {
    if (!user) return;
    sharePost(post.id, user.id);
    navigator.clipboard?.writeText(`Bài viết từ ${post.authorName}: ${post.content.slice(0, 100)}...`);
  };

  // Resolve user names from IDs
  const resolveUserName = (userId: string) => {
    const u = allUsers.find(u => u.id === userId);
    return u?.name || 'Người dùng';
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onViewProfile?.(post.authorId)}
              className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm hover:ring-2 hover:ring-blue-300 transition-all overflow-hidden flex-shrink-0"
            >
              {post.authorAvatar ? (
                <img src={post.authorAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                getInitials(post.authorName)
              )}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onViewProfile?.(post.authorId)}
                  className="font-semibold text-sm text-zinc-900 hover:text-blue-600 hover:underline transition-colors"
                >
                  {post.authorName}
                </button>
                {post.authorRole === 'admin' && (
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold uppercase rounded">Admin</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Clock size={11} />
                <span>{timeAgo(post.createdAt)}</span>
                <span>•</span>
                <span className={`flex items-center gap-1 text-${catInfo.color}-600`}>
                  <CatIcon size={11} />
                  {catInfo.label}
                </span>
              </div>
            </div>
          </div>

          {user && (user.id === post.authorId || user.role === 'admin') && (
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors">
                <MoreHorizontal size={16} className="text-zinc-400" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-[5]" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-8 bg-white border border-zinc-200 rounded-xl shadow-lg py-1 z-10 min-w-32">
                    <button
                      onClick={() => { deletePost(post.id); setShowMenu(false); }}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 size={14} /> Xóa bài
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">{post.content}</p>
      </div>

      {/* Media Gallery */}
      <MediaGallery media={post.images} />

      {/* Stats */}
      <div className="px-4 pb-2 flex items-center justify-between text-xs text-zinc-400">
        <div className="relative">
          {post.likes.length > 0 ? (
            <button
              onClick={() => { setShowLikesPopup(!showLikesPopup); setShowSharesPopup(false); }}
              className="hover:text-blue-500 hover:underline transition-colors flex items-center gap-1"
            >
              <Heart size={12} fill="currentColor" className="text-red-400" />
              {post.likes.length} lượt thích
            </button>
          ) : <span />}

          {/* Likes popup */}
          {showLikesPopup && post.likes.length > 0 && (
            <>
              <div className="fixed inset-0 z-[5]" onClick={() => setShowLikesPopup(false)} />
              <div className="absolute left-0 bottom-6 bg-white border border-zinc-200 rounded-xl shadow-xl py-2 z-10 min-w-48 max-h-60 overflow-y-auto">
                <div className="px-3 pb-1.5 mb-1 border-b border-zinc-100 text-[11px] font-bold text-zinc-500 uppercase">
                  Đã thích ({post.likes.length})
                </div>
                {post.likes.map(uid => {
                  const u = allUsers.find(u => u.id === uid);
                  return (
                    <button
                      key={uid}
                      onClick={() => { onViewProfile?.(uid); setShowLikesPopup(false); }}
                      className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-zinc-50 transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                        {u?.avatar ? (
                          <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-[9px] font-bold">
                            {getInitials(u?.name || '?')}
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-medium text-zinc-700">{u?.name || 'Người dùng'}</span>
                      {u?.role === 'admin' && <span className="px-1 py-0.5 bg-blue-100 text-blue-600 text-[8px] font-bold rounded">ADMIN</span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3">
          {post.comments.length > 0 && <span>{post.comments.length} bình luận</span>}

          <div className="relative">
            {post.shares > 0 ? (
              <button
                onClick={() => { setShowSharesPopup(!showSharesPopup); setShowLikesPopup(false); }}
                className="hover:text-blue-500 hover:underline transition-colors"
              >
                {post.shares} chia sẻ
              </button>
            ) : null}

            {/* Shares popup */}
            {showSharesPopup && (post.sharedBy || []).length > 0 && (
              <>
                <div className="fixed inset-0 z-[5]" onClick={() => setShowSharesPopup(false)} />
                <div className="absolute right-0 bottom-6 bg-white border border-zinc-200 rounded-xl shadow-xl py-2 z-10 min-w-48 max-h-60 overflow-y-auto">
                  <div className="px-3 pb-1.5 mb-1 border-b border-zinc-100 text-[11px] font-bold text-zinc-500 uppercase">
                    Đã chia sẻ ({(post.sharedBy || []).length})
                  </div>
                  {(post.sharedBy || []).map(uid => {
                    const u = allUsers.find(u => u.id === uid);
                    return (
                      <button
                        key={uid}
                        onClick={() => { onViewProfile?.(uid); setShowSharesPopup(false); }}
                        className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-zinc-50 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                          {u?.avatar ? (
                            <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-[9px] font-bold">
                              {getInitials(u?.name || '?')}
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-medium text-zinc-700">{u?.name || 'Người dùng'}</span>
                        {u?.role === 'admin' && <span className="px-1 py-0.5 bg-blue-100 text-blue-600 text-[8px] font-bold rounded">ADMIN</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-zinc-100 px-2 py-1 flex">
        <button
          onClick={() => user && toggleLike(post.id, user.id)}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all ${
            isLiked ? 'text-red-500 bg-red-50' : 'text-zinc-500 hover:bg-zinc-50'
          }`}
        >
          <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} /> Thích
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium text-zinc-500 hover:bg-zinc-50 transition-all"
        >
          <MessageCircle size={16} /> Bình luận
        </button>
        <button
          onClick={handleShare}
          className="flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium text-zinc-500 hover:bg-zinc-50 transition-all"
        >
          <Share2 size={16} /> Chia sẻ
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-zinc-100 bg-zinc-50/50">
          <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
            {/* Top-level comments */}
            {post.comments.filter(c => !c.parentId).map(comment => (
              <div key={comment.id}>
                {/* Comment */}
                <div className="flex gap-2.5 group">
                  <div className="w-8 h-8 bg-gradient-to-br from-zinc-400 to-zinc-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                    {getInitials(comment.authorName)}
                  </div>
                  <div className="flex-1">
                    {editingComment === comment.id ? (
                      /* Edit mode */
                      <div className="bg-white rounded-xl px-3 py-2 border-2 border-blue-400">
                        <span className="text-xs font-semibold text-zinc-900">{comment.authorName}</span>
                        <input
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveEdit(comment.id);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="w-full text-sm text-zinc-600 mt-1 bg-transparent outline-none"
                          autoFocus
                        />
                        <div className="flex gap-2 mt-1.5">
                          <button onClick={() => handleSaveEdit(comment.id)} className="text-[11px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                            <Check size={11} /> Lưu
                          </button>
                          <button onClick={handleCancelEdit} className="text-[11px] font-medium text-zinc-400 hover:text-zinc-600">
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display mode */
                      <div className="bg-white rounded-xl px-3 py-2 border border-zinc-100">
                        <span className="text-xs font-semibold text-zinc-900">{comment.authorName}</span>
                        <p className="text-sm text-zinc-600">{comment.content}</p>
                        {comment.editedAt && <span className="text-[10px] text-zinc-300 italic">đã chỉnh sửa</span>}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1 px-1">
                      <button
                        onClick={() => user && toggleCommentLike(post.id, comment.id, user.id)}
                        className={`text-[11px] font-medium ${comment.likes.includes(user?.id || '') ? 'text-red-500' : 'text-zinc-400 hover:text-zinc-600'}`}
                      >
                        Thích {comment.likes.length > 0 && `(${comment.likes.length})`}
                      </button>
                      <button
                        onClick={() => handleReply(comment.id, comment.authorName)}
                        className="text-[11px] font-medium text-zinc-400 hover:text-blue-600 transition-colors"
                      >
                        Trả lời
                      </button>
                      <span className="text-[11px] text-zinc-300">{timeAgo(comment.createdAt)}</span>
                      {user && user.id === comment.authorId && editingComment !== comment.id && (
                        <button
                          onClick={() => handleStartEdit(comment.id, comment.content)}
                          className="text-[11px] text-zinc-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          Sửa
                        </button>
                      )}
                      {user && (user.id === comment.authorId || user.role === 'admin') && (
                        <button
                          onClick={() => deleteComment(post.id, comment.id)}
                          className="text-[11px] text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {post.comments.filter(r => r.parentId === comment.id).map(reply => (
                  <div key={reply.id} className="flex gap-2.5 group ml-10 mt-2">
                    <div className="w-7 h-7 bg-gradient-to-br from-zinc-400 to-zinc-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                      {getInitials(reply.authorName)}
                    </div>
                    <div className="flex-1">
                      {editingComment === reply.id ? (
                        <div className="bg-white rounded-xl px-3 py-2 border-2 border-blue-400">
                          <span className="text-xs font-semibold text-zinc-900">{reply.authorName}</span>
                          <input
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveEdit(reply.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            className="w-full text-sm text-zinc-600 mt-1 bg-transparent outline-none"
                            autoFocus
                          />
                          <div className="flex gap-2 mt-1.5">
                            <button onClick={() => handleSaveEdit(reply.id)} className="text-[11px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                              <Check size={11} /> Lưu
                            </button>
                            <button onClick={handleCancelEdit} className="text-[11px] font-medium text-zinc-400 hover:text-zinc-600">
                              Hủy
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white rounded-xl px-2.5 py-1.5 border border-zinc-100">
                          <span className="text-[11px] font-semibold text-zinc-900">{reply.authorName}</span>
                          <p className="text-[13px] text-zinc-600">{reply.content}</p>
                          {reply.editedAt && <span className="text-[10px] text-zinc-300 italic">đã chỉnh sửa</span>}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-0.5 px-1">
                        <button
                          onClick={() => user && toggleCommentLike(post.id, reply.id, user.id)}
                          className={`text-[10px] font-medium ${reply.likes.includes(user?.id || '') ? 'text-red-500' : 'text-zinc-400 hover:text-zinc-600'}`}
                        >
                          Thích {reply.likes.length > 0 && `(${reply.likes.length})`}
                        </button>
                        <button
                          onClick={() => handleReply(comment.id, reply.authorName)}
                          className="text-[10px] font-medium text-zinc-400 hover:text-blue-600 transition-colors"
                        >
                          Trả lời
                        </button>
                        <span className="text-[10px] text-zinc-300">{timeAgo(reply.createdAt)}</span>
                        {user && user.id === reply.authorId && editingComment !== reply.id && (
                          <button
                            onClick={() => handleStartEdit(reply.id, reply.content)}
                            className="text-[10px] text-zinc-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            Sửa
                          </button>
                        )}
                        {user && (user.id === reply.authorId || user.role === 'admin') && (
                          <button
                            onClick={() => deleteComment(post.id, reply.id)}
                            className="text-[10px] text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {post.comments.length === 0 && (
              <p className="text-xs text-zinc-400 text-center py-2 italic">Chưa có bình luận nào</p>
            )}
          </div>

          {/* Reply indicator */}
          {replyTo && (
            <div className="px-4 pb-1 flex items-center gap-2">
              <Reply size={12} className="text-blue-500" />
              <span className="text-xs text-blue-600">Đang trả lời <strong>{replyTo.name}</strong></span>
              <button onClick={() => setReplyTo(null)} className="text-xs text-zinc-400 hover:text-zinc-600 ml-1">
                <X size={12} />
              </button>
            </div>
          )}

          {/* New comment */}
          <div className="px-4 pb-4 flex gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
              {user ? getInitials(user.name) : '?'}
            </div>
            <div className="flex-1 flex gap-2">
              <input
                ref={commentInputRef}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleComment()}
                className="flex-1 px-3 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder={replyTo ? `Trả lời ${replyTo.name}...` : "Viết bình luận..."}
              />
              <button
                onClick={handleComment}
                disabled={!commentText.trim()}
                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 text-white rounded-xl transition-all"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============ Main Social Page ============
export const SocialPage: React.FC<{ onViewProfile?: (userId: string) => void }> = ({ onViewProfile }) => {
  const { user } = useAuthStore();
  const { posts, addPost } = useSocialStore();
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<'general' | 'technical' | 'safety' | 'announcement'>('general');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest');
  const [mediaFiles, setMediaFiles] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      // Limit: 10MB per file for base64 storage
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" quá lớn (tối đa 10MB)`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setMediaFiles(prev => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const removeMedia = (idx: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handlePost = () => {
    if ((!newContent.trim() && mediaFiles.length === 0) || !user) return;
    addPost({
      authorId: user.id,
      authorName: user.name,
      authorAvatar: user.avatar,
      authorRole: user.role,
      content: newContent.trim(),
      images: mediaFiles,
      category: newCategory
    });
    setNewContent('');
    setMediaFiles([]);
  };

  const filtered = filterCat === 'all' ? posts : posts.filter(p => p.category === filterCat);

  // Sort posts
  const sortedPosts = [...filtered].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    // popular: by likes + comments
    const scoreA = a.likes.length + a.comments.length + a.shares;
    const scoreB = b.likes.length + b.comments.length + b.shares;
    return scoreB - scoreA;
  });

  const SORT_OPTIONS = [
    { value: 'newest' as const, label: 'Mới đây' },
    { value: 'popular' as const, label: 'Đề xuất' },
    { value: 'oldest' as const, label: 'Cũ nhất' },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto py-4 sm:py-6 px-3 sm:px-4">
      {/* Create post */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex gap-2 sm:gap-3 mb-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold flex-shrink-0">
            {user ? getInitials(user.name) : '?'}
          </div>
          <textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all"
            rows={3}
            placeholder="Chia sẻ kinh nghiệm, thông báo..."
          />
        </div>

        {/* Media preview */}
        {mediaFiles.length > 0 && (
          <div className="mb-3 flex gap-2 flex-wrap">
            {mediaFiles.map((src, idx) => (
              <div key={idx} className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-zinc-100 group">
                {isVideoUrl(src) ? (
                  <div className="relative w-full h-full">
                    <video src={src} className="w-full h-full object-cover" muted />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Play size={14} className="text-white" />
                    </div>
                  </div>
                ) : (
                  <img src={src} alt="" className="w-full h-full object-cover" />
                )}
                <button
                  onClick={() => removeMedia(idx)}
                  className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 hover:bg-black/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleMediaSelect}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleMediaSelect}
        />

        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1 sm:gap-1.5 items-center flex-wrap">
            {/* Category buttons */}
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.value}
                  onClick={() => setNewCategory(cat.value as any)}
                  className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-medium flex items-center gap-1 transition-all ${
                    newCategory === cat.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                  }`}
                >
                  <Icon size={12} /> <span className="hidden xs:inline sm:inline">{cat.label}</span>
                </button>
              );
            })}

            {/* Media buttons */}
            <div className="w-px h-5 bg-zinc-200 mx-0.5 sm:mx-1" />
            <button
              onClick={() => imageInputRef.current?.click()}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-green-600 hover:bg-green-50 transition-all"
              title="Thêm ảnh"
            >
              <Image size={16} />
            </button>
            <button
              onClick={() => videoInputRef.current?.click()}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-purple-600 hover:bg-purple-50 transition-all"
              title="Thêm video"
            >
              <Video size={16} />
            </button>
          </div>

          <button
            onClick={handlePost}
            disabled={!newContent.trim() && mediaFiles.length === 0}
            className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 text-white text-xs sm:text-sm font-bold rounded-xl transition-all flex-shrink-0"
          >
            Đăng bài
          </button>
        </div>
      </div>

      {/* Filter + Sort */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 flex-1 scrollbar-hide">
          <button
            onClick={() => setFilterCat('all')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all ${
              filterCat === 'all' ? 'bg-blue-600 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            Tất cả
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setFilterCat(cat.value)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all ${
                filterCat === cat.value ? 'bg-blue-600 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div className="flex gap-1 flex-shrink-0">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-medium whitespace-nowrap transition-all ${
                sortBy === opt.value
                  ? 'bg-zinc-800 text-white'
                  : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Posts feed */}
      <div className="space-y-3 sm:space-y-4">
        {sortedPosts.map(post => (
          <PostCard key={post.id} post={post} onViewProfile={onViewProfile} />
        ))}
        {sortedPosts.length === 0 && (
          <div className="text-center py-12 text-zinc-400">
            <MessageCircle size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Chưa có bài viết nào</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
