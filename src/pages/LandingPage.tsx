import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, Shield, FileText, Users, ChevronRight, Phone, Mail, MapPin, Clock, ArrowRight, CheckCircle2, BarChart3, Award, Cpu, Menu, X, ChevronLeft, Search, Globe, MessageSquare, PlusCircle, ClipboardList, BookOpen, ArrowUp, Send, User, ChevronUp } from 'lucide-react';
import { useSocialStore } from '../store/useSocialStore';
import { useAuthStore } from '../store/useAuthStore';

interface LandingPageProps {
  onEnter: (options?: { tab?: string; register?: boolean }) => void;
}

// ============ Section IDs for scroll spy ============
const SECTIONS = [
  { id: 'trang-chu', label: 'Trang chủ' },
  { id: 'gioi-thieu', label: 'Giới thiệu' },
  { id: 'tin-tuc', label: 'Tin tức' },
  { id: 'mau-phuong-an', label: 'Mẫu phương án TCTCBPAT' },
  { id: 'lien-he', label: 'Liên hệ' },
];

// ============ Hero Slides ============
const HERO_SLIDES = [
  {
    badge: 'TIN NỔI BẬT',
    badgeColor: 'bg-red-600',
    title: 'EVNNPC: Đảm bảo cung cấp điện an toàn, ổn định trong mùa nắng nóng 2026',
    subtitle: 'Tổng công ty Điện lực miền Bắc đã chủ động triển khai nhiều giải pháp kỹ thuật và vận hành để đáp ứng nhu cầu phụ tải tăng cao.',
    bg: 'linear-gradient(135deg, rgba(13,46,107,0.7) 0%, rgba(22,67,150,0.5) 100%)',
    image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1600&q=80',
  },
  {
    badge: 'AN TOÀN ĐIỆN',
    badgeColor: 'bg-emerald-600',
    title: 'Nâng cao công tác an toàn trong sửa chữa lưới điện đang mang điện',
    subtitle: 'Áp dụng quy trình thi công hotline theo tiêu chuẩn quốc tế, đảm bảo an toàn tuyệt đối cho người lao động.',
    bg: 'linear-gradient(135deg, rgba(5,46,22,0.7) 0%, rgba(22,101,52,0.5) 100%)',
    image: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1600&q=80',
  },
  {
    badge: 'CÔNG NGHỆ',
    badgeColor: 'bg-blue-600',
    title: 'Số hóa phương án thi công - Xuất tài liệu nhanh chóng, chính xác',
    subtitle: 'Hệ thống PATCTC Generator giúp tạo phương án hoàn chỉnh 14 trang, xuất PDF và Word chỉ trong vài phút.',
    bg: 'linear-gradient(135deg, rgba(30,27,75,0.7) 0%, rgba(67,56,202,0.5) 100%)',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1600&q=80',
  },
];

// ============ Quick Actions (NPC-style icon bar) ============
const QUICK_ACTIONS = [
  { icon: Zap, label: 'Đăng tin', color: 'bg-blue-500', hoverColor: 'hover:bg-blue-600', tab: 'social' },
  { icon: PlusCircle, label: 'Lập phương án mới', color: 'bg-red-500', hoverColor: 'hover:bg-red-600', tab: 'patctc' },
  { icon: ClipboardList, label: 'Mẫu PA TCTCBPAT', color: 'bg-green-600', hoverColor: 'hover:bg-green-700', tab: 'documents' },
  { icon: Users, label: 'Cộng đồng', color: 'bg-amber-500', hoverColor: 'hover:bg-amber-600', tab: 'social' },
  { icon: BookOpen, label: 'Tài liệu', color: 'bg-slate-700', hoverColor: 'hover:bg-slate-800', tab: 'documents' },
  { icon: MessageSquare, label: 'Hỗ trợ trực tuyến', color: 'bg-indigo-600', hoverColor: 'hover:bg-indigo-700', tab: 'social' },
];

