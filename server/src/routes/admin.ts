import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User';
import { StorageAccount } from '../models/StorageAccount';
import { PlatformShare } from '../models/PlatformShare';
import { ActivityLog } from '../models/ActivityLog';
import { getSettings } from '../models/SiteSettings';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate, requireAdmin);

const validate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }
  next();
};

// GET /admin/stats — site-wide stats
router.get('/stats', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [totalUsers, totalAdmins, totalAccounts, totalShares, totalLogs, recentUsers] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'admin' }),
        StorageAccount.countDocuments(),
        PlatformShare.countDocuments(),
        ActivityLog.countDocuments(),
        User.find().sort({ createdAt: -1 }).limit(5)
          .select('name email role createdAt isSuspended').lean(),
      ]);

    res.json({
      totalUsers,
      totalAdmins,
      totalAccounts,
      totalShares,
      totalLogs,
      recentUsers,
    });
  } catch (err) { next(err); }
});

// GET /admin/users?page=1&limit=20&search=&role=
router.get('/users', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1'));
    const limit = Math.min(50, parseInt((req.query.limit as string) || '20'));
    const search = (req.query.search as string) || '';
    const roleFilter = (req.query.role as string) || '';

    const filter: Record<string, unknown> = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (roleFilter === 'admin' || roleFilter === 'user') {
      filter.role = roleFilter;
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash -otp -otpExpiresAt -refreshTokens')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Attach account count per user
    const userIds = users.map((u) => u._id);
    const accountCounts = await StorageAccount.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(accountCounts.map((a) => [String(a._id), a.count]));

    const enriched = users.map((u) => ({
      ...u,
      accountCount: countMap.get(String(u._id)) || 0,
    }));

    res.json({ users: enriched, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// PATCH /admin/users/:id/role
router.patch(
  '/users/:id/role',
  [body('role').isIn(['user', 'admin']).withMessage('Role must be user or admin')],
  validate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (req.params.id === req.user!.userId) {
        res.status(400).json({ error: 'Cannot change your own role' });
        return;
      }
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { role: req.body.role as string },
        { new: true }
      ).select('-passwordHash -otp -otpExpiresAt -refreshTokens');
      if (!user) { res.status(404).json({ error: 'User not found' }); return; }
      res.json(user);
    } catch (err) { next(err); }
  }
);

// PATCH /admin/users/:id/suspend
router.patch('/users/:id/suspend', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.params.id === req.user!.userId) {
      res.status(400).json({ error: 'Cannot suspend yourself' });
      return;
    }
    const { suspended } = req.body as { suspended: boolean };
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isSuspended: !!suspended },
      { new: true }
    ).select('-passwordHash -otp -otpExpiresAt -refreshTokens');
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  } catch (err) { next(err); }
});

// DELETE /admin/users/:id
router.delete('/users/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.params.id === req.user!.userId) {
      res.status(400).json({ error: 'Cannot delete yourself' });
      return;
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    // Cascade delete user data
    await Promise.all([
      StorageAccount.deleteMany({ userId: req.params.id }),
      PlatformShare.deleteMany({ $or: [{ fromUserId: req.params.id }, { toUserId: req.params.id }] }),
      ActivityLog.deleteMany({ userId: req.params.id }),
    ]);

    res.json({ message: 'User and all associated data deleted' });
  } catch (err) { next(err); }
});

// GET /admin/settings
router.get('/settings', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const settings = await getSettings();
    res.json({ emailVerificationEnabled: settings.emailVerificationEnabled });
  } catch (err) { next(err); }
});

// PATCH /admin/settings
router.patch(
  '/settings',
  [body('emailVerificationEnabled').isBoolean().withMessage('Must be boolean')],
  validate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const settings = await getSettings();
      settings.emailVerificationEnabled = req.body.emailVerificationEnabled as boolean;
      await settings.save();
      res.json({ emailVerificationEnabled: settings.emailVerificationEnabled });
    } catch (err) { next(err); }
  }
);

// GET /admin/activity?limit=50
router.get('/activity', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(100, parseInt((req.query.limit as string) || '50'));
    const logs = await ActivityLog.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json(logs);
  } catch (err) { next(err); }
});

export default router;
