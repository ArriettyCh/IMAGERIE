import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import PasswordInput from '../components/PasswordInput';
import { motion } from 'framer-motion';
import { User, ArrowLeft, Loader2, Save, Mail, ShieldCheck, Camera, LogOut } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function Profile() {
  const navigate = useNavigate();
  const { user, token, setUser, logout } = useAuthStore();
  const { addToast, showConfirm } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleUpdate = async (type: 'username' | 'email' | 'password', data: any) => {
    setLoading(true);
    try {
      const response = await axios.patch(`${API_BASE}/api/auth/${type}`, data, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        addToast('Account information updated.');
        if (type !== 'password') {
          setUser(response.data.data);
        } else {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        }
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Update failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('Please select a valid image file.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setUploadingAvatar(true);
    try {
      const response = await axios.post(`${API_BASE}/api/auth/avatar`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.data.success) {
        setUser(response.data.data);
        addToast('Avatar updated.');
      }
    } catch (err: any) {
      addToast('Avatar upload failed.', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = () => {
    showConfirm({
      title: 'Log Out',
      message: 'Are you sure you want to end the current session?',
      confirmLabel: 'Log Out',
      isDestructive: true,
      onConfirm: () => {
        logout();
        navigate('/login');
      }
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-16 py-12"
    >
      <div className="flex justify-between items-end border-b border-foreground/5 pb-8">
        <div className="space-y-2">
          <h2 className="text-[10px] tracking-[0.3em] font-light text-secondary uppercase">Preference & Security</h2>
          <h1 className="text-4xl font-serif tracking-tight text-foreground">Account Settings</h1>
        </div>
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-secondary hover:text-foreground transition-colors group">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-xs tracking-widest uppercase font-light">Back to Gallery</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-16">
        <div className="md:col-span-4 space-y-8">
          <div className="relative group aspect-square bg-card rounded-[2.5rem] flex items-center justify-center border border-foreground/5 shadow-inner overflow-hidden">
            {user?.avatar ? (
              <img
                src={`${API_BASE}/uploads/avatars/${user.avatar}?t=${Date.now()}`}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-16 h-16 text-foreground/10" />
            )}

            <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex flex-col items-center justify-center text-white gap-2 backdrop-blur-sm">
              <Camera className="w-6 h-6" />
              <span className="text-[10px] tracking-widest uppercase">Change Avatar</span>
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
            </label>

            {uploadingAvatar && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-foreground" />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-xl font-serif">{user?.username}</h3>
              <p className="text-[10px] text-secondary font-light tracking-widest uppercase break-all">{user?.email}</p>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-500/60 hover:text-red-500 transition-colors text-[10px] tracking-[0.2em] uppercase font-light"
            >
              <LogOut className="w-3 h-3" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        <div className="md:col-span-8 space-y-24">
          <section className="space-y-20">
            <ProfileFormSection 
              icon={User}
              title="Identity" 
              description="Update the username shown across your gallery."
              onSubmit={(e: FormEvent) => { e.preventDefault(); handleUpdate('username', { username }); }}
            >
              <div className="space-y-3">
                <label className="text-[10px] tracking-[0.2em] uppercase font-light text-secondary">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-5 py-4 bg-card border-none rounded-2xl text-sm font-light focus:ring-1 focus:ring-foreground/10 transition-all outline-none"
                />
              </div>
              <button
                type="submit" 
                disabled={loading}
                className="luxury-button flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                <span>Update Identity</span>
              </button>
            </ProfileFormSection>

            <ProfileFormSection 
              icon={Mail}
              title="Contact Address" 
              description="Used for sign-in verification and important account messages."
              onSubmit={(e: FormEvent) => { e.preventDefault(); handleUpdate('email', { email }); }}
            >
              <div className="space-y-3">
                <label className="text-[10px] tracking-[0.2em] uppercase font-light text-secondary">Registered Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 bg-card border-none rounded-2xl text-sm font-light focus:ring-1 focus:ring-foreground/10 transition-all outline-none"
                />
              </div>
              <button
                type="submit" 
                disabled={loading}
                className="luxury-button flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                <span>Update Email</span>
              </button>
            </ProfileFormSection>

            <ProfileFormSection 
              icon={ShieldCheck}
              title="Security" 
              description="Update your password regularly. New passwords must contain at least 6 characters."
              onSubmit={(e: FormEvent) => {
                e.preventDefault(); 
                if (newPassword !== confirmPassword) {
                  addToast('Passwords do not match.', 'error');
                  return;
                }
                handleUpdate('password', { currentPassword, newPassword }); 
              }}
            >
              <div className="space-y-6">
                <PasswordInput
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  label="Security Check"
                />
                <PasswordInput
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter a new password"
                  label="New Password"
                />
                <PasswordInput
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm the new password"
                  label="Confirm Password"
                />
              </div>
              <button
                type="submit" 
                disabled={loading}
                className="luxury-button flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                <span>Reset Password</span>
              </button>
            </ProfileFormSection>
          </section>
        </div>
      </div>
    </motion.div>
  );
}

function ProfileFormSection({ icon: Icon, title, description, children, onSubmit }: any) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-foreground/80 mb-2">
          <Icon className="w-4 h-4" />
          <h3 className="text-lg font-serif tracking-tight">{title}</h3>
        </div>
        <p className="text-[10px] text-secondary font-light tracking-wide uppercase leading-relaxed">{description}</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-6 max-w-md">
        {children}
      </form>
    </div>
  );
}