// ============ Features ============
const FEATURES = [
  {
    icon: FileText,
    title: 'Lập phương án tự động',
    desc: 'Soạn thảo phương án thi công hotline đầy đủ 14 trang với giao diện trực quan, xem trước WYSIWYG.',
    color: 'blue',
  },
  {
    icon: Shield,
    title: 'Quản lý an toàn',
    desc: 'Nhận diện rủi ro, biện pháp an toàn, trình tự thi công theo đúng quy chuẩn ngành điện lực.',
    color: 'emerald',
  },
  {
    icon: Users,
    title: 'Cộng đồng chia sẻ',
    desc: 'Trao đổi kinh nghiệm, chia sẻ phương án, bình luận và tương tác giữa các đội hotline.',
    color: 'purple',
  },
  {
    icon: BarChart3,
    title: 'Quản trị hệ thống',
    desc: 'Quản lý người dùng, phân quyền, theo dõi hoạt động và thống kê tài liệu toàn hệ thống.',
    color: 'amber',
  },
  {
    icon: Cpu,
    title: 'Xuất PDF & Word',
    desc: 'Xuất phương án hoàn chỉnh dạng PDF hoặc DOCX, sẵn sàng in ấn và nộp phê duyệt.',
    color: 'rose',
  },
  {
    icon: Award,
    title: 'Lưu trữ & tra cứu',
    desc: 'Lưu trữ tất cả phương án, xem trước chi tiết, tải về và chỉnh sửa lại bất cứ lúc nào.',
    color: 'cyan',
  },
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
      // ease out quad
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

  const searchInputRef = useRef<HTMLInputElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

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

  // Dynamic news from social posts (latest 3 announcements or fallback)
  const dynamicNews = posts.slice(0, 3).map(p => {
    const date = new Date(p.createdAt);
    const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
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
      ...cat,
    };
  });

  // Fallback news if no posts
  const NEWS_ITEMS = dynamicNews.length > 0 ? dynamicNews : [
    { title: 'Cập nhật quy trình thi công hotline mới', excerpt: 'Áp dụng quy trình mới theo Thông tư của Bộ Công Thương về an toàn điện.', date: '05/04/2026', category: 'Thông báo', catColor: 'blue', authorName: '', likes: 0, comments: 0 },
    { title: 'Hướng dẫn sử dụng hệ thống PATCTC Generator', excerpt: 'Tài liệu hướng dẫn chi tiết cách lập phương án trên hệ thống.', date: '01/04/2026', category: 'Hướng dẫn', catColor: 'green', authorName: '', likes: 0, comments: 0 },
    { title: 'Đội Hotline hoàn thành 150 phương án trong Q1/2026', excerpt: 'Tổng kết quý I năm 2026, đội sửa chữa Hotline đã hoàn thành xuất sắc kế hoạch.', date: '28/03/2026', category: 'Tin tức', catColor: 'purple', authorName: '', likes: 0, comments: 0 },
  ];

  // ===== Search logic =====
  const allSearchable = [
    ...FEATURES.map(f => ({ type: 'Tính năng', title: f.title, desc: f.desc })),
    ...NEWS_ITEMS.map(n => ({ type: 'Tin tức', title: n.title, desc: n.excerpt })),
    ...SECTIONS.map(s => ({ type: 'Mục', title: s.label, desc: `Chuyển đến mục ${s.label}` })),
    { type: 'Chức năng', title: 'Đăng tin lên cộng đồng', desc: 'Chia sẻ bài viết, kinh nghiệm với các thành viên' },
    { type: 'Chức năng', title: 'Lập phương án thi công mới', desc: 'Tạo PA TCTC hotline mới với 14 trang đầy đủ' },
    { type: 'Chức năng', title: 'Quản lý tài liệu đã lưu', desc: 'Xem, tải, chỉnh sửa phương án đã lưu trước đó' },
    { type: 'Chức năng', title: 'Xuất PDF / Word', desc: 'Xuất phương án hoàn chỉnh ra file PDF hoặc DOCX' },
  ];

  const searchResults = searchQuery.trim()
    ? allSearchable.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.desc.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // ===== Auto-slide =====
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // ===== Scroll spy (IntersectionObserver) =====
  useEffect(() => {
    const sectionEls = SECTIONS.map(s => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (sectionEls.length === 0) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );

    sectionEls.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // ===== Stats counter trigger =====
  useEffect(() => {
    if (!statsRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  // ===== Back-to-top visibility =====
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ===== Focus search input when modal opens =====
  useEffect(() => {
    if (showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
    }
  }, [showSearch]);

  // ===== Keyboard shortcut: Ctrl+K for search =====
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ===== Smooth scroll =====
  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setMobileMenu(false);
    }
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ===== Contact form =====
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) return;
    // Simulate sending
    setContactSent(true);
    setTimeout(() => {
      setContactSent(false);
      setContactForm({ name: '', email: '', phone: '', message: '' });
    }, 3000);
  };

  const slide = HERO_SLIDES[currentSlide];

  return (
    <div ref={pageRef} className="min-h-screen bg-white flex flex-col">

      {/* ============ TOP BANNER ============ */}
      <div className="bg-[#164396] text-white text-center py-2 px-4">
        <h1 className="text-sm sm:text-base font-bold tracking-wide">
          Đội Sửa chữa Hotline - Công ty Điện lực Bắc Ninh
        </h1>
      </div>

      {/* ============ UTILITY BAR ============ */}
      <div className="bg-[#0d2e6b] text-white text-[11px] py-1.5 px-4 hidden sm:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Phone size={10} /> Hotline: <strong>1900.6769</strong></span>
            <span className="flex items-center gap-1"><Mail size={10} /> Email: info@npc.com.vn</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 cursor-pointer hover:text-cyan-300 transition-colors"><Globe size={10} /> English</span>
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-1 cursor-pointer hover:text-cyan-300 transition-colors"
            >
              <Search size={10} /> Tìm kiếm
            </button>
          </div>
        </div>
      </div>

      {/* ============ NAVBAR ============ */}
      <nav className="bg-white border-b border-zinc-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16 sm:h-[72px]">
          {/* Logo */}
          <button onClick={scrollToTop} className="flex items-center gap-3 cursor-pointer">
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-black text-[#164396] leading-tight tracking-tight">EVNNPC</h1>
              <p className="text-[8px] sm:text-[9px] text-zinc-400 leading-tight uppercase tracking-[0.15em]">Tổng Công ty Điện lực miền Bắc</p>
            </div>
          </button>

          {/* Desktop Nav with scroll spy */}
          <div className="hidden lg:flex items-center gap-0">
            {SECTIONS.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`px-4 py-2.5 text-sm font-semibold transition-all relative ${
                  activeSection === item.id
                    ? 'text-[#164396]'
                    : 'text-zinc-600 hover:text-[#164396]'
                }`}
              >
                {item.label}
                {activeSection === item.id && (
                  <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-[#164396] rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Auth + Search + Mobile */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(true)}
              className="hidden sm:flex lg:hidden p-2 hover:bg-zinc-100 rounded-lg text-zinc-500"
              title="Tìm kiếm (Ctrl+K)"
            >
              <Search size={18} />
            </button>
            <button
              onClick={() => onEnter()}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-zinc-600 hover:text-[#164396] transition-colors"
            >
              <User size={16} />
              Đăng nhập
            </button>
            <button
              onClick={() => onEnter({ register: true })}
              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-red-500/20"
            >
              Đăng ký
            </button>
            <button
              onClick={() => setMobileMenu(!mobileMenu)}
              className="lg:hidden p-2 hover:bg-zinc-100 rounded-lg ml-1"
            >
              {mobileMenu ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileMenu && (
          <div className="lg:hidden border-t border-zinc-100 bg-white px-4 pb-4 space-y-1 shadow-lg">
            {SECTIONS.map(item => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`block w-full text-left px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  activeSection === item.id
                    ? 'bg-blue-50 text-[#164396]'
                    : 'text-zinc-600 hover:bg-blue-50 hover:text-[#164396]'
                }`}
              >
                {item.label}
              </button>
            ))}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setMobileMenu(false); onEnter(); }}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-[#164396] bg-blue-50 rounded-lg"
              >
                Đăng nhập
              </button>
              <button
                onClick={() => { setMobileMenu(false); setShowSearch(true); }}
                className="px-3 py-2.5 bg-zinc-100 rounded-lg"
              >
                <Search size={16} className="text-zinc-500" />
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ============ HERO BANNER ============ */}
      <section id="trang-chu" className="relative overflow-hidden" style={{ minHeight: '420px' }}>
        {/* Background image with crossfade */}
        {HERO_SLIDES.map((s, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-1000"
            style={{
              backgroundImage: `url("${s.image}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: i === currentSlide ? 1 : 0,
            }}
          />
        ))}
        {/* Dark overlay */}
        <div
          className="absolute inset-0 transition-all duration-700"
          style={{ background: slide.bg }}
        />

        <div className="max-w-7xl mx-auto px-4 py-16 sm:py-20 lg:py-24 relative z-10">
          <div className="max-w-2xl">
            <span className={`inline-block px-3 py-1 ${slide.badgeColor} text-white text-[11px] font-bold uppercase tracking-wider rounded mb-5 animate-pulse`}>
              {slide.badge}
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-[42px] font-black text-white leading-tight mb-4">
              {slide.title}
            </h2>
            <p className="text-sm sm:text-base text-white/80 leading-relaxed mb-8 max-w-xl">
              {slide.subtitle}
            </p>
            <button
              onClick={() => onEnter()}
              className="px-6 py-3 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-full hover:bg-white hover:text-[#164396] transition-all border border-white/30 flex items-center gap-2 text-sm group"
            >
              Xem chi tiết <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Slide indicators */}
        <div className="absolute bottom-6 right-8 flex gap-2 z-10">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-3 h-3 rounded-full transition-all border-2 ${
                i === currentSlide
                  ? 'bg-white border-white'
                  : 'bg-transparent border-white/50 hover:border-white'
              }`}
            />
          ))}
        </div>

        {/* Slide arrows */}
        <button
          onClick={() => setCurrentSlide((currentSlide - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-sm transition-all hidden sm:flex"
        >
          <ChevronLeft size={20} className="text-white" />
        </button>
        <button
          onClick={() => setCurrentSlide((currentSlide + 1) % HERO_SLIDES.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-sm transition-all hidden sm:flex"
        >
          <ChevronRight size={20} className="text-white" />
        </button>
      </section>

      {/* ============ QUICK ACTIONS BAR ============ */}
      <section className="relative z-20 -mt-10 sm:-mt-12 pb-4">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-100 p-3 sm:p-4">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={() => onEnter({ tab: action.tab })}
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

      {/* ============ STATS BAR (animated counters) ============ */}
      <section className="bg-[#164396] py-6" ref={statsRef}>
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS_DATA.map((stat, i) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl sm:text-3xl font-extrabold text-white">
                {statValues[i]}{stat.suffix}
              </div>
              <div className="text-xs text-blue-200 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="mau-phuong-an" className="py-16 sm:py-20 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-[#164396] rounded-full text-xs font-bold uppercase tracking-wider mb-4">
              <Cpu size={12} /> Tính năng nổi bật
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 mb-3">
              Giải pháp toàn diện cho thi công Hotline
            </h3>
            <p className="text-sm text-zinc-500 max-w-2xl mx-auto">
              Hệ thống cung cấp đầy đủ công cụ để lập phương án, quản lý an toàn và chia sẻ kinh nghiệm trong công tác sửa chữa lưới điện đang mang điện.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="bg-white rounded-2xl border border-zinc-200 p-6 hover:shadow-xl hover:border-blue-200 hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
                  onClick={() => onEnter({ tab: 'patctc' })}
                >
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

      {/* ============ ABOUT / CTA SECTION ============ */}
      <section id="gioi-thieu" className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                <Shield size={12} /> Về chúng tôi
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 mb-4 leading-tight">
                Đội Sửa chữa Hotline<br />
                <span className="text-[#164396]">Công ty Điện lực Bắc Ninh</span>
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed mb-6">
                Chúng tôi chuyên thực hiện công tác sửa chữa, bảo dưỡng lưới điện trung áp đang mang điện bằng phương pháp hotline. Với đội ngũ kỹ sư và công nhân lành nghề, chúng tôi cam kết đảm bảo an toàn tuyệt đối trong mọi hoạt động thi công.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Thi công hotline trên lưới điện 22kV & 35kV',
                  'Đội ngũ được đào tạo chuyên sâu về an toàn điện',
                  'Trang thiết bị hiện đại, đạt tiêu chuẩn quốc tế',
                  'Hệ thống quản lý phương án số hóa hoàn toàn',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-zinc-700">
                    <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => onEnter({ tab: 'patctc' })}
                className="px-6 py-3 bg-[#164396] hover:bg-[#0d2e6b] text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 text-sm"
              >
                Truy cập hệ thống <ArrowRight size={16} />
              </button>
            </div>

            {/* Visual card */}
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-2xl">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {[
                    { icon: FileText, label: 'PA thi công', value: `${Math.max(totalDocs, 500)}+` },
                    { icon: Users, label: 'Thành viên', value: `${Math.max(totalUsers, 50)}+` },
                    { icon: Shield, label: 'An toàn', value: '99.9%' },
                    { icon: Award, label: 'Kinh nghiệm', value: '10+ năm' },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                        <Icon size={20} className="mx-auto mb-2 text-blue-200" />
                        <div className="text-xl font-extrabold">{item.value}</div>
                        <div className="text-[10px] text-blue-200 uppercase tracking-wider">{item.label}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="text-xs text-blue-200 mb-2 uppercase tracking-wider font-bold">Quy trình</div>
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <span className="px-2 py-1 bg-white/20 rounded-lg text-[11px] font-bold">Lập PA</span>
                    <ChevronRight size={14} className="text-blue-300" />
                    <span className="px-2 py-1 bg-white/20 rounded-lg text-[11px] font-bold">Duyệt</span>
                    <ChevronRight size={14} className="text-blue-300" />
                    <span className="px-2 py-1 bg-white/20 rounded-lg text-[11px] font-bold">Thi công</span>
                    <ChevronRight size={14} className="text-blue-300" />
                    <span className="px-2 py-1 bg-white/20 rounded-lg text-[11px] font-bold">Nghiệm thu</span>
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-cyan-400/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ============ NEWS (dynamic from social posts) ============ */}
      <section id="tin-tuc" className="py-16 sm:py-20 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
                <FileText size={12} /> Tin tức & Thông báo
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-900">Tin mới nhất</h3>
              {totalPosts > 0 && (
                <p className="text-xs text-zinc-400 mt-1">{totalPosts} bài viết từ cộng đồng</p>
              )}
            </div>
            <button
              onClick={() => onEnter({ tab: 'social' })}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-all"
            >
              Xem tất cả <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {NEWS_ITEMS.map((news, i) => (
              <div
                key={i}
                onClick={() => onEnter({ tab: 'social' })}
                className="bg-white rounded-2xl border border-zinc-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
              >
                <div className={`h-40 bg-gradient-to-br ${
                  i === 0 ? 'from-blue-500 to-blue-700' : i === 1 ? 'from-emerald-500 to-emerald-700' : 'from-purple-500 to-purple-700'
                } flex items-center justify-center relative overflow-hidden`}>
                  <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0v40M0 20h40' stroke='white' stroke-width='0.5'/%3E%3C/svg%3E")`,
                    backgroundSize: '20px 20px'
                  }} />
                  <Zap size={40} className="text-white/30" />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-0.5 bg-${news.catColor}-100 text-${news.catColor}-700 text-[10px] font-bold uppercase rounded-full`}>
                      {news.category}
                    </span>
                    <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                      <Clock size={10} /> {news.date}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900 mb-2 group-hover:text-[#164396] transition-colors line-clamp-2">
                    {news.title}
                  </h4>
                  <p className="text-xs text-zinc-500 leading-relaxed line-clamp-3">{news.excerpt}</p>
                  {(news.authorName || news.likes > 0 || news.comments > 0) && (
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-zinc-100">
                      {news.authorName && (
                        <span className="text-[10px] text-zinc-400">{news.authorName}</span>
                      )}
                      <div className="flex items-center gap-2 ml-auto">
                        {news.likes > 0 && (
                          <span className="text-[10px] text-zinc-400">{news.likes} thích</span>
                        )}
                        {news.comments > 0 && (
                          <span className="text-[10px] text-zinc-400">{news.comments} bình luận</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile "Xem tất cả" button */}
          <button
            onClick={() => onEnter({ tab: 'social' })}
            className="sm:hidden w-full mt-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-600 flex items-center justify-center gap-1.5"
          >
            Xem tất cả tin tức <ChevronRight size={14} />
          </button>
        </div>
      </section>

      {/* ============ CONTACT SECTION ============ */}
      <section id="lien-he" className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact info */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-[#164396] rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                <Phone size={12} /> Liên hệ
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 mb-4">
                Liên hệ với chúng tôi
              </h3>
              <p className="text-sm text-zinc-500 mb-8">
                Nếu bạn cần hỗ trợ kỹ thuật hoặc có thắc mắc, hãy liên hệ với chúng tôi qua các kênh bên dưới.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin size={20} className="text-[#164396]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-900">Địa chỉ</div>
                    <div className="text-sm text-zinc-500">Thành phố Bắc Ninh, tỉnh Bắc Ninh, Việt Nam</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone size={20} className="text-green-600" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-900">Hotline</div>
                    <div className="text-sm text-zinc-500">1900.6769 | 0393.954.568</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Mail size={20} className="text-amber-600" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-900">Email</div>
                    <div className="text-sm text-zinc-500">contact@patctc.vn | dungdong333@gmail.com</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-900">Giờ làm việc</div>
                    <div className="text-sm text-zinc-500">Thứ 2 - Thứ 6: 7:30 - 17:00</div>
                  </div>
                </div>
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
                        <input
                          type="text"
                          value={contactForm.name}
                          onChange={e => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                          placeholder="Nguyễn Văn A"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-zinc-600 mb-1.5 block">Email *</label>
                        <input
                          type="email"
                          value={contactForm.email}
                          onChange={e => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                          placeholder="email@example.com"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-600 mb-1.5 block">Số điện thoại</label>
                      <input
                        type="tel"
                        value={contactForm.phone}
                        onChange={e => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        placeholder="0393 954 568"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-600 mb-1.5 block">Nội dung *</label>
                      <textarea
                        value={contactForm.message}
                        onChange={e => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                        rows={4}
                        className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all resize-none"
                        placeholder="Nhập nội dung tin nhắn..."
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-[#164396] hover:bg-[#0d2e6b] text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 text-sm"
                    >
                      <Send size={16} /> Gửi tin nhắn
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOTLINE BAR ============ */}
      <section className="bg-[#164396] py-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="text-center lg:text-left">
              <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-2">
                Sẵn sàng sử dụng hệ thống?
              </h3>
              <p className="text-sm text-blue-200">
                Đăng ký miễn phí và bắt đầu lập phương án thi công ngay hôm nay
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
                <Phone size={20} className="text-cyan-300" />
                <div>
                  <div className="text-[10px] text-blue-200 uppercase tracking-wider">Hotline</div>
                  <div className="text-lg font-extrabold text-white">1900.6769</div>
                </div>
              </div>
              <button
                onClick={() => onEnter({ register: true })}
                className="px-6 py-3.5 bg-white text-[#164396] font-bold rounded-xl hover:bg-blue-50 transition-all shadow-xl text-sm"
              >
                Đăng ký miễn phí
              </button>
              <button
                onClick={() => onEnter()}
                className="px-6 py-3.5 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-all border border-white/20 text-sm"
              >
                Đăng nhập
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="bg-[#0d2e6b] text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div>
                  <div className="text-lg font-black">EVNNPC</div>
                  <div className="text-[9px] text-blue-300 uppercase tracking-widest">Tổng Công ty Điện lực miền Bắc</div>
                </div>
              </div>
              <p className="text-xs text-blue-300 leading-relaxed">
                Hệ thống lập phương án tổ chức thi công và biện pháp an toàn sửa chữa lưới điện đang mang điện.
              </p>
            </div>

            <div>
              <h5 className="text-sm font-bold mb-4 text-white">Liên kết nhanh</h5>
              <ul className="space-y-2">
                {SECTIONS.map(s => (
                  <li key={s.id}>
                    <button
                      onClick={() => scrollTo(s.id)}
                      className="text-xs text-blue-300 hover:text-white transition-colors flex items-center gap-1.5"
                    >
                      <ChevronRight size={10} /> {s.label}
                    </button>
                  </li>
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
                  <li key={l.label}>
                    <button
                      onClick={() => onEnter({ tab: l.tab })}
                      className="text-xs text-blue-300 hover:text-white transition-colors flex items-center gap-1.5"
                    >
                      <ChevronRight size={10} /> {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="text-sm font-bold mb-4 text-white">Liên hệ</h5>
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <MapPin size={14} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-blue-300">Thành phố Bắc Ninh, tỉnh Bắc Ninh, Việt Nam</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Phone size={14} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-blue-300">1900.6769 | 0393.954.568</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Mail size={14} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-blue-300">dungdong333@gmail.com</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-blue-400">
              &copy; 2026 PATCTC Generator. Đội Sửa chữa Hotline - Công ty Điện lực Bắc Ninh.
            </p>
            <p className="text-[10px] text-blue-500">
              Phát triển bởi DungDT293
            </p>
          </div>
        </div>
      </footer>

      {/* ============ BACK TO TOP BUTTON ============ */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-[#164396] hover:bg-[#0d2e6b] text-white rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 animate-fade-in"
          title="Về đầu trang"
        >
          <ChevronUp size={22} />
        </button>
      )}

      {/* ============ SEARCH MODAL ============ */}
      {showSearch && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSearch(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Search input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100">
              <Search size={20} className="text-zinc-400 flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 text-sm bg-transparent outline-none placeholder-zinc-400"
                placeholder="Tìm kiếm tính năng, tin tức, mục..."
              />
              <kbd className="hidden sm:inline-block px-2 py-0.5 bg-zinc-100 rounded text-[10px] font-mono text-zinc-400">
                ESC
              </kbd>
              <button onClick={() => setShowSearch(false)} className="p-1 hover:bg-zinc-100 rounded-lg">
                <X size={16} className="text-zinc-400" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto">
              {searchQuery.trim() === '' ? (
                <div className="p-5 text-center">
                  <p className="text-xs text-zinc-400">Nhập từ khóa để tìm kiếm</p>
                  <div className="flex flex-wrap gap-2 justify-center mt-3">
                    {['Phương án', 'An toàn', 'PDF', 'Cộng đồng', 'Tài liệu'].map(tag => (
                      <button
                        key={tag}
                        onClick={() => setSearchQuery(tag)}
                        className="px-3 py-1 bg-zinc-100 hover:bg-blue-50 hover:text-[#164396] rounded-full text-xs font-medium text-zinc-500 transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-zinc-400">Không tìm thấy kết quả cho "{searchQuery}"</p>
                </div>
              ) : (
                <div className="p-2">
                  {searchResults.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setShowSearch(false);
                        // If it's a section, scroll to it
                        const section = SECTIONS.find(s => s.label === item.title);
                        if (section) {
                          scrollTo(section.id);
                        } else {
                          onEnter({ tab: 'patctc' });
                        }
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 rounded-xl transition-colors flex items-start gap-3"
                    >
                      <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 text-[10px] font-bold rounded mt-0.5 flex-shrink-0">
                        {item.type}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-zinc-900 truncate">{item.title}</div>
                        <div className="text-xs text-zinc-400 truncate">{item.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="px-5 py-2.5 bg-zinc-50 border-t border-zinc-100 flex items-center gap-4 text-[10px] text-zinc-400">
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-zinc-200 rounded font-mono">Ctrl</kbd>+<kbd className="px-1.5 py-0.5 bg-zinc-200 rounded font-mono">K</kbd> mở tìm kiếm</span>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-zinc-200 rounded font-mono">ESC</kbd> đóng</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
