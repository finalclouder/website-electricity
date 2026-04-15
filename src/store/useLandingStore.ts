import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface HeroSlide {
  id: string;
  badge: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  bgOverlay: string;
  imageUrl: string;
  videoUrl?: string; // YouTube/mp4 URL for video background
  mediaType: 'image' | 'video';
}

export interface QuickAction {
  id: string;
  label: string;
  iconName: string;
  color: string;
  hoverColor: string;
  tab: string;
}

export interface FeatureItem {
  id: string;
  title: string;
  desc: string;
  iconName: string;
  color: string;
}

export interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  catColor: string;
}

export interface ContactInfo {
  orgName: string;
  hotline: string;
  email: string;
  address: string;
  workHours: string;
  personalPhone: string;
  personalEmail: string;
}

export interface GalleryItem {
  id: string;
  imageUrl: string;
  caption: string;
  category: string;
}

export interface VideoItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: string;
}

export interface LandingConfig {
  // Top banner
  bannerText: string;
  // Utility bar
  utilityHotline: string;
  utilityEmail: string;
  // Logo
  logoTitle: string;
  logoSubtitle: string;
  // Hero slides
  heroSlides: HeroSlide[];
  // Quick actions
  quickActions: QuickAction[];
  // Stats
  stats: { label: string; suffix: string }[];
  // Features
  features: FeatureItem[];
  // About section
  aboutTitle: string;
  aboutSubtitle: string;
  aboutDescription: string;
  aboutChecklist: string[];
  // Contact info
  contact: ContactInfo;
  // Gallery
  gallery: GalleryItem[];
  // Videos
  videos: VideoItem[];
  // Customer care banner
  customerCareBanner: {
    imageUrl: string;
    title: string;
    subtitle: string;
    hotline: string;
    email: string;
    ctaText: string;
    ctaUrl: string;
  };
  // Footer
  footerCopyright: string;
  footerDeveloper: string;
}

