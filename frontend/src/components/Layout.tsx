import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <h1 className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            图片管理
          </h1>
          <div className="header-right">
            <span className="username" onClick={handleProfileClick} style={{ cursor: 'pointer' }}>
              {user?.username}
            </span>
            <button onClick={handleProfileClick} className="profile-button">
              用户中心
            </button>
            <button onClick={handleLogout} className="logout-button">
              退出登录
            </button>
          </div>
        </div>
      </header>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

