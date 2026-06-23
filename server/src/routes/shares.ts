import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { PlatformShare, Permission } from '../models/PlatformShare';
import { StorageAccount } from '../models/StorageAccount';
import { User } from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const validate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }
  next();
};

// GET /shares/sent — shares I created
router.get('/sent', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const shares = await PlatformShare.find({ fromUserId: req.user!.userId })
      .populate('toUserId', 'name email avatar')
      .populate('storageAccountId', 'name type')
      .sort({ createdAt: -1 })
      .lean();
    res.json(shares);
  } catch (err) { next(err); }
});

// GET /shares/received — shares sent to me
router.get('/received', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const shares = await PlatformShare.find({ toUserId: req.user!.userId, isActive: true })
      .populate('fromUserId', 'name email avatar')
      .populate('storageAccountId', 'name type')
      .sort({ createdAt: -1 })
      .lean();
    res.json(shares);
  } catch (err) { next(err); }
});

// POST /shares — create a share
router.post(
  '/',
  [
    body('toUserEmail').isEmail(),
    body('storageAccountId').notEmpty(),
    body('resourcePath').notEmpty(),
    body('resourceType').isIn(['FOLDER', 'FILE']),
    body('permissions').isArray({ min: 1 }),
  ],
  validate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { toUserEmail, storageAccountId, resourcePath, resourceType, permissions, expiresAt } =
        req.body as {
          toUserEmail: string;
          storageAccountId: string;
          resourcePath: string;
          resourceType: 'FOLDER' | 'FILE';
          permissions: Permission[];
          expiresAt?: string;
        };

      // Verify the account belongs to the sharing user
      const account = await StorageAccount.findOne({ _id: storageAccountId, userId: req.user!.userId });
      if (!account) { res.status(404).json({ error: 'Storage account not found' }); return; }

      // Find the target user
      const toUser = await User.findOne({ email: toUserEmail });
      if (!toUser) { res.status(404).json({ error: 'User not found with that email' }); return; }

      if (String(toUser._id) === req.user!.userId) {
        res.status(400).json({ error: 'Cannot share with yourself' });
        return;
      }

      // Upsert — update if same share already exists
      const share = await PlatformShare.findOneAndUpdate(
        { fromUserId: req.user!.userId, toUserId: toUser._id, storageAccountId, resourcePath },
        {
          fromUserId: req.user!.userId,
          toUserId: toUser._id,
          storageAccountId,
          resourcePath,
          resourceType,
          permissions,
          isActive: true,
          ...(expiresAt && { expiresAt: new Date(expiresAt) }),
        },
        { upsert: true, new: true }
      )
        .populate('toUserId', 'name email avatar')
        .populate('storageAccountId', 'name type');

      res.status(201).json(share);
    } catch (err) { next(err); }
  }
);

// PATCH /shares/:id/permissions
router.patch('/:id/permissions', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { permissions, isActive } = req.body as { permissions?: Permission[]; isActive?: boolean };
    const share = await PlatformShare.findOneAndUpdate(
      { _id: req.params.id, fromUserId: req.user!.userId },
      { ...(permissions && { permissions }), ...(isActive !== undefined && { isActive }) },
      { new: true }
    );
    if (!share) { res.status(404).json({ error: 'Share not found' }); return; }
    res.json(share);
  } catch (err) { next(err); }
});

// DELETE /shares/:id
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const share = await PlatformShare.findOneAndDelete({ _id: req.params.id, fromUserId: req.user!.userId });
    if (!share) { res.status(404).json({ error: 'Share not found' }); return; }
    res.json({ message: 'Share revoked' });
  } catch (err) { next(err); }
});

export default router;
