import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Image as ImageIcon, User, Search, Sparkles, Loader2 } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuthStore();
  const { searchQuery, setSearchQuery, triggerSearch, isSearching } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (location.pathname !== '/') {
      navigate('/');
    }
    triggerSearch(false);
  };

  const handleAiSearch = () => {
    if (location.pathname !== '/') {
      navigate('/');
    }
    triggerSearch(true);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-[1440px] mx-auto px-6 h-16 flex justify-between items-center gap-8">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate('/')} 
            className="text-2xl font-serif cursor-pointer tracking-tighter flex items-center gap-2 shrink-0"
          >
            <ImageIcon className="w-6 h-6 stroke-[1.5px]" />
            <span className="hidden md:inline">IMAGERIE</span>
          </motion.h1>

          {/* New Integrated Search Bar */}
          <div className="flex-1 max-w-xl hidden sm:block">
            <form onSubmit={handleSearch} className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                {isSearching ? (
                  <Loader2 className="w-4 h-4 text-accent animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-secondary group-focus-within:text-foreground transition-colors" />
                )}
              </div>
              <input
                type="text"
                placeholder="Search your collection..."
                className="w-full pl-11 pr-48 py-2 bg-black/5 border-none rounded-full text-sm font-light focus:ring-1 focus:ring-foreground/10 transition-all outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute inset-y-1 right-1 flex gap-1.5">
                <button
                  type="submit"
                  className="px-4 py-1 rounded-full bg-black/10 hover:bg-black/10 text-foreground text-[10px] font-medium transition-all"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={handleAiSearch}
                  title="AI Search"
                  className="px-4 py-1 rounded-full bg-foreground text-white text-[10px] font-medium flex items-center gap-1.5 hover:bg-foreground/90 transition-all shrink-0"
                >
                  <Sparkles className="w-3 h-3" />
                  <span className="hidden lg:inline">AI Search</span>
                </button>
              </div>
            </form>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={() => navigate('/profile')}
              className={`group flex items-center gap-3 px-3 py-1.5 rounded-full transition-all hover:bg-black/5 ${location.pathname === '/profile' ? 'bg-black/5' : ''}`}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-card border border-foreground/5 flex items-center justify-center">
                {user?.avatar ? (
                  <img src={`${API_BASE}/uploads/avatars/${user.avatar}?t=${Date.now()}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-secondary" />
                )}
              </div>
              <span className={`text-xs font-light tracking-widest uppercase transition-colors ${location.pathname === '/profile' ? 'text-foreground font-normal' : 'text-secondary group-hover:text-foreground'}`}>
                {user?.username}
              </span>
            </button>
            <div className="h-4 w-[1px] bg-foreground/10" />
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout} 
              className="text-secondary hover:text-foreground transition-colors p-2"
              title="Log out"
            >
              <LogOut className="w-5 h-5 stroke-[1.5px]" />
            </motion.button>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-24 pb-12 w-full max-w-[1440px] mx-auto px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="py-12 border-t border-foreground/5 bg-white">
        <div className="max-w-[1440px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-2xl font-serif tracking-tighter">IMAGERIE</div>
          <div className="flex gap-12 text-[10px] tracking-[0.2em] font-light text-secondary uppercase">
            <span>ZJU BS PROJECT © 2025</span>
            <span>CHEN OUYUAN</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
