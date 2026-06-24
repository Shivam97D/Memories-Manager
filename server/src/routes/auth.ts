import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { generateOTP } from '../utils/otp';
import { sendEmail, otpEmailHtml } from '../utils/email';
import { env } from '../config/env';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
};

// POST /auth/register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password min 8 chars'),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password, phone } = req.body as {
        name: string;
        email: string;
        password: string;
        phone?: string;
      };

      const existing = await User.findOne({ email });
      if (existing) {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }

      const otp = generateOTP();
      const otpExpiresAt = new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60 * 1000);

      const user = await User.create({
        name,
        email,
        phone,
        passwordHash: password,
        otp,
        otpExpiresAt,
      });

      await sendEmail({
        to: email,
        subject: 'Verify your PixelVault account',
        html: otpEmailHtml(otp, name, email),
      });

      res.status(201).json({ message: 'Registered. Check email for OTP.', userId: user._id });
    } catch (err) {
      next(err);
    }
  }
);

// POST /auth/verify-email
router.post(
  '/verify-email',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, otp } = req.body as { email: string; otp: string };
      const user = await User.findOne({ email });
      if (!user || user.otp !== otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
        res.status(400).json({ error: 'Invalid or expired OTP' });
        return;
      }

      user.emailVerified = true;
      user.otp = undefined;
      user.otpExpiresAt = undefined;
      const accessToken = signAccessToken({ userId: String(user._id), email: user.email });
      const refreshToken = signRefreshToken({ userId: String(user._id), email: user.email });
      user.refreshTokens.push(refreshToken);
      await user.save();

      res.json({
        message: 'Email verified',
        accessToken,
        refreshToken,
        user: { id: user._id, name: user.name, email: user.email, phone: user.phone, avatar: user.avatar },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as { email: string; password: string };
      const user = await User.findOne({ email });
      if (!user || !(await user.comparePassword(password))) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      if (!user.emailVerified) {
        res.status(403).json({ error: 'Email not verified. Check your inbox.' });
        return;
      }

      const accessToken = signAccessToken({ userId: String(user._id), email: user.email });
      const refreshToken = signRefreshToken({ userId: String(user._id), email: user.email });
      user.refreshTokens.push(refreshToken);
      // keep only last 5 refresh tokens
      if (user.refreshTokens.length > 5) user.refreshTokens = user.refreshTokens.slice(-5);
      await user.save();

      res.json({
        accessToken,
        refreshToken,
        user: { id: user._id, name: user.name, email: user.email, phone: user.phone, avatar: user.avatar },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /auth/resend-otp
router.post(
  '/resend-otp',
  [body('email').isEmail().normalizeEmail()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body as { email: string };
      const user = await User.findOne({ email });
      if (!user) { res.status(404).json({ error: 'User not found' }); return; }

      const otp = generateOTP();
      user.otp = otp;
      user.otpExpiresAt = new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60 * 1000);
      await user.save();
      await sendEmail({ to: email, subject: 'Your PixelVault OTP', html: otpEmailHtml(otp, user.name, email) });
      res.json({ message: 'OTP sent' });
    } catch (err) {
      next(err);
    }
  }
);

// POST /auth/refresh
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body as { refreshToken: string };
    if (!refreshToken) { res.status(400).json({ error: 'Refresh token required' }); return; }
    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.userId);
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }
    const newAccess = signAccessToken({ userId: String(user._id), email: user.email });
    const newRefresh = signRefreshToken({ userId: String(user._id), email: user.email });
    user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
    user.refreshTokens.push(newRefresh);
    await user.save();
    res.json({ accessToken: newAccess, refreshToken: newRefresh });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// POST /auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    const user = await User.findById(req.user!.userId);
    if (user && refreshToken) {
      user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
      await user.save();
    }
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
});

// GET /auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.userId).select('-passwordHash -otp -otpExpiresAt -refreshTokens');
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PATCH /auth/profile
router.patch(
  '/profile',
  authenticate,
  [
    body('name').optional().trim().notEmpty(),
    body('phone').optional().trim(),
  ],
  validate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { name, phone, avatar } = req.body as { name?: string; phone?: string; avatar?: string };
      const user = await User.findByIdAndUpdate(
        req.user!.userId,
        { ...(name && { name }), ...(phone !== undefined && { phone }), ...(avatar && { avatar }) },
        { new: true }
      ).select('-passwordHash -otp -otpExpiresAt -refreshTokens');
      res.json(user);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
