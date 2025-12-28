import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import PasswordInput from '../components/PasswordInput';
import { motion } from 'framer-motion';
import { ArrowRight, Image as ImageIcon } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || '凭据无效，请重新核对');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Left side: Artistic Branding with Local Image */}
      <div className="hidden lg:flex relative bg-zinc-900 items-center justify-center overflow-hidden p-24">
        <motion.div 
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 z-0 opacity-40"
        >
          <img 
            src="/assets/login-bg.jpg"
            alt="Artistic background" 
            className="w-full h-full object-cover grayscale"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=2070&auto=format&fit=crop";
            }}
          />
        </motion.div>

        <div className="relative z-10 text-white space-y-6 max-w-md">
          <ImageIcon className="w-12 h-12 stroke-[1px]" />
          <h1 className="text-5xl font-serif leading-tight tracking-tighter">
            探索视觉的 <br />
            无限可能
          </h1>
          <p className="text-lg font-light text-white tracking-wide leading-relaxed">
            私有的图像典藏库，为您珍藏每一刻。
          </p>
        </div>

        <div className="absolute bottom-12 left-12 text-[10px] text-white tracking-[0.4em] uppercase">
          ZJU BS PROJECT © 2025
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="flex flex-col items-center justify-center p-8 md:p-24 relative overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full max-w-sm space-y-12"
        >
          <div className="space-y-4 text-center lg:text-left">
            <h2 className="text-4xl font-serif">欢迎回来</h2>
            <p className="text-secondary font-light text-sm tracking-widest uppercase">请输入您的通行证</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3">
              <label htmlFor="email" className="text-[10px] tracking-[0.2em] uppercase font-light text-secondary">邮箱地址</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="hello@example.com"
                className="w-full px-5 py-4 bg-card border-none rounded-2xl text-sm font-light focus:ring-1 focus:ring-foreground/10 transition-all outline-none"
              />
            </div>

            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
              label="访问密钥"
            />

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[10px] text-red-500 tracking-wider uppercase font-light text-center"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-foreground text-white rounded-2xl text-xs tracking-widest uppercase font-medium flex items-center justify-center gap-3 hover:bg-foreground/90 transition-all hover:gap-6 active:scale-95 disabled:opacity-50"
            >
              <span>{loading ? '正在验证' : '进入收藏'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="text-center text-xs text-secondary font-light tracking-widest uppercase py-8">
            尚未加入？ <Link to="/register" className="text-foreground font-medium underline underline-offset-8">申请新通行证</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
