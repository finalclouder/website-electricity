import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, Shield, FileText, Users, ChevronRight, Phone, Mail, MapPin, Clock, ArrowRight, CheckCircle2, BarChart3, Award, Cpu, Menu, X, ChevronLeft, Search, Globe, MessageSquare, PlusCircle, ClipboardList, BookOpen, ArrowUp, Send, User, ChevronUp, Play, Image, Video, Heart, Eye } from 'lucide-react';
import { useSocialStore } from '../store/useSocialStore';
import { useAuthStore } from '../store/useAuthStore';
import { useLandingStore } from '../store/useLandingStore';
import { formatDateTime, parseAppDate } from '../utils/date';

// Icon name to component map
const ICON_MAP: Record<string, any> = { Zap, Shield, FileText, Users, BarChart3, Cpu, Award, PlusCircle, ClipboardList, BookOpen, MessageSquare, Phone, Mail, MapPin, Clock, Globe, Search };

interface LandingPageProps {
  onEnter: (options?: { tab?: string; register?: boolean }) => void;
}

// ============ Section IDs for scroll spy ============
const SECTIONS = [
  { id: 'trang-chu', label: 'Trang chủ' },
  { id: 'gioi-thieu', label: 'Giới thiệu' },
  { id: 'thu-vien', label: 'Thư viện' },
  { id: 'tin-tuc', label: 'Tin tức' },
  { id: 'mau-phuong-an', label: 'Mẫu phương án TCTCBPAT' },
  { id: 'lien-he', label: 'Liên hệ' },
];

