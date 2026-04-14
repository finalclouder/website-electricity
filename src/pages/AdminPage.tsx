import React, { useState, useEffect } from 'react';
import { Users, Shield, Trash2, Key, Search, Activity, FileText, MessageCircle, BarChart3, ChevronDown, AlertTriangle, CheckCircle2, Globe, Image, Type, Phone, Mail, MapPin, Clock, Plus, X, RotateCcw, Save, ChevronUp, Zap, PlusCircle, Eye, Video, Play, Upload, Loader2 } from 'lucide-react';
import { useAuthStore, User } from '../store/useAuthStore';
import { useSocialStore } from '../store/useSocialStore';
import { useLandingStore, HeroSlide, FeatureItem } from '../store/useLandingStore';
import { compressHeroImage, compressGalleryImage, compressThumbnail, compressBannerImage, videoToBase64, formatFileSize } from '../utils/mediaUpload';

import { timeAgo } from '../utils/date';

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();
}

// ============ Landing Page Editor Component ============
const LandingEditor: React.FC<{ showNotif: (text: string, type?: 'success' | 'error') => void }> = ({ showNotif }) => {
  const { config, updateConfig, syncConfigToServer, updateHeroSlide, addHeroSlide, removeHeroSlide, updateFeature, updateQuickAction, updateContact, updateAboutChecklist, addAboutChecklist, removeAboutChecklist, addGalleryItem, updateGalleryItem, removeGalleryItem, addVideoItem, updateVideoItem, removeVideoItem, updateCustomerCareBanner, resetToDefault } = useLandingStore();
  const [activeSection, setActiveSection] = useState('general');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null); // track which field is uploading

  // Generic file upload handler
  const handleImageUpload = async (
    accept: string,
    compressFn: (file: File) => Promise<string>,
    onResult: (dataUrl: string) => void,
    uploadKey: string
  ) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploading(uploadKey);
      try {
        const dataUrl = await compressFn(file);
        onResult(dataUrl);
        showNotif(`Đã tải lên ${file.name} (${formatFileSize(file.size)})`);
      } catch (err: any) {
        showNotif(err.message || 'Lỗi tải file', 'error');
      } finally {
        setUploading(null);
      }
    };
    input.click();
  };

  const handleVideoUpload = async (
    onResult: (dataUrl: string) => void,
    uploadKey: string
  ) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/mp4,video/webm,video/ogg';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploading(uploadKey);
      try {
        const dataUrl = await videoToBase64(file);
        onResult(dataUrl);
        showNotif(`Đã tải lên video ${file.name} (${formatFileSize(file.size)})`);
      } catch (err: any) {
        showNotif(err.message || 'Lỗi tải video', 'error');
      } finally {
        setUploading(null);
      }
    };
    input.click();
  };

  // Upload button component
  const UploadBtn: React.FC<{ label: string; uploadKey: string; accept?: string; onUpload: () => void }> = ({ label, uploadKey, onUpload }) => (
    <button
      onClick={onUpload}
      disabled={uploading === uploadKey}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[11px] font-bold rounded-lg border border-blue-200 transition-all disabled:opacity-50"
    >
      {uploading === uploadKey ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
      {uploading === uploadKey ? 'Đang xử lý...' : label}
    </button>
  );

  const sections = [
    { id: 'general', label: 'Tổng quan', icon: Globe },
    { id: 'hero', label: 'Hero Banner', icon: Image },
    { id: 'quickactions', label: 'Quick Actions', icon: Zap },
    { id: 'features', label: 'Tính năng', icon: BarChart3 },
    { id: 'about', label: 'Giới thiệu', icon: Type },
    { id: 'gallery', label: 'Thư viện ảnh', icon: Image },
    { id: 'videos', label: 'Video', icon: Video },
    { id: 'banner', label: 'Banner CSKH', icon: Phone },
    { id: 'contact', label: 'Liên hệ', icon: Phone },
    { id: 'footer', label: 'Footer', icon: FileText },
  ];

  const badgeColorOptions = ['bg-red-600', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-purple-600', 'bg-indigo-600', 'bg-pink-600'];
  const featureColorOptions = ['blue', 'emerald', 'purple', 'amber', 'rose', 'cyan', 'indigo', 'green'];
  const actionColorOptions = ['bg-blue-500', 'bg-red-500', 'bg-green-600', 'bg-amber-500', 'bg-slate-700', 'bg-indigo-600', 'bg-purple-500', 'bg-pink-500'];
  const tabOptions = ['patctc', 'social', 'documents'];

  return (
    <div>
      {/* Section tabs */}
      <div className="flex flex-wrap gap-1.5 mb-6 bg-zinc-50 rounded-xl p-1.5 border border-zinc-100">
        {sections.map(s => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeSection === s.id
                  ? 'bg-white text-[#164396] shadow-sm border border-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-700 hover:bg-white/50'
              }`}
            >
              <Icon size={13} /> {s.label}
            </button>
          );
        })}
      </div>

      {/* ===== GENERAL ===== */}
      {activeSection === 'general' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <h3 className="text-sm font-bold text-zinc-800 mb-4 flex items-center gap-2"><Globe size={16} className="text-blue-500" /> Thông tin chung</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-600 mb-1 block">Banner trên cùng</label>
                <input value={config.bannerText} onChange={e => updateConfig({ bannerText: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 mb-1 block">Logo tiêu đề</label>
                  <input value={config.logoTitle} onChange={e => updateConfig({ logoTitle: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 mb-1 block">Logo phụ đề</label>
                  <input value={config.logoSubtitle} onChange={e => updateConfig({ logoSubtitle: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 mb-1 block">Hotline (utility bar)</label>
                  <input value={config.utilityHotline} onChange={e => updateConfig({ utilityHotline: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 mb-1 block">Email (utility bar)</label>
                  <input value={config.utilityEmail} onChange={e => updateConfig({ utilityEmail: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
            </div>
          </div>

          {/* Reset button */}
          <div className="bg-red-50 rounded-xl border border-red-100 p-5">
            <h3 className="text-sm font-bold text-red-700 mb-2">Khôi phục mặc định</h3>
            <p className="text-xs text-red-500 mb-3">Đặt lại toàn bộ cấu hình trang chủ về giá trị ban đầu.</p>
            {showResetConfirm ? (
              <div className="flex items-center gap-2">
              <button onClick={() => { syncConfigToServer(); alert("Đã lưu và đồng bộ thay đổi lên máy chủ thành công!"); }} className="px-3 sm:px-4 py-2 sm:py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-lg shadow-green-500/20 flex items-center gap-2"><Save size={16} /> <span className="hidden sm:inline">Đồng bộ & Lưu Web</span></button>
                <span className="text-xs text-red-600 font-medium">Xác nhận?</span>
                <button onClick={() => { resetToDefault(); setShowResetConfirm(false); showNotif('Đã khôi phục mặc định'); }} className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg">Xác nhận</button>
                <button onClick={() => setShowResetConfirm(false)} className="px-3 py-1.5 text-xs text-zinc-500">Hủy</button>
              </div>
            ) : (
              <button onClick={() => setShowResetConfirm(true)} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all">
                <RotateCcw size={13} /> Khôi phục mặc định
              </button>
            )}
          </div>
        </div>
      )}

      {/* ===== HERO SLIDES ===== */}
      {activeSection === 'hero' && (
        <div className="space-y-4">
          {config.heroSlides.map((slide, idx) => (
            <div key={slide.id} className="bg-white rounded-xl border border-zinc-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-zinc-800">Slide {idx + 1}</h3>
                {config.heroSlides.length > 1 && (
                  <button onClick={() => removeHeroSlide(slide.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                )}
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-600 mb-1 block">Badge text</label>
                    <input value={slide.badge} onChange={e => updateHeroSlide(slide.id, { badge: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-600 mb-1 block">Badge color</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {badgeColorOptions.map(c => (
                        <button key={c} onClick={() => updateHeroSlide(slide.id, { badgeColor: c })} className={`w-7 h-7 rounded-lg ${c} border-2 transition-all ${slide.badgeColor === c ? 'border-zinc-900 scale-110' : 'border-transparent'}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 mb-1 block">Tiêu đề</label>
                  <input value={slide.title} onChange={e => updateHeroSlide(slide.id, { title: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 mb-1 block">Mô tả</label>
                  <textarea value={slide.subtitle} onChange={e => updateHeroSlide(slide.id, { subtitle: e.target.value })} rows={2} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 mb-1 block">URL ảnh nền</label>
                  <div className="flex gap-2 mb-1">
                    <input value={slide.imageUrl} onChange={e => updateHeroSlide(slide.id, { imageUrl: e.target.value })} className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="https://..." />
                    <UploadBtn label="Tải ảnh lên" uploadKey={`hero-img-${slide.id}`} onUpload={() => handleImageUpload('image/*', compressHeroImage, (url) => updateHeroSlide(slide.id, { imageUrl: url }), `hero-img-${slide.id}`)} />
                  </div>
                  {slide.imageUrl && (
                    <div className="mt-2 h-20 rounded-lg overflow-hidden bg-zinc-100">
                      <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-600 mb-1 block">Loại media</label>
                    <div className="flex gap-2">
                      <button onClick={() => updateHeroSlide(slide.id, { mediaType: 'image' })}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          (slide.mediaType || 'image') === 'image' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-zinc-50 text-zinc-500 border border-zinc-200'
                        }`}>
                        <Image size={13} /> Ảnh
                      </button>
                      <button onClick={() => updateHeroSlide(slide.id, { mediaType: 'video' })}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          slide.mediaType === 'video' ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-zinc-50 text-zinc-500 border border-zinc-200'
                        }`}>
                        <Play size={13} /> Video
                      </button>
                    </div>
                  </div>
                  {slide.mediaType === 'video' && (
                    <div>
                      <label className="text-xs font-semibold text-zinc-600 mb-1 block">URL Video (mp4)</label>
                      <div className="flex gap-2">
                        <input value={slide.videoUrl || ''} onChange={e => updateHeroSlide(slide.id, { videoUrl: e.target.value })} className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="https://...video.mp4" />
                        <UploadBtn label="Tải video lên" uploadKey={`hero-vid-${slide.id}`} onUpload={() => handleVideoUpload((url) => updateHeroSlide(slide.id, { videoUrl: url }), `hero-vid-${slide.id}`)} />
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">Video tải lên tối đa 5MB. Video lớn hơn hãy dùng URL bên ngoài.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <button onClick={addHeroSlide} className="w-full py-3 bg-zinc-50 hover:bg-zinc-100 border-2 border-dashed border-zinc-300 rounded-xl text-sm font-semibold text-zinc-500 flex items-center justify-center gap-2 transition-all">
            <Plus size={16} /> Thêm slide mới
          </button>
        </div>
      )}

      {/* ===== QUICK ACTIONS ===== */}
      {activeSection === 'quickactions' && (
        <div className="space-y-3">
          {config.quickActions.map((action, idx) => (
            <div key={action.id} className="bg-white rounded-xl border border-zinc-200 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 mb-1 block">Tên ({idx + 1})</label>
                  <input value={action.label} onChange={e => updateQuickAction(action.id, { label: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 mb-1 block">Màu nền</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {actionColorOptions.map(c => (
                      <button key={c} onClick={() => updateQuickAction(action.id, { color: c })} className={`w-6 h-6 rounded-lg ${c} border-2 transition-all ${action.color === c ? 'border-zinc-900 scale-110' : 'border-transparent'}`} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 mb-1 block">Tab đích</label>
                  <select value={action.tab} onChange={e => updateQuickAction(action.id, { tab: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    {tabOptions.map(t => (
                      <option key={t} value={t}>{t === 'patctc' ? 'Lập phương án' : t === 'social' ? 'Cộng đồng' : 'Tài liệu'}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== FEATURES ===== */}
      {activeSection === 'features' && (
        <div className="space-y-3">
          {config.features.map((feat, idx) => (
            <div key={feat.id} className="bg-white rounded-xl border border-zinc-200 p-4">
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-600 mb-1 block">Tên tính năng {idx + 1}</label>
                    <input value={feat.title} onChange={e => updateFeature(feat.id, { title: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-600 mb-1 block">Màu</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {featureColorOptions.map(c => (
                        <button key={c} onClick={() => updateFeature(feat.id, { color: c })} className={`w-6 h-6 rounded-lg bg-${c}-500 border-2 transition-all ${feat.color === c ? 'border-zinc-900 scale-110' : 'border-transparent'}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 mb-1 block">Mô tả</label>
                  <textarea value={feat.desc} onChange={e => updateFeature(feat.id, { desc: e.target.value })} rows={2} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== ABOUT ===== */}
      {activeSection === 'about' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <h3 className="text-sm font-bold text-zinc-800 mb-4">Phần giới thiệu</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 mb-1 block">Tiêu đề</label>
                  <input value={config.aboutTitle} onChange={e => updateConfig({ aboutTitle: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 mb-1 block">Phụ đề</label>
                  <input value={config.aboutSubtitle} onChange={e => updateConfig({ aboutSubtitle: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-600 mb-1 block">Mô tả chi tiết</label>
                <textarea value={config.aboutDescription} onChange={e => updateConfig({ aboutDescription: e.target.value })} rows={3} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-600 mb-2 block">Checklist điểm nổi bật</label>
                <div className="space-y-2">
                  {config.aboutChecklist.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input value={item} onChange={e => updateAboutChecklist(i, e.target.value)} className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                      {config.aboutChecklist.length > 1 && (
                        <button onClick={() => removeAboutChecklist(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><X size={14} /></button>
                      )}
                    </div>
                  ))}
                  <button onClick={addAboutChecklist} className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"><Plus size={12} /> Thêm mục</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== CONTACT ===== */}
      {activeSection === 'contact' && (
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <h3 className="text-sm font-bold text-zinc-800 mb-4 flex items-center gap-2"><Phone size={16} className="text-green-500" /> Thông tin liên hệ</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-zinc-600 mb-1 block">Tên tổ chức</label>
              <input value={config.contact.orgName} onChange={e => updateContact({ orgName: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-600 mb-1 block">Hotline</label>
                <input value={config.contact.hotline} onChange={e => updateContact({ hotline: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-600 mb-1 block">SĐT cá nhân</label>
                <input value={config.contact.personalPhone} onChange={e => updateContact({ personalPhone: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-600 mb-1 block">Email chính</label>
                <input value={config.contact.email} onChange={e => updateContact({ email: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-600 mb-1 block">Email cá nhân</label>
                <input value={config.contact.personalEmail} onChange={e => updateContact({ personalEmail: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-600 mb-1 block">Địa chỉ</label>
              <input value={config.contact.address} onChange={e => updateContact({ address: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-600 mb-1 block">Giờ làm việc</label>
              <input value={config.contact.workHours} onChange={e => updateContact({ workHours: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </div>
        </div>
      )}

      {/* ===== GALLERY ===== */}
      {activeSection === 'gallery' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-2"><Image size={16} className="text-amber-500" /> Thư viện ảnh ({config.gallery.length})</h3>
          </div>
          {config.gallery.map((item, idx) => (
            <div key={item.id} className="bg-white rounded-xl border border-zinc-200 p-4">
              <div className="flex items-start gap-4">
                <div className="w-24 h-20 rounded-lg overflow-hidden bg-zinc-100 flex-shrink-0">
                  <img src={item.imageUrl} alt="" className="w-full h-full object-cover" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <label className="text-xs font-semibold text-zinc-600 mb-1 block">URL ảnh</label>
                    <div className="flex gap-2">
                      <input value={item.imageUrl} onChange={e => updateGalleryItem(item.id, { imageUrl: e.target.value })} className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                      <UploadBtn label="Tải lên" uploadKey={`gallery-${item.id}`} onUpload={() => handleImageUpload('image/*', compressGalleryImage, (url) => updateGalleryItem(item.id, { imageUrl: url }), `gallery-${item.id}`)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-zinc-600 mb-1 block">Chú thích</label>
                      <input value={item.caption} onChange={e => updateGalleryItem(item.id, { caption: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-600 mb-1 block">Danh mục</label>
                      <input value={item.category} onChange={e => updateGalleryItem(item.id, { category: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                  </div>
                </div>
                <button onClick={() => removeGalleryItem(item.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          <button onClick={addGalleryItem} className="w-full py-3 bg-zinc-50 hover:bg-zinc-100 border-2 border-dashed border-zinc-300 rounded-xl text-sm font-semibold text-zinc-500 flex items-center justify-center gap-2 transition-all">
            <Plus size={16} /> Thêm ảnh mới
          </button>
        </div>
      )}

      {/* ===== VIDEOS ===== */}
      {activeSection === 'videos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-2"><Video size={16} className="text-red-500" /> Video ({config.videos.length})</h3>
          </div>
          {config.videos.map((video, idx) => (
            <div key={video.id} className="bg-white rounded-xl border border-zinc-200 p-4">
              <div className="flex items-start gap-4">
                <div className="w-32 h-20 rounded-lg overflow-hidden bg-zinc-100 flex-shrink-0 relative">
                  <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Play size={20} className="text-white" fill="white" />
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <label className="text-xs font-semibold text-zinc-600 mb-1 block">Tiêu đề</label>
                    <input value={video.title} onChange={e => updateVideoItem(video.id, { title: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-zinc-600 mb-1 block">URL Video (mp4)</label>
                      <div className="flex gap-2">
                        <input value={video.videoUrl} onChange={e => updateVideoItem(video.id, { videoUrl: e.target.value })} className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="https://...video.mp4" />
                        <UploadBtn label="Tải video" uploadKey={`video-file-${video.id}`} onUpload={() => handleVideoUpload((url) => updateVideoItem(video.id, { videoUrl: url }), `video-file-${video.id}`)} />
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Tải lên tối đa 5MB. Video lớn hãy dùng URL ngoài.</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-600 mb-1 block">Thời lượng</label>
                      <input value={video.duration} onChange={e => updateVideoItem(video.id, { duration: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="5:30" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-600 mb-1 block">URL Thumbnail</label>
                    <div className="flex gap-2">
                      <input value={video.thumbnailUrl} onChange={e => updateVideoItem(video.id, { thumbnailUrl: e.target.value })} className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                      <UploadBtn label="Tải ảnh" uploadKey={`video-thumb-${video.id}`} onUpload={() => handleImageUpload('image/*', compressThumbnail, (url) => updateVideoItem(video.id, { thumbnailUrl: url }), `video-thumb-${video.id}`)} />
                    </div>
                  </div>
                </div>
                <button onClick={() => removeVideoItem(video.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          <button onClick={addVideoItem} className="w-full py-3 bg-zinc-50 hover:bg-zinc-100 border-2 border-dashed border-zinc-300 rounded-xl text-sm font-semibold text-zinc-500 flex items-center justify-center gap-2 transition-all">
            <Plus size={16} /> Thêm video mới
          </button>
        </div>
      )}

      {/* ===== CUSTOMER CARE BANNER ===== */}
      {activeSection === 'banner' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <h3 className="text-sm font-bold text-zinc-800 mb-4 flex items-center gap-2"><Image size={16} className="text-blue-500" /> Banner Chăm sóc khách hàng</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-600 mb-1 block">URL ảnh nền</label>
                <div className="flex gap-2 mb-1">
                  <input value={config.customerCareBanner.imageUrl} onChange={e => updateCustomerCareBanner({ imageUrl: e.target.value })} className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  <UploadBtn label="Tải ảnh lên" uploadKey="banner-img" onUpload={() => handleImageUpload('image/*', compressBannerImage, (url) => updateCustomerCareBanner({ imageUrl: url }), 'banner-img')} />
                </div>
                {config.customerCareBanner.imageUrl && (
                  <div className="mt-2 h-24 rounded-lg overflow-hidden bg-zinc-100">
                    <img src={config.customerCareBanner.imageUrl} alt="" className="w-full h-full object-cover" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 mb-1 block">Tiêu đề</label>
                  <input value={config.customerCareBanner.title} onChange={e => updateCustomerCareBanner({ title: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 mb-1 block">Phụ đề</label>
                  <input value={config.customerCareBanner.subtitle} onChange={e => updateCustomerCareBanner({ subtitle: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 mb-1 block">Hotline</label>
                  <input value={config.customerCareBanner.hotline} onChange={e => updateCustomerCareBanner({ hotline: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 mb-1 block">Email</label>
                  <input value={config.customerCareBanner.email} onChange={e => updateCustomerCareBanner({ email: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-600 mb-1 block">Nút CTA</label>
                <input value={config.customerCareBanner.ctaText} onChange={e => updateCustomerCareBanner({ ctaText: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== FOOTER ===== */}
      {activeSection === 'footer' && (
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <h3 className="text-sm font-bold text-zinc-800 mb-4">Chân trang (Footer)</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-zinc-600 mb-1 block">Copyright</label>
              <input value={config.footerCopyright} onChange={e => updateConfig({ footerCopyright: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-600 mb-1 block">Nhà phát triển</label>
              <input value={config.footerDeveloper} onChange={e => updateConfig({ footerDeveloper: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============ Main Admin Page ============
export const AdminPage: React.FC = () => {
  const { user, getAllUsers, deleteUser, toggleUserRole, resetUserPassword } = useAuthStore();
  const { posts, savedDocuments } = useSocialStore();

  const [adminTab, setAdminTab] = useState<'users' | 'landing'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);

  useEffect(() => {
    useAuthStore.getState().fetchUsers();
  }, []);

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
          <p className="text-sm text-zinc-400 mt-0.5">Quản lý người dùng và cấu hình trang chủ</p>
        </div>
      </div>

      {/* Admin tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setAdminTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            adminTab === 'users'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
          }`}
        >
          <Users size={16} /> Quản lý người dùng
        </button>
        <button
          onClick={() => setAdminTab('landing')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            adminTab === 'landing'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
          }`}
        >
          <Globe size={16} /> Quản lý trang chủ
        </button>
      </div>

      {/* ===== LANDING PAGE EDITOR TAB ===== */}
      {adminTab === 'landing' && (
        <LandingEditor showNotif={showNotif} />
      )}

      {/* ===== USERS TAB ===== */}
      {adminTab === 'users' && (
        <>
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
              <button onClick={() => { syncConfigToServer(); alert("Đã lưu và đồng bộ thay đổi lên máy chủ thành công!"); }} className="px-3 sm:px-4 py-2 sm:py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-lg shadow-green-500/20 flex items-center gap-2"><Save size={16} /> <span className="hidden sm:inline">Đồng bộ & Lưu Web</span></button>
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
                      <div className="col-span-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-zinc-100 text-zinc-500'
                        }`}>
                          <Shield size={10} /> {u.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </div>
                      <div className="col-span-2 text-sm text-zinc-600">
                        <span>{userPostCount} bài</span>
                        <span className="text-zinc-300 mx-1">·</span>
                        <span>{userCommentCount} cmt</span>
                      </div>
                      <div className="col-span-2 text-xs text-zinc-400">
                        {timeAgo(u.createdAt)}
                      </div>
                      <div className="col-span-2 flex items-center justify-end gap-1">
                        {!isCurrentUser && (
                          <>
                            
          {u.id !== user?.id && u.status === 'pending' && (
            <>
              <button onClick={() => useAuthStore.getState().updateUserStatus(u.id, 'approved')} className="text-green-600 hover:text-green-900 mx-1" title="Duyệt">
                <CheckCircle2 className="w-5 h-5" />
              </button>
              <button onClick={() => useAuthStore.getState().updateUserStatus(u.id, 'rejected')} className="text-red-600 hover:text-red-900 mx-1" title="Từ chối">
                <X className="w-5 h-5" />
              </button>
            </>
          )}
          {u.id !== user?.id && u.status === 'rejected' && (
            <button onClick={() => useAuthStore.getState().updateUserStatus(u.id, 'approved')} className="text-green-600 hover:text-green-900 mx-1" title="Duyệt lại">
                <CheckCircle2 className="w-5 h-5" />
              </button>
          )}
          <button onClick={() => handleToggleRole(u.id)} className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title={u.role === 'admin' ? 'Hạ quyền xuống User' : 'Nâng quyền lên Admin'}>
                              <Shield size={14} />
                            </button>
                            <button onClick={() => { setResetPasswordUserId(resetPasswordUserId === u.id ? null : u.id); setNewPassword(''); }} className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 transition-all" title="Đặt lại mật khẩu">
                              <Key size={14} />
                            </button>
                            <button onClick={() => setShowConfirmDelete(showConfirmDelete === u.id ? null : u.id)} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all" title="Xóa tài khoản">
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
                          <span>{timeAgo(u.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {!isCurrentUser && (
                            <>
                              
          {u.id !== user?.id && u.status === 'pending' && (
            <>
              <button onClick={() => useAuthStore.getState().updateUserStatus(u.id, 'approved')} className="text-green-600 hover:text-green-900 mx-1" title="Duyệt">
                <CheckCircle2 className="w-5 h-5" />
              </button>
              <button onClick={() => useAuthStore.getState().updateUserStatus(u.id, 'rejected')} className="text-red-600 hover:text-red-900 mx-1" title="Từ chối">
                <X className="w-5 h-5" />
              </button>
            </>
          )}
          {u.id !== user?.id && u.status === 'rejected' && (
            <button onClick={() => useAuthStore.getState().updateUserStatus(u.id, 'approved')} className="text-green-600 hover:text-green-900 mx-1" title="Duyệt lại">
                <CheckCircle2 className="w-5 h-5" />
              </button>
          )}
          <button onClick={() => handleToggleRole(u.id)} className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-all"><Shield size={14} /></button>
                              <button onClick={() => { setResetPasswordUserId(resetPasswordUserId === u.id ? null : u.id); setNewPassword(''); }} className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 transition-all"><Key size={14} /></button>
                              <button onClick={() => setShowConfirmDelete(showConfirmDelete === u.id ? null : u.id)} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 size={14} /></button>
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
              <button onClick={() => { syncConfigToServer(); alert("Đã lưu và đồng bộ thay đổi lên máy chủ thành công!"); }} className="px-3 sm:px-4 py-2 sm:py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-lg shadow-green-500/20 flex items-center gap-2"><Save size={16} /> <span className="hidden sm:inline">Đồng bộ & Lưu Web</span></button>
                            <Key size={16} className="text-amber-500 flex-shrink-0" />
                            <span className="text-xs text-amber-700 font-medium whitespace-nowrap">Mật khẩu mới cho {u.name}:</span>
                          </div>
                          <div className="flex-1 flex items-center gap-2">
                            <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" placeholder="Nhập mật khẩu mới (≥6 ký tự)..." className="flex-1 px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                            <button onClick={() => handleResetPassword(u.id)} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-all">Đặt lại</button>
                            <button onClick={() => { setResetPasswordUserId(null); setNewPassword(''); }} className="px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-600">Hủy</button>
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
                          <button onClick={() => handleDeleteUser(u.id)} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-all">Xóa</button>
                          <button onClick={() => setShowConfirmDelete(null)} className="px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-600">Hủy</button>
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
                  activities.push({ text: `${p.authorName} đã đăng bài viết`, time: p.createdAt, icon: FileText, color: 'blue' });
                  p.comments.forEach(c => {
                    activities.push({ text: `${c.authorName} đã bình luận`, time: c.createdAt, icon: MessageCircle, color: 'green' });
                  });
                });
                savedDocuments.forEach(d => {
                  activities.push({ text: `${d.authorName} đã lưu tài liệu "${d.title.slice(0, 40)}"`, time: d.createdAt, icon: FileText, color: 'purple' });
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
        </>
      )}
      </div>
    </div>
  );
};
