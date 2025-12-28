import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import PasswordInput from '../components/PasswordInput';
import { motion } from 'framer-motion';
import { ArrowRight, Image as ImageIcon } from 'lucide-react';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((state) => state.register);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (username.length < 6) {
      setError('用户名至少需要6个字符');
      return;
    }

    if (password.length < 6) {
      setError('密码至少需要6个字符');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      await register(username, email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Left side: Form */}
      <div className="flex flex-col items-center justify-center p-8 md:p-24 relative overflow-hidden order-2 lg:order-1">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full max-w-sm space-y-8"
        >
          <div className="space-y-4 text-center lg:text-left">
            <h2 className="text-4xl font-serif">开启私有画廊</h2>
            <p className="text-secondary font-light text-sm tracking-widest uppercase">请填写以下必要信息</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label htmlFor="username" className="text-[10px] tracking-[0.2em] uppercase font-light text-secondary">用户名</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Unique ID"
                minLength={6}
                pattern="[a-zA-Z0-9_]+"
                className="w-full px-5 py-4 bg-card border-none rounded-2xl text-sm font-light focus:ring-1 focus:ring-foreground/10 transition-all outline-none"
              />
            </div>

            <div className="space-y-3">
              <label htmlFor="email" className="text-[10px] tracking-[0.2em] uppercase font-light text-secondary">电子邮箱</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="contact@example.com"
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

            <PasswordInput
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
              label="确认密钥"
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
              <span>{loading ? '正在同步' : '立即激活'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="text-center text-xs text-secondary font-light tracking-widest uppercase py-4">
            已有通行证？ <Link to="/login" className="text-foreground font-medium underline underline-offset-8">直接登录</Link>
          </p>
        </motion.div>
      </div>

      {/* Right side: Branding */}
      <div className="hidden lg:flex relative bg-zinc-900 items-center justify-center overflow-hidden p-24 order-1 lg:order-2">
        <motion.div
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 z-0 opacity-40"
        >
          <img
            src="https://images.unsplash.com/photo-1541963463532-d68292c34b19?q=80&w=2076&auto=format&fit=crop"
            alt="Artistic background"
            className="w-full h-full object-cover grayscale"
          />
        </motion.div>

        <div className="relative z-10 text-white space-y-8 max-w-md text-right">
          <div className="flex justify-end">
            <ImageIcon className="w-12 h-12 stroke-[1px]" />
          </div>
          <h1 className="text-6xl font-serif leading-tight tracking-tighter">
            记录时光的 <br />
            高级方式
          </h1>
          <p className="text-lg font-light text-white/60 tracking-wide leading-relaxed">
            加入我们，用最纯粹的方式整理您的视觉资产。
          </p>
        </div>
      </div>
    </div>
  );
}
