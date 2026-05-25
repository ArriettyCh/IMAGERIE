import { Router } from 'express';
import { register, login, getCurrentUser, updateUsername, updateEmail, updatePassword, updateAvatar } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRegister, validateLogin } from '../middleware/validation.js';
import { upload } from '../middleware/upload.js';

export const authRouter = Router();

// Register.
authRouter.post('/register', validateRegister, register);

// Log in.
authRouter.post('/login', validateLogin, login);

// Get the current user.
authRouter.get('/me', authenticateToken, getCurrentUser);

// Update username.
authRouter.patch('/username', authenticateToken, updateUsername);

// Update email.
authRouter.patch('/email', authenticateToken, updateEmail);

// Update password.
authRouter.patch('/password', authenticateToken, updatePassword);

// Update avatar.
authRouter.post('/avatar', authenticateToken, upload.single('avatar'), updateAvatar);
