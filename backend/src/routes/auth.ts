import { Router } from 'express';
import { register, login, getCurrentUser, updateUsername, updateEmail, updatePassword, updateAvatar } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRegister, validateLogin } from '../middleware/validation.js';
import { upload } from '../middleware/upload.js';

export const authRouter = Router();

// 注册
authRouter.post('/register', validateRegister, register);

// 登录
authRouter.post('/login', validateLogin, login);

// 获取当前用户信息
authRouter.get('/me', authenticateToken, getCurrentUser);

// 更新用户名
authRouter.patch('/username', authenticateToken, updateUsername);

// 更新邮箱
authRouter.patch('/email', authenticateToken, updateEmail);

// 更新密码
authRouter.patch('/password', authenticateToken, updatePassword);

// 更新头像
authRouter.post('/avatar', authenticateToken, upload.single('avatar'), updateAvatar);
