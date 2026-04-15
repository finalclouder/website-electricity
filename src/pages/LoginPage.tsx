import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useLandingStore } from '../store/useLandingStore';
import { Loader2, Zap, Eye, EyeOff, ArrowLeft, Shield, FileText, Users, Mail, Lock, User, CheckCircle2, ChevronRight } from 'lucide-react';

export const LoginPage: React.FC<{ onBackToLanding?: () => void; initialRegister?: boolean }> = ({ onBackToLanding, initialRegister = false }) => {
  const { login, register, isLoading } = useAuthStore();
  const { config } = useLandingStore();
  const [isRegister, setIsRegister] = useState(initialRegister);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [focusedField, setFocusedField] = useState('');

  // Slide animation when switching between login/register
  const [animating, setAnimating] = useState(false);
  const switchMode = () => {
    setAnimating(true);
    setTimeout(() => {
      setIsRegister(!isRegister);
      setError('');
      setSuccess('');
      setAnimating(false);
    }, 150);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isRegister) {
      if (!name.trim()) { setError('Vui lòng nhập họ tên'); return; }
      if (!email.trim()) { setError('Vui lòng nhập email'); return; }
      if (password.length < 6) { setError('Mật khẩu tối thiểu 6 ký tự'); return; }

      const res = await register(name, email, password);
      if (!res.ok) {
        setError(res.error || 'Email đã tồn tại');
      } else {
        if (res.error) {
          // This means they are pending approval (we smuggled message via error prop)
          alert(res.error);
          setIsRegister(false); // Switch to login
        } else {
          setSuccess('Đăng ký thành công!');
        }
      }
    } else {
      if (!email.trim() || !password.trim()) { setError('Vui lòng nhập đầy đủ thông tin'); return; }

      const res = await login(email, password);
      if (!res.ok) setError(res.error || 'Email hoặc mật khẩu không đúng');
    }
  };

  

  const features = [
    { icon: FileText, text: 'Lập phương án thi công' },
    { icon: Shield, text: 'Quản lý an toàn điện' },
    { icon: Users, text: 'Cộng đồng chia sẻ' },
  ];

  return (
    <div className="min-h-screen flex relative overflow-hidden">

      {/* ============ LEFT SIDE - Branding & Info ============ */}
      <div className="hidden lg:flex lg:w-[55%] bg-gradient-to-br from-[#0d2e6b] via-[#164396] to-[#1e56b0] relative overflow-hidden flex-col justify-between p-12">
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
          <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-blue-300/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '4s' }} />
          {/* Dot pattern */}
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }} />
          {/* Power line silhouette SVG */}
          <svg className="absolute bottom-0 left-0 right-0 h-48 text-white/[0.03]" viewBox="0 0 800 200" preserveAspectRatio="none">
            <path d="M0 200 L100 120 L200 140 L300 80 L400 100 L500 60 L600 90 L700 50 L800 70 L800 200 Z" fill="currentColor" />
          </svg>
        </div>

        {/* Top - Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <img src="/logo-square.png" alt="Logo" className="w-16 h-16 object-contain rounded-full border border-white/30 shadow-lg bg-white p-1.5" />
          </div>
        </div>

        {/* Middle - Main message */}
        <div className="relative z-10 -mt-8">
          <h2 className="text-4xl xl:text-5xl font-black text-white leading-[1.15] mb-6">
            Hệ thống lập<br />
            phương án<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-200">thi công Hotline</span>
          </h2>
          <p className="text-blue-200/80 text-base leading-relaxed max-w-md mb-10">
            Số hóa quy trình lập phương án tổ chức thi công và biện pháp an toàn sửa chữa lưới điện đang mang điện.
          </p>

          {/* Feature pills */}
          <div className="space-y-3">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="flex items-center gap-3 group">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 group-hover:bg-white/20 transition-all">
                    <Icon size={18} className="text-cyan-300" />
                  </div>
                  <span className="text-sm text-white/80 font-medium group-hover:text-white transition-colors">{f.text}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom - Credits */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-blue-300/50 text-xs">
            <span>{config.bannerText}</span>
          </div>
        </div>
      </div>

      {/* ============ RIGHT SIDE - Auth Form ============ */}
      <div className="flex-1 bg-zinc-50 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <div className="lg:hidden bg-[#164396] px-4 py-3 flex items-center justify-between">
          {onBackToLanding ? (
            <button onClick={onBackToLanding} className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
              <ArrowLeft size={18} />
              <span className="text-sm font-medium">Trang chủ</span>
            </button>
          ) : <div />}
          <img src="/logo-square.png" alt="Logo" className="w-8 h-8 object-contain rounded-full bg-white shadow-sm p-1" />
        </div>

        {/* Desktop back button */}
        {onBackToLanding && (
          <div className="hidden lg:block absolute top-6 right-6 z-10">
            <button
              onClick={onBackToLanding}
              className="flex items-center gap-2 px-4 py-2 text-zinc-500 hover:text-[#164396] hover:bg-blue-50 rounded-xl transition-all text-sm font-medium"
            >
              <ArrowLeft size={16} />
              Về trang chủ
            </button>
          </div>
        )}

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12">
          <div className={`w-full max-w-[420px] transition-all duration-150 ${animating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>

            {/* Header */}
            <div className="mb-8">
              
              <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 text-center lg:text-left">
                {isRegister ? 'Tạo tài khoản' : 'Chào mừng trở lại'}
              </h2>
              <p className="text-sm text-zinc-400 mt-2 text-center lg:text-left">
                {isRegister
                  ? 'Đăng ký để bắt đầu sử dụng hệ thống'
                  : 'Đăng nhập vào hệ thống PATCTC Generator'
                }
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-1.5 block">Họ tên</label>
                  <div className={`relative rounded-xl border-2 transition-all ${focusedField === 'name' ? 'border-[#164396] shadow-lg shadow-blue-500/10' : 'border-zinc-200'}`}>
                    <User size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${focusedField === 'name' ? 'text-[#164396]' : 'text-zinc-300'}`} />
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField('')}
                      className="w-full pl-12 pr-4 py-3.5 bg-white rounded-xl text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none"
                      placeholder="Nguyễn Văn A"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-1.5 block">Email</label>
                <div className={`relative rounded-xl border-2 transition-all ${focusedField === 'email' ? 'border-[#164396] shadow-lg shadow-blue-500/10' : 'border-zinc-200'}`}>
                  <Mail size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${focusedField === 'email' ? 'text-[#164396]' : 'text-zinc-300'}`} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField('')}
                    className="w-full pl-12 pr-4 py-3.5 bg-white rounded-xl text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none"
                    placeholder="email@patctc.vn"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-1.5 block">Mật khẩu</label>
                <div className={`relative rounded-xl border-2 transition-all ${focusedField === 'password' ? 'border-[#164396] shadow-lg shadow-blue-500/10' : 'border-zinc-200'}`}>
                  <Lock size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${focusedField === 'password' ? 'text-[#164396]' : 'text-zinc-300'}`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField('')}
                    className="w-full pl-12 pr-12 py-3.5 bg-white rounded-xl text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {isRegister && (
                  <p className="text-[11px] text-zinc-400 mt-1.5 ml-1">Mật khẩu tối thiểu 6 ký tự</p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-red-500 text-sm font-bold">!</span>
                  </div>
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              )}

              {/* Success */}
              {success && (
                <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                  <p className="text-sm text-emerald-600 font-medium">{success}</p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-[#164396] to-[#1e56b0] hover:from-[#0d2e6b] hover:to-[#164396] text-white font-bold rounded-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 hover:shadow-blue-500/30 text-sm"
              >
                {isLoading ? (
                  <><Loader2 size={18} className="animate-spin" /> Đang xử lý...</>
                ) : (
                  <>
                    {isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-zinc-200" />
              <span className="text-xs text-zinc-400 font-medium">hoặc</span>
              <div className="flex-1 h-px bg-zinc-200" />
            </div>

            {/* Switch mode */}
            <button
              onClick={switchMode}
              className="w-full py-3.5 bg-white border-2 border-zinc-200 hover:border-[#164396] text-zinc-700 hover:text-[#164396] font-semibold rounded-xl transition-all text-sm"
            >
              {isRegister ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký miễn phí'}
            </button>

            
          </div>
        </div>

        {/* Bottom bar */}
        <div className="px-4 py-3 text-center border-t border-zinc-100">
          <p className="text-[11px] text-zinc-400">{config.footerCopyright}</p>
        </div>
      </div>
    </div>
  );
};
