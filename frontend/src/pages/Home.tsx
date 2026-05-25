import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import ImageUpload from '../components/ImageUpload';
import ImageList from '../components/ImageList';
import { motion } from 'framer-motion';

export default function Home() {
  const user = useAuthStore((state) => state.user);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const { checkAuth } = useAuthStore.getState();
    checkAuth();
  }, []);

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-12">
      {/* Compact Header Section */}
      <section className="relative pt-8 pb-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-foreground/5 pb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-2"
          >
            <h2 className="text-[10px] tracking-[0.5em] font-black text-secondary uppercase">
              The Private Collection
            </h2>
            <h1 className="text-3xl font-serif tracking-tight text-foreground">
              {user?.username}'s Gallery
            </h1>
            <p className="text-xs font-light text-secondary italic tracking-wide mt-2">
              "Photography catches a passing sense of poetry in everyday life."
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-4"
          >
            <ImageUpload onUploadSuccess={handleUploadSuccess} />
          </motion.div>
        </div>

        {/* Minimal Background Element */}
        <div className="absolute top-0 right-0 -z-10 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px] opacity-30" />
      </section>
      
      {/* Image Gallery */}
      <section className="pb-24">
        <ImageList key={refreshKey} />
      </section>
    </div>
  );
}
