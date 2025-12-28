import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import PasswordInput from '../components/PasswordInput';
import './Profile.css';

export default function Profile() {
  const navigate = useNavigate();
  const { user, token, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 用户信息表单
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  // 密码修改表单
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const fetchUserInfo = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setUser(response.data.data);
        setUsername(response.data.data.username);
        setEmail(response.data.data.email);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  };

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const handleUpdateUsername = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await axios.patch(
        'http://localhost:3001/api/auth/username',
        { username },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setSuccess('用户名更新成功');
        setUser(response.data.data);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '更新用户名失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await axios.patch(
        'http://localhost:3001/api/auth/email',
        { email },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setSuccess('邮箱更新成功');
        setUser(response.data.data);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '更新邮箱失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('新密码至少需要6个字符');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.patch(
        'http://localhost:3001/api/auth/password',
        {
          currentPassword,
          newPassword
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setSuccess('密码更新成功');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '更新密码失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>用户中心</h1>
        <button onClick={() => navigate('/')} className="back-button">
          ← 返回首页
        </button>
      </div>

      <div className="profile-content">
        {/* 用户信息卡片 */}
        <div className="profile-card">
          <h2>基本信息</h2>
          <form onSubmit={handleUpdateUsername}>
            <div className="form-group">
              <label htmlFor="username">用户名</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={6}
                pattern="[a-zA-Z0-9_]+"
                placeholder="请输入用户名（至少6个字符）"
              />
            </div>
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? '更新中...' : '更新用户名'}
            </button>
          </form>

          <form onSubmit={handleUpdateEmail} style={{ marginTop: '20px' }}>
            <div className="form-group">
              <label htmlFor="email">邮箱</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="请输入邮箱"
              />
            </div>
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? '更新中...' : '更新邮箱'}
            </button>
          </form>
        </div>

        {/* 密码修改卡片 */}
        <div className="profile-card">
          <h2>修改密码</h2>
          <form onSubmit={handleUpdatePassword}>
            <PasswordInput
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="请输入当前密码"
              required
              label="当前密码"
            />

            <PasswordInput
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="请输入新密码（至少6个字符）"
              required
              minLength={6}
              label="新密码"
            />

            <PasswordInput
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="请再次输入新密码"
              required
              minLength={6}
              label="确认新密码"
            />

            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? '更新中...' : '更新密码'}
            </button>
          </form>
        </div>

        {/* 消息提示 */}
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
      </div>
    </div>
  );
}