// Default config
const DEFAULT_CONFIG: LandingConfig = {
  bannerText: 'Đoàn kết - Kỷ luật - Sáng tạo',
  utilityHotline: '1900.6769',
  utilityEmail: 'info@npc.com.vn',
  logoTitle: '/logo.jpeg',
  logoSubtitle: '',
  heroSlides: [
    {
      id: '1',
      badge: 'TIN NỔI BẬT',
      badgeColor: 'bg-red-600',
      title: 'EVNNPC: Đảm bảo cung cấp điện an toàn, ổn định trong mùa nắng nóng 2026',
      subtitle: 'Tổng công ty Điện lực miền Bắc đã chủ động triển khai nhiều giải pháp kỹ thuật và vận hành để đáp ứng nhu cầu phụ tải tăng cao.',
      bgOverlay: 'linear-gradient(135deg, rgba(13,46,107,0.7) 0%, rgba(22,67,150,0.5) 100%)',
      imageUrl: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1600&q=80',
      mediaType: 'image' as const,
    },
    {
      id: '2',
      badge: 'AN TOÀN ĐIỆN',
      badgeColor: 'bg-emerald-600',
      title: 'Nâng cao công tác an toàn trong sửa chữa lưới điện đang mang điện',
      subtitle: 'Áp dụng quy trình thi công hotline theo tiêu chuẩn quốc tế, đảm bảo an toàn tuyệt đối cho người lao động.',
      bgOverlay: 'linear-gradient(135deg, rgba(5,46,22,0.7) 0%, rgba(22,101,52,0.5) 100%)',
      imageUrl: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1600&q=80',
      mediaType: 'image' as const,
    },
    {
      id: '3',
      badge: 'CÔNG NGHỆ',
      badgeColor: 'bg-blue-600',
      title: 'Số hóa phương án thi công - Xuất tài liệu nhanh chóng, chính xác',
      subtitle: 'Hệ thống PATCTC Generator giúp tạo phương án hoàn chỉnh 14 trang, xuất PDF và Word chỉ trong vài phút.',
      bgOverlay: 'linear-gradient(135deg, rgba(30,27,75,0.7) 0%, rgba(67,56,202,0.5) 100%)',
      imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1600&q=80',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      mediaType: 'video' as const,
    },
  ],
  quickActions: [
    { id: '1', label: 'Đăng tin', iconName: 'Zap', color: 'bg-blue-500', hoverColor: 'hover:bg-blue-600', tab: 'social' },
    { id: '2', label: 'Lập phương án mới', iconName: 'PlusCircle', color: 'bg-red-500', hoverColor: 'hover:bg-red-600', tab: 'patctc' },
    { id: '3', label: 'Mẫu PA TCTCBPAT', iconName: 'ClipboardList', color: 'bg-green-600', hoverColor: 'hover:bg-green-700', tab: 'documents' },
    { id: '4', label: 'Cộng đồng', iconName: 'Users', color: 'bg-amber-500', hoverColor: 'hover:bg-amber-600', tab: 'social' },
    { id: '5', label: 'Tài liệu', iconName: 'BookOpen', color: 'bg-slate-700', hoverColor: 'hover:bg-slate-800', tab: 'documents' },
    { id: '6', label: 'Hỗ trợ trực tuyến', iconName: 'MessageSquare', color: 'bg-indigo-600', hoverColor: 'hover:bg-indigo-700', tab: 'social' },
  ],
  stats: [
    { label: 'Phương án đã lập', suffix: '+' },
    { label: 'Thành viên', suffix: '+' },
    { label: 'An toàn thi công', suffix: '.9%' },
    { label: 'Hỗ trợ kỹ thuật', suffix: '/7' },
  ],
  features: [
    { id: '1', title: 'Lập phương án tự động', desc: 'Soạn thảo phương án thi công hotline đầy đủ 14 trang với giao diện trực quan, xem trước WYSIWYG.', iconName: 'FileText', color: 'blue' },
    { id: '2', title: 'Quản lý an toàn', desc: 'Nhận diện rủi ro, biện pháp an toàn, trình tự thi công theo đúng quy chuẩn ngành điện lực.', iconName: 'Shield', color: 'emerald' },
    { id: '3', title: 'Cộng đồng chia sẻ', desc: 'Trao đổi kinh nghiệm, chia sẻ phương án, bình luận và tương tác giữa các đội hotline.', iconName: 'Users', color: 'purple' },
    { id: '4', title: 'Quản trị hệ thống', desc: 'Quản lý người dùng, phân quyền, theo dõi hoạt động và thống kê tài liệu toàn hệ thống.', iconName: 'BarChart3', color: 'amber' },
    { id: '5', title: 'Xuất PDF & Word', desc: 'Xuất phương án hoàn chỉnh dạng PDF hoặc DOCX, sẵn sàng in ấn và nộp phê duyệt.', iconName: 'Cpu', color: 'rose' },
    { id: '6', title: 'Lưu trữ & tra cứu', desc: 'Lưu trữ tất cả phương án, xem trước chi tiết, tải về và chỉnh sửa lại bất cứ lúc nào.', iconName: 'Award', color: 'cyan' },
  ],
  aboutTitle: 'Đội Sửa chữa Hotline',
  aboutSubtitle: 'Công ty Điện lực Bắc Ninh',
  aboutDescription: 'Chúng tôi chuyên thực hiện công tác sửa chữa, bảo dưỡng lưới điện trung áp đang mang điện bằng phương pháp hotline. Với đội ngũ kỹ sư và công nhân lành nghề, chúng tôi cam kết đảm bảo an toàn tuyệt đối trong mọi hoạt động thi công.',
  aboutChecklist: [
    'Thi công hotline trên lưới điện 22kV & 35kV',
    'Đội ngũ được đào tạo chuyên sâu về an toàn điện',
    'Trang thiết bị hiện đại, đạt tiêu chuẩn quốc tế',
    'Hệ thống quản lý phương án số hóa hoàn toàn',
  ],
  contact: {
    orgName: 'Đội Sửa chữa Hotline - Công ty Điện lực Bắc Ninh',
    hotline: '1900.6769',
    email: 'contact@patctc.vn',
    address: 'Thành phố Bắc Ninh, tỉnh Bắc Ninh, Việt Nam',
    workHours: 'Thứ 2 - Thứ 6: 7:30 - 17:00',
    personalPhone: '0393.954.568',
    personalEmail: 'dungdong333@gmail.com',
  },
  gallery: [
    { id: 'g1', imageUrl: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&q=80', caption: 'Thi công sửa chữa hotline trên đường dây 22kV', category: 'Thi công' },
    { id: 'g2', imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80', caption: 'Kiểm tra an toàn trước khi thi công', category: 'An toàn' },
    { id: 'g3', imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80', caption: 'Đội ngũ kỹ thuật viên chuyên nghiệp', category: 'Nhân sự' },
    { id: 'g4', imageUrl: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&q=80', caption: 'Trang thiết bị thi công hiện đại', category: 'Thiết bị' },
    { id: 'g5', imageUrl: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=800&q=80', caption: 'Hệ thống lưới điện trung áp', category: 'Hạ tầng' },
    { id: 'g6', imageUrl: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&q=80', caption: 'Trạm biến áp phân phối', category: 'Hạ tầng' },
  ],
  videos: [
    { id: 'v1', title: 'Quy trình thi công Hotline an toàn', thumbnailUrl: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&q=80', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', duration: '5:30' },
    { id: 'v2', title: 'Hướng dẫn sử dụng PATCTC Generator', thumbnailUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', duration: '8:45' },
    { id: 'v3', title: 'An toàn điện - Những điều cần biết', thumbnailUrl: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&q=80', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', duration: '12:20' },
  ],
  customerCareBanner: {
    imageUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1600&q=80',
    title: 'Trung tâm Chăm sóc Khách hàng',
    subtitle: 'Hỗ trợ kỹ thuật 24/7 - Giải đáp mọi thắc mắc về hệ thống',
    hotline: '1900.6769',
    email: 'cskh@npc.com.vn',
    ctaText: 'Liên hệ hỗ trợ',
    ctaUrl: '#lien-he',
  },
  footerCopyright: '© 2026 PATCTC Generator. Đội Sửa chữa Hotline - Công ty Điện lực Bắc Ninh.',
  footerDeveloper: 'Phát triển bởi DungDT293',
};

import { api } from '../utils/api';

function normalizeLandingConfig(config?: Partial<LandingConfig> | null): LandingConfig {
  const savedConfig = (config || {}) as Partial<LandingConfig>;
  const mergedConfig = { ...DEFAULT_CONFIG, ...savedConfig } as LandingConfig;

  mergedConfig.contact = { ...DEFAULT_CONFIG.contact, ...(savedConfig.contact || {}) };
  mergedConfig.customerCareBanner = { ...DEFAULT_CONFIG.customerCareBanner, ...(savedConfig.customerCareBanner || {}) };
  mergedConfig.stats = Array.isArray(savedConfig.stats) ? savedConfig.stats : DEFAULT_CONFIG.stats;
  mergedConfig.features = Array.isArray(savedConfig.features) ? savedConfig.features : DEFAULT_CONFIG.features;
  mergedConfig.quickActions = Array.isArray(savedConfig.quickActions) ? savedConfig.quickActions : DEFAULT_CONFIG.quickActions;
  mergedConfig.aboutChecklist = Array.isArray(savedConfig.aboutChecklist) ? savedConfig.aboutChecklist : DEFAULT_CONFIG.aboutChecklist;
  mergedConfig.gallery = Array.isArray(savedConfig.gallery) ? savedConfig.gallery : DEFAULT_CONFIG.gallery;
  mergedConfig.videos = Array.isArray(savedConfig.videos) ? savedConfig.videos : DEFAULT_CONFIG.videos;
  mergedConfig.heroSlides = Array.isArray(savedConfig.heroSlides)
    ? savedConfig.heroSlides.map((slide: any) => ({
        ...slide,
        mediaType: slide?.mediaType || 'image',
      }))
    : DEFAULT_CONFIG.heroSlides;

  return mergedConfig;
}

interface LandingStore {
  fetchConfigFromServer: () => Promise<void>;
  syncConfigToServer: () => Promise<void>;
  config: LandingConfig;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  saveError: string | null;
  updateConfig: (updates: Partial<LandingConfig>) => void;
  updateHeroSlide: (id: string, updates: Partial<HeroSlide>) => void;
  addHeroSlide: () => void;
  removeHeroSlide: (id: string) => void;
  updateFeature: (id: string, updates: Partial<FeatureItem>) => void;
  updateQuickAction: (id: string, updates: Partial<QuickAction>) => void;
  updateContact: (updates: Partial<ContactInfo>) => void;
  updateAboutChecklist: (index: number, value: string) => void;
  addAboutChecklist: () => void;
  removeAboutChecklist: (index: number) => void;
  addGalleryItem: () => void;
  updateGalleryItem: (id: string, updates: Partial<GalleryItem>) => void;
  removeGalleryItem: (id: string) => void;
  addVideoItem: () => void;
  updateVideoItem: (id: string, updates: Partial<VideoItem>) => void;
  removeVideoItem: (id: string) => void;
  updateCustomerCareBanner: (updates: Partial<LandingConfig['customerCareBanner']>) => void;
  resetToDefault: () => void;
}

export const useLandingStore = create<LandingStore>()(
  persist(
    (set, get) => ({
      config: normalizeLandingConfig(DEFAULT_CONFIG),
      hasUnsavedChanges: false,
      isSaving: false,
      saveError: null,

      fetchConfigFromServer: async () => {
        try {
          const data = await api.get<{ config: LandingConfig | null }>('/landing');
          if (data.config) {
            set({
              config: normalizeLandingConfig(data.config),
              hasUnsavedChanges: false,
              isSaving: false,
              saveError: null,
            });
          }
        } catch (error) {
          console.error('Failed to fetch landing config:', error);
        }
      },

      syncConfigToServer: async () => {
        set({ isSaving: true, saveError: null });
        try {
          const config = get().config;
          await api.post('/landing', { config });
          set({ hasUnsavedChanges: false, isSaving: false, saveError: null });
        } catch (error: any) {
          const message = error?.message || 'Không thể đồng bộ cấu hình trang chủ';
          set({ isSaving: false, saveError: message });
          console.error('Failed to sync landing config:', error);
          throw error;
        }
      },

      updateConfig: (updates) => set(state => ({
        config: { ...state.config, ...updates },
        hasUnsavedChanges: true,
        saveError: null,
      })),

      updateHeroSlide: (id, updates) => set(state => ({
        config: {
          ...state.config,
          heroSlides: state.config.heroSlides.map(s => s.id === id ? { ...s, ...updates } : s),
        },
        hasUnsavedChanges: true,
        saveError: null,
      })),

      addHeroSlide: () => set(state => ({
        config: {
          ...state.config,
          heroSlides: [...state.config.heroSlides, {
            id: Date.now().toString(),
            badge: 'MỚI',
            badgeColor: 'bg-blue-600',
            title: 'Tiêu đề slide mới',
            subtitle: 'Mô tả slide mới',
            bgOverlay: 'linear-gradient(135deg, rgba(13,46,107,0.7) 0%, rgba(22,67,150,0.5) 100%)',
            imageUrl: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1600&q=80',
            mediaType: 'image' as const,
          }],
        },
        hasUnsavedChanges: true,
        saveError: null,
      })),

      removeHeroSlide: (id) => set(state => ({
        config: {
          ...state.config,
          heroSlides: state.config.heroSlides.filter(s => s.id !== id),
        },
        hasUnsavedChanges: true,
        saveError: null,
      })),

      updateFeature: (id, updates) => set(state => ({
        config: {
          ...state.config,
          features: state.config.features.map(f => f.id === id ? { ...f, ...updates } : f),
        },
        hasUnsavedChanges: true,
        saveError: null,
      })),

      updateQuickAction: (id, updates) => set(state => ({
        config: {
          ...state.config,
          quickActions: state.config.quickActions.map(a => a.id === id ? { ...a, ...updates } : a),
        },
        hasUnsavedChanges: true,
        saveError: null,
      })),

      updateContact: (updates) => set(state => ({
        config: {
          ...state.config,
          contact: { ...state.config.contact, ...updates },
        },
        hasUnsavedChanges: true,
        saveError: null,
      })),

      updateAboutChecklist: (index, value) => set(state => {
        const newList = [...state.config.aboutChecklist];
        newList[index] = value;
        return {
          config: { ...state.config, aboutChecklist: newList },
          hasUnsavedChanges: true,
          saveError: null,
        };
      }),

      addAboutChecklist: () => set(state => ({
        config: {
          ...state.config,
          aboutChecklist: [...state.config.aboutChecklist, 'Mục mới'],
        },
        hasUnsavedChanges: true,
        saveError: null,
      })),

      removeAboutChecklist: (index) => set(state => ({
        config: {
          ...state.config,
          aboutChecklist: state.config.aboutChecklist.filter((_, i) => i !== index),
        },
        hasUnsavedChanges: true,
        saveError: null,
      })),

      addGalleryItem: () => set(state => ({
        config: {
          ...state.config,
          gallery: [...state.config.gallery, {
            id: Date.now().toString(),
            imageUrl: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&q=80',
            caption: 'Hình ảnh mới',
            category: 'Chung',
          }],
        },
        hasUnsavedChanges: true,
        saveError: null,
      })),

      updateGalleryItem: (id, updates) => set(state => ({
        config: {
          ...state.config,
          gallery: state.config.gallery.map(g => g.id === id ? { ...g, ...updates } : g),
        },
        hasUnsavedChanges: true,
        saveError: null,
      })),

      removeGalleryItem: (id) => set(state => ({
        config: {
          ...state.config,
          gallery: state.config.gallery.filter(g => g.id !== id),
        },
        hasUnsavedChanges: true,
        saveError: null,
      })),

      addVideoItem: () => set(state => ({
        config: {
          ...state.config,
          videos: [...state.config.videos, {
            id: Date.now().toString(),
            title: 'Video mới',
            thumbnailUrl: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&q=80',
            videoUrl: '',
            duration: '0:00',
          }],
        },
        hasUnsavedChanges: true,
        saveError: null,
      })),

      updateVideoItem: (id, updates) => set(state => ({
        config: {
          ...state.config,
          videos: state.config.videos.map(v => v.id === id ? { ...v, ...updates } : v),
        },
        hasUnsavedChanges: true,
        saveError: null,
      })),

      removeVideoItem: (id) => set(state => ({
        config: {
          ...state.config,
          videos: state.config.videos.filter(v => v.id !== id),
        },
        hasUnsavedChanges: true,
        saveError: null,
      })),

      updateCustomerCareBanner: (updates) => set(state => ({
        config: {
          ...state.config,
          customerCareBanner: { ...state.config.customerCareBanner, ...updates },
        },
        hasUnsavedChanges: true,
        saveError: null,
      })),

      resetToDefault: () => set({
        config: normalizeLandingConfig(DEFAULT_CONFIG),
        hasUnsavedChanges: true,
        saveError: null,
      }),
    }),
    {
      name: 'patctc-landing',
      partialize: (state) => ({ config: state.config }),
      merge: (persisted: any, current: any) => {
        if (!persisted || !persisted.config) return current;
        return {
          ...current,
          config: normalizeLandingConfig(persisted.config),
          hasUnsavedChanges: false,
          isSaving: false,
          saveError: null,
        };
      },
    }
  )
);