// ============ Animated Counter Hook ============
function useCountUp(target: number, duration = 2000, start = false): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    let raf: number;
    const animate = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setCount(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return count;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [activeSection, setActiveSection] = useState('trang-chu');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [contactSent, setContactSent] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [activeGalleryCategory, setActiveGalleryCategory] = useState('all');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);

  // Landing page config from store
  const { config } = useLandingStore();

  // Dynamic data from stores
  const { posts, savedDocuments } = useSocialStore();
  const { getAllUsers } = useAuthStore();

  const totalUsers = getAllUsers().length;
  const totalPosts = posts.length;
  const totalDocs = savedDocuments.length;

  // Dynamic stats
  const STATS_DATA = [
    { target: Math.max(totalDocs, 500), suffix: '+', label: 'Phương án đã lập' },
    { target: Math.max(totalUsers, 50), suffix: '+', label: 'Thành viên' },
    { target: 99, suffix: '.9%', label: 'An toàn thi công' },
    { target: 24, suffix: '/7', label: 'Hỗ trợ kỹ thuật' },
  ];

  const stat1 = useCountUp(STATS_DATA[0].target, 2000, statsVisible);
  const stat2 = useCountUp(STATS_DATA[1].target, 1800, statsVisible);
  const stat3 = useCountUp(STATS_DATA[2].target, 1600, statsVisible);
  const stat4 = useCountUp(STATS_DATA[3].target, 1400, statsVisible);
  const statValues = [stat1, stat2, stat3, stat4];

  // Dynamic news from social posts
  const dynamicNews = posts.slice(0, 6).map(p => {
    const parsedDate = parseAppDate(p.createdAt);
    const dateStr = parsedDate ? formatDateTime(p.createdAt).split(' ')[1] : 'Không rõ ngày';
    const catMap: Record<string, { category: string; catColor: string }> = {
      announcement: { category: 'Thông báo', catColor: 'blue' },
      technical: { category: 'Kỹ thuật', catColor: 'green' },
      safety: { category: 'An toàn', catColor: 'amber' },
      general: { category: 'Tin tức', catColor: 'purple' },
    };
    const cat = catMap[p.category] || catMap.general;
    return {
      title: p.content.split('\n')[0].replace(/[^\w\sàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđĐ:,.!?-]/gi, '').trim().substring(0, 80),
      excerpt: p.content.substring(0, 150),
      date: dateStr,
      authorName: p.authorName,
      likes: p.likes.length,
      comments: p.comments.length,
      images: p.images || [],
      ...cat,
    };
  });

  // Fallback news
  const NEWS_ITEMS = dynamicNews.length > 0 ? dynamicNews : [
    { title: 'Cập nhật quy trình thi công hotline mới', excerpt: 'Áp dụng quy trình mới theo Thông tư của Bộ Công Thương về an toàn điện.', date: '05/04/2026', category: 'Thông báo', catColor: 'blue', authorName: '', likes: 0, comments: 0, images: [] },
    { title: 'Hướng dẫn sử dụng hệ thống PATCTC Generator', excerpt: 'Tài liệu hướng dẫn chi tiết cách lập phương án trên hệ thống.', date: '01/04/2026', category: 'Hướng dẫn', catColor: 'green', authorName: '', likes: 0, comments: 0, images: [] },
    { title: 'Đội Hotline hoàn thành 150 phương án trong Q1/2026', excerpt: 'Tổng kết quý I năm 2026, đội sửa chữa Hotline đã hoàn thành xuất sắc kế hoạch.', date: '28/03/2026', category: 'Tin tức', catColor: 'purple', authorName: '', likes: 0, comments: 0, images: [] },
  ];

  // Gallery categories
  const galleryCategories = ['all', ...Array.from(new Set(config.gallery.map(g => g.category)))];
  const filteredGallery = activeGalleryCategory === 'all' ? config.gallery : config.gallery.filter(g => g.category === activeGalleryCategory);

  // Search logic
  const allSearchable = [
    ...config.features.map(f => ({ type: 'Tính năng', title: f.title, desc: f.desc })),
    ...NEWS_ITEMS.map(n => ({ type: 'Tin tức', title: n.title, desc: n.excerpt })),
    ...SECTIONS.map(s => ({ type: 'Mục', title: s.label, desc: `Chuyển đến mục ${s.label}` })),
    { type: 'Chức năng', title: 'Đăng tin lên cộng đồng', desc: 'Chia sẻ bài viết, kinh nghiệm với các thành viên' },
    { type: 'Chức năng', title: 'Lập phương án thi công mới', desc: 'Tạo PA TCTC hotline mới với 14 trang đầy đủ' },
    { type: 'Chức năng', title: 'Quản lý tài liệu đã lưu', desc: 'Xem, tải, chỉnh sửa phương án đã lưu trước đó' },
  ];

  const searchResults = searchQuery.trim()
    ? allSearchable.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.desc.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Auto-slide
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % config.heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [config.heroSlides.length]);

  // Handle video playback when slide changes
  useEffect(() => {
    const slide = config.heroSlides[currentSlide];
    if (slide?.mediaType === 'video' && heroVideoRef.current) {
      heroVideoRef.current.play().catch(() => {});
    }
  }, [currentSlide, config.heroSlides]);

  // Scroll spy
  useEffect(() => {
    const sectionEls = SECTIONS.map(s => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (sectionEls.length === 0) return;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );
    sectionEls.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Stats counter trigger
  useEffect(() => {
    if (!statsRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStatsVisible(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  // Back-to-top
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Search focus
  useEffect(() => {
    if (showSearch) setTimeout(() => searchInputRef.current?.focus(), 100);
    else setSearchQuery('');
  }, [showSearch]);

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setShowSearch(true); }
      if (e.key === 'Escape') { setShowSearch(false); setLightboxImage(null); setPlayingVideo(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); setMobileMenu(false); }
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) return;
    setContactSent(true);
    setTimeout(() => { setContactSent(false); setContactForm({ name: '', email: '', phone: '', message: '' }); }, 3000);
  };

  const slide = config.heroSlides[currentSlide] || config.heroSlides[0];

  return (
    <div ref={pageRef} className="min-h-screen bg-white flex flex-col">

      {/* ============ TOP BANNER ============ */}
      <div className="bg-[#164396] text-white text-center py-2 px-4">
        <h1 className="text-sm sm:text-base font-bold tracking-wide">{config.bannerText}</h1>
      </div>

      {/* ============ UTILITY BAR ============ */}
      <div className="bg-[#0d2e6b] text-white text-[11px] py-1.5 px-4 hidden sm:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Phone size={10} /> Hotline: <strong>{config.utilityHotline}</strong></span>
            <span className="flex items-center gap-1"><Mail size={10} /> Email: {config.utilityEmail}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 cursor-pointer hover:text-cyan-300 transition-colors"><Globe size={10} /> English</span>
            <button onClick={() => setShowSearch(true)} className="flex items-center gap-1 cursor-pointer hover:text-cyan-300 transition-colors">
              <Search size={10} /> Tìm kiếm
            </button>
          </div>
        </div>
      </div>

      {/* ============ NAVBAR ============ */}
      <nav className="bg-white border-b border-zinc-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16 sm:h-[72px]">
          <button onClick={scrollToTop} className="flex items-center gap-3 cursor-pointer">
            <div className="flex flex-col">
              <img src="/logo-square.png" alt="Logo" className="h-12 sm:h-14 w-12 sm:w-14 object-contain rounded-full border border-zinc-200 shadow-sm bg-white p-1.5" />
            </div>
          </button>

          <div className="hidden lg:flex items-center gap-0">
            {SECTIONS.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`px-3 xl:px-4 py-2.5 text-sm font-semibold transition-all relative ${
                  activeSection === item.id ? 'text-[#164396]' : 'text-zinc-600 hover:text-[#164396]'
                }`}
              >
                {item.label}
                {activeSection === item.id && <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#164396] rounded-full" />}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowSearch(true)} className="hidden sm:flex lg:hidden p-2 hover:bg-zinc-100 rounded-lg text-zinc-500" title="Tìm kiếm (Ctrl+K)">
              <Search size={18} />
            </button>
            <button onClick={() => onEnter()} className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-zinc-600 hover:text-[#164396] transition-colors">
              <User size={16} /> Đăng nhập
            </button>
            <button onClick={() => onEnter({ register: true })} className="px-4 sm:px-5 py-2 sm:py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-red-500/20">
              Đăng ký
            </button>
            <button onClick={() => setMobileMenu(!mobileMenu)} className="lg:hidden p-2 hover:bg-zinc-100 rounded-lg ml-1">
              {mobileMenu ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileMenu && (
          <div className="lg:hidden border-t border-zinc-100 bg-white px-4 pb-4 space-y-1 shadow-lg">
            {SECTIONS.map(item => (
              <button key={item.id} onClick={() => scrollTo(item.id)}
                className={`block w-full text-left px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  activeSection === item.id ? 'bg-blue-50 text-[#164396]' : 'text-zinc-600 hover:bg-blue-50 hover:text-[#164396]'
                }`}
              >
                {item.label}
              </button>
            ))}
            <div className="flex gap-2 pt-2">
              <button onClick={() => { setMobileMenu(false); onEnter(); }} className="flex-1 px-4 py-2.5 text-sm font-bold text-[#164396] bg-blue-50 rounded-lg">Đăng nhập</button>
              <button onClick={() => { setMobileMenu(false); setShowSearch(true); }} className="px-3 py-2.5 bg-zinc-100 rounded-lg"><Search size={16} className="text-zinc-500" /></button>
            </div>
          </div>
        )}
      </nav>

      {/* ============ HERO BANNER WITH VIDEO SUPPORT ============ */}
      <section id="trang-chu" className="relative overflow-hidden" style={{ minHeight: '480px' }}>
        {/* Background media layers */}
        {config.heroSlides.map((s, i) => (
          <div key={s.id} className="absolute inset-0 transition-opacity duration-1000" style={{ opacity: i === currentSlide ? 1 : 0 }}>
            {s.mediaType === 'video' && s.videoUrl ? (
              <video
                ref={i === currentSlide ? heroVideoRef : undefined}
                src={s.videoUrl}
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                poster={s.imageUrl}
              />
            ) : (
              <img
                src={s.imageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
                onError={e => { (e.target as HTMLImageElement).style.opacity = '0'; }}
              />
            )}
          </div>
        ))}

        {/* Gradient overlay */}
        <div className="absolute inset-0 transition-all duration-700" style={{ background: slide.bgOverlay }} />

        {/* Animated pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />

        <div className="max-w-7xl mx-auto px-4 py-20 sm:py-24 lg:py-28 relative z-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-5">
              <span className={`inline-block px-3 py-1 ${slide.badgeColor} text-white text-[11px] font-bold uppercase tracking-wider rounded`}>
                {slide.badge}
              </span>
              {slide.mediaType === 'video' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold rounded">
                  <Play size={10} /> VIDEO
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-[44px] font-black text-white leading-tight mb-4 drop-shadow-lg">
              {slide.title}
            </h2>
            <p className="text-sm sm:text-base text-white/85 leading-relaxed mb-8 max-w-xl">
              {slide.subtitle}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onEnter()}
                className="px-6 py-3.5 bg-white text-[#164396] font-bold rounded-xl hover:bg-blue-50 transition-all shadow-xl text-sm flex items-center gap-2"
              >
                Xem chi tiết <ChevronRight size={16} />
              </button>
              <button
                onClick={() => onEnter({ register: true })}
                className="px-6 py-3.5 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/20 transition-all border border-white/30 text-sm"
              >
                Đăng ký ngay
              </button>
            </div>
          </div>
        </div>

        {/* Slide indicators */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {config.heroSlides.map((s, i) => (
            <button key={s.id} onClick={() => setCurrentSlide(i)}
              className={`transition-all rounded-full ${
                i === currentSlide ? 'w-8 h-3 bg-white' : 'w-3 h-3 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>

        {/* Arrows */}
        <button onClick={() => setCurrentSlide((currentSlide - 1 + config.heroSlides.length) % config.heroSlides.length)}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/20 hover:bg-black/50 rounded-full backdrop-blur-sm transition-all hidden sm:flex items-center justify-center group">
          <ChevronLeft size={22} className="text-white group-hover:scale-110 transition-transform" />
        </button>
        <button onClick={() => setCurrentSlide((currentSlide + 1) % config.heroSlides.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/20 hover:bg-black/50 rounded-full backdrop-blur-sm transition-all hidden sm:flex items-center justify-center group">
          <ChevronRight size={22} className="text-white group-hover:scale-110 transition-transform" />
        </button>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" className="w-full h-auto"><path d="M0 60V30C240 0 480 0 720 30C960 60 1200 60 1440 30V60H0Z" fill="white"/></svg>
        </div>
      </section>

      {/* ============ QUICK ACTIONS BAR ============ */}
      <section className="relative z-20 -mt-6 pb-4">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-100 p-3 sm:p-4">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
              {config.quickActions.map((action) => {
                const Icon = ICON_MAP[action.iconName] || Zap;
                return (
                  <button key={action.id} onClick={() => onEnter({ tab: action.tab })}
                    className="flex flex-col items-center gap-2 py-3 sm:py-4 rounded-xl hover:bg-zinc-50 transition-all group cursor-pointer"
                    title={`${action.label} - Đăng nhập để sử dụng`}
                  >
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 ${action.color} ${action.hoverColor} rounded-2xl flex items-center justify-center shadow-lg transition-all group-hover:scale-110 group-hover:shadow-xl`}>
                      <Icon size={24} className="text-white" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-semibold text-zinc-600 text-center leading-tight group-hover:text-[#164396] transition-colors">
                      {action.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ============ STATS BAR ============ */}
      <section className="bg-[#164396] py-8" ref={statsRef}>
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS_DATA.map((stat, i) => (
            <div key={stat.label} className="text-center py-2">
              <div className="text-3xl sm:text-4xl font-extrabold text-white">{statValues[i]}{stat.suffix}</div>
              <div className="text-xs text-blue-200 mt-1 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ ABOUT SECTION ============ */}
      <section id="gioi-thieu" className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                <Shield size={12} /> Về chúng tôi
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 mb-4 leading-tight">
                {config.aboutTitle}<br />
                <span className="text-[#164396]">{config.aboutSubtitle}</span>
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed mb-6">{config.aboutDescription}</p>
              <ul className="space-y-3 mb-8">
                {config.aboutChecklist.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-zinc-700">
                    <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button onClick={() => onEnter({ tab: 'patctc' })}
                className="px-6 py-3 bg-[#164396] hover:bg-[#0d2e6b] text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 text-sm">
                Truy cập hệ thống <ArrowRight size={16} />
              </button>
            </div>

            {/* Visual card with real images */}
            <div className="relative">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-3">
                  <div className="rounded-2xl overflow-hidden shadow-lg h-48">
                    <img src={config.gallery[0]?.imageUrl || 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&q=80'}
                      alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-xl">
                    <div className="text-3xl font-extrabold mb-1">{Math.max(totalDocs, 500)}+</div>
                    <div className="text-xs text-blue-200 uppercase tracking-wider font-bold">Phương án đã lập</div>
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <span className="px-2 py-1 bg-white/20 rounded-lg text-[11px] font-bold">Lập PA</span>
                      <ChevronRight size={12} className="text-blue-300" />
                      <span className="px-2 py-1 bg-white/20 rounded-lg text-[11px] font-bold">Duyệt</span>
                      <ChevronRight size={12} className="text-blue-300" />
                      <span className="px-2 py-1 bg-white/20 rounded-lg text-[11px] font-bold">Thi công</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 mt-6">
                  <div className="rounded-2xl overflow-hidden shadow-lg h-56">
                    <img src={config.gallery[1]?.imageUrl || 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=80'}
                      alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="rounded-2xl overflow-hidden shadow-lg h-40">
                    <img src={config.gallery[2]?.imageUrl || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&q=80'}
                      alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-cyan-400/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ============ GALLERY & VIDEO SECTION ============ */}
      <section id="thu-vien" className="py-16 sm:py-20 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
              <Image size={12} /> Thư viện ảnh & Video
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 mb-3">Hình ảnh & Video hoạt động</h3>
            <p className="text-sm text-zinc-500 max-w-2xl mx-auto">Những hình ảnh và video thực tế về hoạt động thi công, đào tạo an toàn và vận hành hệ thống.</p>
          </div>

          {/* Gallery Filter Tabs */}
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {galleryCategories.map(cat => (
              <button key={cat} onClick={() => setActiveGalleryCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeGalleryCategory === cat
                    ? 'bg-[#164396] text-white shadow-lg shadow-blue-500/20'
                    : 'bg-white text-zinc-500 border border-zinc-200 hover:border-blue-300 hover:text-[#164396]'
                }`}>
                {cat === 'all' ? 'Tất cả' : cat}
              </button>
            ))}
          </div>

          {/* Image Gallery Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-12">
            {filteredGallery.map((item) => (
              <div key={item.id}
                onClick={() => setLightboxImage(item.imageUrl)}
                className="relative group rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer aspect-[4/3] bg-zinc-200">
                <img src={item.imageUrl} alt={item.caption} loading="lazy" draggable={false}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <p className="text-white text-xs font-semibold line-clamp-2">{item.caption}</p>
                  <span className="text-white/60 text-[10px]">{item.category}</span>
                </div>
                <div className="absolute top-3 right-3 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye size={14} className="text-white" />
                </div>
              </div>
            ))}
          </div>

          {/* Video Section */}
          {config.videos.length > 0 && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase tracking-wider">
                  <Video size={12} /> Video
                </div>
                <div className="flex-1 h-px bg-zinc-200" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {config.videos.map((video) => (
                  <div key={video.id}
                    onClick={() => setPlayingVideo(video.videoUrl)}
                    className="bg-white rounded-2xl border border-zinc-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer">
                    <div className="relative aspect-video overflow-hidden bg-zinc-200">
                      <img src={video.thumbnailUrl} alt={video.title} loading="lazy" draggable={false}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                          <Play size={28} className="text-[#164396] ml-1" fill="#164396" />
                        </div>
                      </div>
                      <span className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 text-white text-[11px] font-bold rounded-lg backdrop-blur-sm">
                        {video.duration}
                      </span>
                    </div>
                    <div className="p-4">
                      <h4 className="text-sm font-bold text-zinc-900 group-hover:text-[#164396] transition-colors line-clamp-2">{video.title}</h4>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ============ CUSTOMER CARE BANNER ============ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={config.customerCareBanner.imageUrl} alt="" className="w-full h-full object-cover" draggable={false} onError={e => { (e.target as HTMLImageElement).style.opacity = '0'; }} />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d2e6b]/90 via-[#164396]/80 to-[#164396]/60" />
        </div>
        <div className="max-w-7xl mx-auto px-4 py-16 sm:py-20 relative z-10">
          <div className="max-w-2xl">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">{config.customerCareBanner.title}</h3>
            <p className="text-sm text-blue-200 mb-6">{config.customerCareBanner.subtitle}</p>
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
                <Phone size={20} className="text-cyan-300" />
                <div>
                  <div className="text-[10px] text-blue-200 uppercase tracking-wider">Hotline</div>
                  <div className="text-xl font-extrabold text-white">{config.customerCareBanner.hotline}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
                <Mail size={20} className="text-cyan-300" />
                <div>
                  <div className="text-[10px] text-blue-200 uppercase tracking-wider">Email</div>
                  <div className="text-sm font-bold text-white">{config.customerCareBanner.email}</div>
                </div>
              </div>
            </div>
            <button onClick={() => scrollTo('lien-he')}
              className="px-6 py-3.5 bg-white text-[#164396] font-bold rounded-xl hover:bg-blue-50 transition-all shadow-xl text-sm flex items-center gap-2">
              {config.customerCareBanner.ctaText} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="mau-phuong-an" className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-[#164396] rounded-full text-xs font-bold uppercase tracking-wider mb-4">
              <Cpu size={12} /> Tính năng nổi bật
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 mb-3">Giải pháp toàn diện cho thi công Hotline</h3>
            <p className="text-sm text-zinc-500 max-w-2xl mx-auto">
              Hệ thống cung cấp đầy đủ công cụ để lập phương án, quản lý an toàn và chia sẻ kinh nghiệm trong công tác sửa chữa lưới điện đang mang điện.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {config.features.map((feat) => {
              const Icon = ICON_MAP[feat.iconName] || FileText;
              return (
                <div key={feat.id} onClick={() => onEnter({ tab: 'patctc' })}
                  className="bg-white rounded-2xl border border-zinc-200 p-6 hover:shadow-xl hover:border-blue-200 hover:-translate-y-1 transition-all duration-300 group cursor-pointer">
                  <div className={`w-12 h-12 bg-${feat.color}-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon size={24} className={`text-${feat.color}-600`} />
                  </div>
                  <h4 className="text-base font-bold text-zinc-900 mb-2">{feat.title}</h4>
                  <p className="text-sm text-zinc-500 leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ NEWS ============ */}
      <section id="tin-tuc" className="py-16 sm:py-20 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
                <FileText size={12} /> Tin tức & Thông báo
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-900">Tin mới nhất</h3>
              {totalPosts > 0 && <p className="text-xs text-zinc-400 mt-1">{totalPosts} bài viết từ cộng đồng</p>}
            </div>
            <button onClick={() => onEnter({ tab: 'social' })}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-all">
              Xem tất cả <ChevronRight size={14} />
            </button>
          </div>

          {/* Featured news (first item large) + grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Featured article */}
            {NEWS_ITEMS[0] && (
              <div onClick={() => onEnter({ tab: 'social' })}
                className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer flex flex-col sm:flex-row">
                <div className={`sm:w-1/2 h-48 sm:h-auto bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center relative overflow-hidden`}>
                  {NEWS_ITEMS[0].images?.[0] ? (
                    <img src={NEWS_ITEMS[0].images[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <>
                      <div className="absolute inset-0 opacity-20" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0v40M0 20h40' stroke='white' stroke-width='0.5'/%3E%3C/svg%3E")`,
                        backgroundSize: '20px 20px'
                      }} />
                      <Zap size={56} className="text-white/30" />
                    </>
                  )}
                </div>
                <div className="sm:w-1/2 p-6 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-0.5 bg-${NEWS_ITEMS[0].catColor}-100 text-${NEWS_ITEMS[0].catColor}-700 text-[10px] font-bold uppercase rounded-full`}>{NEWS_ITEMS[0].category}</span>
                    <span className="text-[11px] text-zinc-400 flex items-center gap-1"><Clock size={10} /> {NEWS_ITEMS[0].date}</span>
                  </div>
                  <h4 className="text-lg font-bold text-zinc-900 mb-2 group-hover:text-[#164396] transition-colors">{NEWS_ITEMS[0].title}</h4>
                  <p className="text-sm text-zinc-500 leading-relaxed line-clamp-3 mb-4">{NEWS_ITEMS[0].excerpt}</p>
                  {(NEWS_ITEMS[0].authorName || NEWS_ITEMS[0].likes > 0) && (
                    <div className="flex items-center gap-3 text-xs text-zinc-400 pt-3 border-t border-zinc-100">
                      {NEWS_ITEMS[0].authorName && <span>{NEWS_ITEMS[0].authorName}</span>}
                      {NEWS_ITEMS[0].likes > 0 && <span className="flex items-center gap-1"><Heart size={10} /> {NEWS_ITEMS[0].likes}</span>}
                      {NEWS_ITEMS[0].comments > 0 && <span className="flex items-center gap-1"><MessageSquare size={10} /> {NEWS_ITEMS[0].comments}</span>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Side articles */}
            <div className="space-y-4">
              {NEWS_ITEMS.slice(1, 4).map((news, i) => (
                <div key={i} onClick={() => onEnter({ tab: 'social' })}
                  className="bg-white rounded-xl border border-zinc-200 p-4 hover:shadow-md hover:border-blue-200 transition-all group cursor-pointer flex gap-3">
                  <div className={`w-20 h-20 rounded-xl flex-shrink-0 overflow-hidden ${
                    news.images?.[0] ? '' : `bg-gradient-to-br ${i === 0 ? 'from-emerald-500 to-emerald-700' : i === 1 ? 'from-purple-500 to-purple-700' : 'from-amber-500 to-amber-700'} flex items-center justify-center`
                  }`}>
                    {news.images?.[0] ? (
                      <img src={news.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Zap size={20} className="text-white/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1 mb-1"><Clock size={9} /> {news.date}</span>
                    <h5 className="text-sm font-bold text-zinc-900 group-hover:text-[#164396] transition-colors line-clamp-2">{news.title}</h5>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => onEnter({ tab: 'social' })}
            className="sm:hidden w-full mt-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-600 flex items-center justify-center gap-1.5">
            Xem tất cả tin tức <ChevronRight size={14} />
          </button>
        </div>
      </section>

      {/* ============ CONTACT SECTION ============ */}
      <section id="lien-he" className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-[#164396] rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                <Phone size={12} /> Liên hệ
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 mb-4">Liên hệ với chúng tôi</h3>
              <p className="text-sm text-zinc-500 mb-8">Nếu bạn cần hỗ trợ kỹ thuật hoặc có thắc mắc, hãy liên hệ với chúng tôi qua các kênh bên dưới.</p>

              <div className="space-y-4 mb-8">
                {[
                  { icon: MapPin, color: 'blue', label: 'Địa chỉ', value: config.contact.address },
                  { icon: Phone, color: 'green', label: 'Hotline', value: `${config.contact.hotline} | ${config.contact.personalPhone}` },
                  { icon: Mail, color: 'amber', label: 'Email', value: `${config.contact.email} | ${config.contact.personalEmail}` },
                  { icon: Clock, color: 'purple', label: 'Giờ làm việc', value: config.contact.workHours },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center gap-4 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                      <div className={`w-10 h-10 bg-${item.color}-100 rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Icon size={20} className={`text-${item.color}-600`} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-900">{item.label}</div>
                        <div className="text-sm text-zinc-500">{item.value}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Contact form */}
            <div>
              <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-6 sm:p-8">
                <h4 className="text-lg font-bold text-zinc-900 mb-4">Gửi tin nhắn</h4>
                {contactSent ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 size={32} className="text-emerald-600" />
                    </div>
                    <h5 className="text-lg font-bold text-zinc-900 mb-2">Gửi thành công!</h5>
                    <p className="text-sm text-zinc-500">Chúng tôi sẽ phản hồi trong thời gian sớm nhất.</p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-zinc-600 mb-1.5 block">Họ tên *</label>
                        <input type="text" value={contactForm.name} onChange={e => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" placeholder="Nguyễn Văn A" required />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-zinc-600 mb-1.5 block">Email *</label>
                        <input type="email" value={contactForm.email} onChange={e => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" placeholder="email@example.com" required />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-600 mb-1.5 block">Số điện thoại</label>
                      <input type="tel" value={contactForm.phone} onChange={e => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" placeholder="0393 954 568" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-600 mb-1.5 block">Nội dung *</label>
                      <textarea value={contactForm.message} onChange={e => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                        rows={4} className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all resize-none" placeholder="Nhập nội dung tin nhắn..." required />
                    </div>
                    <button type="submit" className="w-full py-3 bg-[#164396] hover:bg-[#0d2e6b] text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 text-sm">
                      <Send size={16} /> Gửi tin nhắn
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CTA BAR ============ */}
      <section className="bg-[#164396] py-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="text-center lg:text-left">
              <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-2">Sẵn sàng sử dụng hệ thống?</h3>
              <p className="text-sm text-blue-200">Đăng ký miễn phí và bắt đầu lập phương án thi công ngay hôm nay</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button onClick={() => onEnter({ register: true })} className="px-6 py-3.5 bg-white text-[#164396] font-bold rounded-xl hover:bg-blue-50 transition-all shadow-xl text-sm">Đăng ký miễn phí</button>
              <button onClick={() => onEnter()} className="px-6 py-3.5 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-all border border-white/20 text-sm">Đăng nhập</button>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="bg-[#0d2e6b] text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <img src="/logo-square.png" alt="Logo" className="h-10 object-contain mb-4 rounded-lg bg-white p-1" />
              <p className="text-xs text-blue-300 leading-relaxed">Hệ thống lập phương án tổ chức thi công và biện pháp an toàn sửa chữa lưới điện đang mang điện.</p>
            </div>
            <div>
              <h5 className="text-sm font-bold mb-4 text-white">Liên kết nhanh</h5>
              <ul className="space-y-2">
                {SECTIONS.map(s => (
                  <li key={s.id}><button onClick={() => scrollTo(s.id)} className="text-xs text-blue-300 hover:text-white transition-colors flex items-center gap-1.5"><ChevronRight size={10} /> {s.label}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="text-sm font-bold mb-4 text-white">Dịch vụ</h5>
              <ul className="space-y-2">
                {[
                  { label: 'Lập phương án thi công', tab: 'patctc' },
                  { label: 'Quản lý an toàn điện', tab: 'patctc' },
                  { label: 'Xuất tài liệu PDF/Word', tab: 'patctc' },
                  { label: 'Cộng đồng chia sẻ', tab: 'social' },
                  { label: 'Quản trị hệ thống', tab: 'admin' },
                ].map(l => (
                  <li key={l.label}><button onClick={() => onEnter({ tab: l.tab })} className="text-xs text-blue-300 hover:text-white transition-colors flex items-center gap-1.5"><ChevronRight size={10} /> {l.label}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="text-sm font-bold mb-4 text-white">Liên hệ</h5>
              <div className="space-y-3">
                <div className="flex items-start gap-2.5"><MapPin size={14} className="text-cyan-400 mt-0.5 flex-shrink-0" /><span className="text-xs text-blue-300">{config.contact.address}</span></div>
                <div className="flex items-start gap-2.5"><Phone size={14} className="text-cyan-400 mt-0.5 flex-shrink-0" /><span className="text-xs text-blue-300">{config.contact.hotline} | {config.contact.personalPhone}</span></div>
                <div className="flex items-start gap-2.5"><Mail size={14} className="text-cyan-400 mt-0.5 flex-shrink-0" /><span className="text-xs text-blue-300">{config.contact.personalEmail}</span></div>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-blue-400">{config.footerCopyright}</p>
            <p className="text-[10px] text-blue-500">{config.footerDeveloper}</p>
          </div>
        </div>
      </footer>

      {/* ============ BACK TO TOP ============ */}
      {showBackToTop && (
        <button onClick={scrollToTop} className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-[#164396] hover:bg-[#0d2e6b] text-white rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110" title="Về đầu trang">
          <ChevronUp size={22} />
        </button>
      )}

      {/* ============ FLOATING HOTLINE ============ */}
      <a href={`tel:${config.contact.hotline.replace(/\./g, '')}`}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-xl transition-all hover:scale-105 group">
        <Phone size={18} className="animate-pulse" />
        <span className="text-sm font-bold hidden sm:inline">{config.contact.hotline}</span>
      </a>

      {/* ============ SEARCH MODAL ============ */}
      {showSearch && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSearch(false)} />
          <div className="relative w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100">
              <Search size={20} className="text-zinc-400 flex-shrink-0" />
              <input ref={searchInputRef} type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 text-sm bg-transparent outline-none placeholder-zinc-400" placeholder="Tìm kiếm tính năng, tin tức, mục..." />
              <kbd className="hidden sm:inline-block px-2 py-0.5 bg-zinc-100 rounded text-[10px] font-mono text-zinc-400">ESC</kbd>
              <button onClick={() => setShowSearch(false)} className="p-1 hover:bg-zinc-100 rounded-lg"><X size={16} className="text-zinc-400" /></button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {searchQuery.trim() === '' ? (
                <div className="p-5 text-center">
                  <p className="text-xs text-zinc-400">Nhập từ khóa để tìm kiếm</p>
                  <div className="flex flex-wrap gap-2 justify-center mt-3">
                    {['Phương án', 'An toàn', 'PDF', 'Cộng đồng', 'Tài liệu', 'Video'].map(tag => (
                      <button key={tag} onClick={() => setSearchQuery(tag)} className="px-3 py-1 bg-zinc-100 hover:bg-blue-50 hover:text-[#164396] rounded-full text-xs font-medium text-zinc-500 transition-colors">{tag}</button>
                    ))}
                  </div>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-8 text-center"><p className="text-sm text-zinc-400">Không tìm thấy kết quả cho "{searchQuery}"</p></div>
              ) : (
                <div className="p-2">
                  {searchResults.map((item, i) => (
                    <button key={i} onClick={() => { setShowSearch(false); const section = SECTIONS.find(s => s.label === item.title); if (section) scrollTo(section.id); else onEnter({ tab: 'patctc' }); }}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 rounded-xl transition-colors flex items-start gap-3">
                      <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 text-[10px] font-bold rounded mt-0.5 flex-shrink-0">{item.type}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-zinc-900 truncate">{item.title}</div>
                        <div className="text-xs text-zinc-400 truncate">{item.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="px-5 py-2.5 bg-zinc-50 border-t border-zinc-100 flex items-center gap-4 text-[10px] text-zinc-400">
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-zinc-200 rounded font-mono">Ctrl</kbd>+<kbd className="px-1.5 py-0.5 bg-zinc-200 rounded font-mono">K</kbd> mở tìm kiếm</span>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-zinc-200 rounded font-mono">ESC</kbd> đóng</span>
            </div>
          </div>
        </div>
      )}

      {/* ============ IMAGE LIGHTBOX ============ */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
          <button onClick={() => setLightboxImage(null)} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
            <X size={24} className="text-white" />
          </button>
          <img src={lightboxImage} alt="" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" draggable={false} onClick={e => e.stopPropagation()} onError={e => { (e.target as HTMLImageElement).src = ''; }} />
        </div>
      )}

      {/* ============ VIDEO PLAYER MODAL ============ */}
      {playingVideo && (
        <div className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-4" onClick={() => setPlayingVideo(null)}>
          <button onClick={() => setPlayingVideo(null)} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10">
            <X size={24} className="text-white" />
          </button>
          <div className="w-full max-w-4xl aspect-video" onClick={e => e.stopPropagation()}>
            <video src={playingVideo} controls autoPlay className="w-full h-full rounded-2xl shadow-2xl bg-black" />
          </div>
        </div>
      )}
    </div>
  );
};
