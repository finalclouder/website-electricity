import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Loader2, Zap, Eye, EyeOff } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, register, isLoading } = useAuthStore();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegister) {
      if (!name.trim()) { setError('Vui lòng nhập họ tên'); return; }
      if (!email.trim()) { setError('Vui lòng nhập email'); return; }
      if (password.length < 6) { setError('Mật khẩu tối thiểu 6 ký tự'); return; }

      const ok = await register(name, email, password);
      if (!ok) setError('Email đã tồn tại');
    } else {
      if (!email.trim() || !password.trim()) { setError('Vui lòng nhập đầy đủ thông tin'); return; }

      const ok = await login(email, password);
      if (!ok) setError('Email hoặc mật khẩu không đúng');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-4 border border-white/20">
            <Zap size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">PATCTC Generator</h1>
          <p className="text-blue-200 text-sm">Hệ thống lập phương án tổ chức thi công</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-6">
            {isRegister ? 'Tạo tài khoản mới' : 'Đăng nhập'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-1.5 block">Họ tên</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                  placeholder="Nguyễn Văn A"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                placeholder="email@patctc.vn"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-1.5 block">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all pr-12"
                  placeholder="••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300/50 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-400/30 rounded-xl text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              {isLoading ? (
                <><Loader2 size={18} className="animate-spin" /> Đang xử lý...</>
              ) : (
                isRegister ? 'Đăng ký' : 'Đăng nhập'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-sm text-blue-200 hover:text-white transition-colors"
            >
              {isRegister ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
            </button>
          </div>

          {!isRegister && (
            <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10">
              <p className="text-[10px] text-blue-300/70 uppercase tracking-wider mb-1">Tài khoản demo</p>
              <p className="text-xs text-blue-200">Admin: <span className="font-mono">admin@patctc.vn / admin123</span></p>
              <p className="text-xs text-blue-200">User: <span className="font-mono">user@patctc.vn / user123</span></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
