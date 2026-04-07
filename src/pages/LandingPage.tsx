import React, { useState, useEffect } from 'react';
import { Zap, Shield, FileText, Users, ChevronRight, Phone, Mail, MapPin, Clock, ArrowRight, CheckCircle2, BarChart3, Award, Cpu, Menu, X, ChevronLeft } from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
}

// ============ Hero Slides ============
const HERO_SLIDES = [
  {
    title: 'Phương án thi công Hotline',
    subtitle: 'Hệ thống lập phương án tổ chức thi công và biện pháp an toàn sửa chữa lưới điện đang mang điện',
    bg: 'from-blue-800 via-blue-700 to-cyan-600',
  },
  {
    title: 'An toàn là trên hết',
    subtitle: 'Quản lý rủi ro, biện pháp an toàn, trình tự thi công chuyên nghiệp theo quy chuẩn ngành điện',
    bg: 'from-emerald-800 via-emerald-700 to-teal-600',
  },
  {
    title: 'Xuất tài liệu nhanh chóng',
    subtitle: 'Tạo phương án hoàn chỉnh 14 trang, xuất PDF và Word chỉ trong vài phút',
    bg: 'from-indigo-800 via-indigo-700 to-purple-600',
  },
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

// ============ News items ============
const NEWS_ITEMS = [
  {
    title: 'Cập nhật quy trình thi công hotline mới',
    excerpt: 'Áp dụng quy trình mới theo Thông tư của Bộ Công Thương về an toàn điện, có hiệu lực từ quý II/2026.',
    date: '05/04/2026',
    category: 'Thông báo',
    catColor: 'blue',
  },
  {
    title: 'Hướng dẫn sử dụng hệ thống PATCTC Generator',
    excerpt: 'Tài liệu hướng dẫn chi tiết cách lập phương án, quản lý nhân sự và xuất tài liệu trên hệ thống.',
    date: '01/04/2026',
    category: 'Hướng dẫn',
    catColor: 'green',
  },
  {
    title: 'Đội Hotline hoàn thành 150 phương án trong Q1/2026',
    excerpt: 'Tổng kết quý I năm 2026, đội sửa chữa Hotline đã hoàn thành xuất sắc kế hoạch thi công.',
    date: '28/03/2026',
    category: 'Tin tức',
    catColor: 'purple',
  },
];

// ============ Stats ============
const STATS = [
  { value: '500+', label: 'Phương án đã lập' },
  { value: '50+', label: 'Đội thi công' },
  { value: '99.9%', label: 'An toàn thi công' },
  { value: '24/7', label: 'Hỗ trợ kỹ thuật' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);

  // Auto-slide
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const slide = HERO_SLIDES[currentSlide];

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ============ TOP BAR ============ */}
      <div className="bg-[#0d2e6b] text-white text-[11px] py-1.5 px-4 hidden sm:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Phone size={10} /> Hotline: <strong>1900.6769</strong></span>
            <span className="flex items-center gap-1"><Mail size={10} /> contact@patctc.vn</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Clock size={10} /> Thứ 2 - Thứ 6: 7:30 - 17:00</span>
          </div>
        </div>
      </div>

      {/* ============ NAVBAR ============ */}
      <nav className="bg-white border-b border-zinc-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Zap size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-[#164396] leading-tight tracking-tight">PATCTC</h1>
              <p className="text-[9px] text-zinc-400 leading-tight uppercase tracking-widest">Generator System</p>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: 'Trang chủ', active: true },
              { label: 'Giới thiệu' },
              { label: 'Tính năng' },
              { label: 'Tin tức' },
              { label: 'Liên hệ' },
            ].map((item) => (
              <a
                key={item.label}
                href={`#${item.label.toLowerCase().replace(/\s/g, '-')}`}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  item.active
                    ? 'text-[#164396] bg-blue-50'
                    : 'text-zinc-600 hover:text-[#164396] hover:bg-blue-50/50'
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* CTA + Mobile menu */}
          <div className="flex items-center gap-2">
            <button
              onClick={onEnter}
              className="px-5 py-2.5 bg-[#164396] hover:bg-[#0d2e6b] text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20"
            >
              Đăng nhập
            </button>
            <button
              onClick={() => setMobileMenu(!mobileMenu)}
              className="md:hidden p-2 hover:bg-zinc-100 rounded-lg"
            >
              {mobileMenu ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileMenu && (
          <div className="md:hidden border-t border-zinc-100 bg-white px-4 pb-4 space-y-1">
            {['Trang chủ', 'Giới thiệu', 'Tính năng', 'Tin tức', 'Liên hệ'].map(label => (
              <a key={label} href="#" className="block px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-blue-50 hover:text-[#164396] rounded-lg">
                {label}
              </a>
            ))}
          </div>
        )}
      </nav>

      {/* ============ HERO BANNER ============ */}
      <section className={`relative bg-gradient-to-r ${slide.bg} transition-all duration-700 overflow-hidden`}>
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h60v60H0z' fill='none'/%3E%3Ccircle cx='30' cy='30' r='2' fill='white'/%3E%3C/svg%3E")`,
            backgroundSize: '30px 30px'
          }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 py-16 sm:py-24 relative z-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/15 backdrop-blur-sm rounded-full text-white/80 text-xs font-medium mb-6">
              <Zap size={12} /> Hệ thống quản lý phương án thi công
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-4">
              {slide.title}
            </h2>
            <p className="text-base sm:text-lg text-white/80 leading-relaxed mb-8 max-w-xl">
              {slide.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onEnter}
                className="px-6 py-3.5 bg-white text-[#164396] font-bold rounded-xl hover:bg-blue-50 transition-all shadow-xl flex items-center justify-center gap-2 text-sm"
              >
                Bắt đầu sử dụng <ArrowRight size={16} />
              </button>
              <a
                href="#tinh-nang"
                className="px-6 py-3.5 bg-white/10 backdrop-blur-sm text-white font-bold rounded-xl hover:bg-white/20 transition-all border border-white/20 flex items-center justify-center gap-2 text-sm"
              >
                Tìm hiểu thêm <ChevronRight size={16} />
              </a>
            </div>
          </div>
        </div>

        {/* Slide indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-2 rounded-full transition-all ${
                i === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>

        {/* Slide arrows */}
        <button
          onClick={() => setCurrentSlide((currentSlide - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-all hidden sm:flex"
        >
          <ChevronLeft size={20} className="text-white" />
        </button>
        <button
          onClick={() => setCurrentSlide((currentSlide + 1) % HERO_SLIDES.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-all hidden sm:flex"
        >
          <ChevronRight size={20} className="text-white" />
        </button>
      </section>

      {/* ============ STATS BAR ============ */}
      <section className="bg-[#164396] py-6">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl sm:text-3xl font-extrabold text-white">{stat.value}</div>
              <div className="text-xs text-blue-200 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="tinh-nang" className="py-16 sm:py-20 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4">
          {/* Section header */}
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

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="bg-white rounded-2xl border border-zinc-200 p-6 hover:shadow-xl hover:border-blue-200 hover:-translate-y-1 transition-all duration-300 group"
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
      <section className="py-16 sm:py-20 bg-white">
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
                onClick={onEnter}
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
                    { icon: FileText, label: 'PA thi công', value: '500+' },
                    { icon: Users, label: 'Nhân sự', value: '120+' },
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
                  <div className="flex items-center gap-2 text-sm">
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
              {/* Decorative blob */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-cyan-400/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ============ NEWS ============ */}
      <section className="py-16 sm:py-20 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
                <FileText size={12} /> Tin tức & Thông báo
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-900">Tin mới nhất</h3>
            </div>
            <button className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-all">
              Xem tất cả <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {NEWS_ITEMS.map((news, i) => (
              <div key={i} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                {/* Fake image placeholder */}
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
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CONTACT / HOTLINE BAR ============ */}
      <section className="bg-[#164396] py-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="text-center lg:text-left">
              <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-2">
                Bạn cần hỗ trợ kỹ thuật?
              </h3>
              <p className="text-sm text-blue-200">
                Liên hệ đội ngũ hỗ trợ của chúng tôi qua hotline hoặc email
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
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
                <Mail size={20} className="text-cyan-300" />
                <div>
                  <div className="text-[10px] text-blue-200 uppercase tracking-wider">Email</div>
                  <div className="text-sm font-bold text-white">contact@patctc.vn</div>
                </div>
              </div>
              <button
                onClick={onEnter}
                className="px-6 py-3.5 bg-white text-[#164396] font-bold rounded-xl hover:bg-blue-50 transition-all shadow-xl text-sm"
              >
                Đăng nhập ngay
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="bg-[#0d2e6b] text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Col 1: About */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <Zap size={20} className="text-cyan-400" />
                </div>
                <div>
                  <div className="text-base font-extrabold">PATCTC</div>
                  <div className="text-[9px] text-blue-300 uppercase tracking-widest">Generator System</div>
                </div>
              </div>
              <p className="text-xs text-blue-300 leading-relaxed">
                Hệ thống lập phương án tổ chức thi công và biện pháp an toàn sửa chữa lưới điện đang mang điện.
              </p>
            </div>

            {/* Col 2: Links */}
            <div>
              <h5 className="text-sm font-bold mb-4 text-white">Liên kết nhanh</h5>
              <ul className="space-y-2">
                {['Trang chủ', 'Giới thiệu', 'Tính năng', 'Tin tức', 'Liên hệ'].map(l => (
                  <li key={l}>
                    <a href="#" className="text-xs text-blue-300 hover:text-white transition-colors flex items-center gap-1.5">
                      <ChevronRight size={10} /> {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3: Services */}
            <div>
              <h5 className="text-sm font-bold mb-4 text-white">Dịch vụ</h5>
              <ul className="space-y-2">
                {['Lập phương án thi công', 'Quản lý an toàn điện', 'Xuất tài liệu PDF/Word', 'Cộng đồng chia sẻ', 'Quản trị hệ thống'].map(l => (
                  <li key={l}>
                    <a href="#" className="text-xs text-blue-300 hover:text-white transition-colors flex items-center gap-1.5">
                      <ChevronRight size={10} /> {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 4: Contact */}
            <div>
              <h5 className="text-sm font-bold mb-4 text-white">Liên hệ</h5>
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <MapPin size={14} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-blue-300">Thành phố Bắc Ninh, tỉnh Bắc Ninh, Việt Nam</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Phone size={14} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-blue-300">1900.6769</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Mail size={14} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-blue-300">contact@patctc.vn</span>
                </div>
              </div>
            </div>
          </div>

          {/* Copyright */}
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
    </div>
  );
};
