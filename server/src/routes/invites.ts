import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { ShareInvite } from '../models/ShareInvite';
import { PlatformShare, Permission } from '../models/PlatformShare';
import { StorageAccount } from '../models/StorageAccount';
import { User } from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }
  next();
};

// ── Public ──────────────────────────────────────────────────────────────────

// GET /invites/public/:token — preview invite details (no auth required)
router.get('/public/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invite = await ShareInvite.findOne({ token: req.params.token })
      .populate('fromUserId', 'name avatar')
      .populate('storageAccountId', 'name type')
      .lean();

    if (!invite) { res.status(404).json({ error: 'Invite not found' }); return; }

    const isExpired = invite.expiresAt ? invite.expiresAt < new Date() : false;

    res.json({
      token: invite.token,
      isValid: invite.isActive && !isExpired,
      isExpired,
      isRevoked: !invite.isActive,
      resourceType: invite.resourceType,
      resourceName: invite.resourcePath.split('/').filter(Boolean).pop() || invite.resourcePath,
      resourcePath: invite.resourcePath,
      permissions: invite.permissions,
      expiresAt: invite.expiresAt,
      fromUser: invite.fromUserId,
      storageAccount: invite.storageAccountId,
      acceptedCount: invite.acceptedBy.length,
      createdAt: invite.createdAt,
    });
  } catch (err) { next(err); }
});

// ── Authenticated ────────────────────────────────────────────────────────────

router.use(authenticate);

// POST /invites/:token/accept — claim the invite, get a PlatformShare
router.post('/:token/accept', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const invite = await ShareInvite.findOne({ token: req.params.token });
    if (!invite) { res.status(404).json({ error: 'Invite not found' }); return; }
    if (!invite.isActive) { res.status(403).json({ error: 'This invite link has been revoked' }); return; }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      res.status(403).json({ error: 'This invite link has expired' }); return;
    }
    if (String(invite.fromUserId) === req.user!.userId) {
      res.status(400).json({ error: 'You cannot accept your own invite' }); return;
    }

    // Upsert the PlatformShare
    const share = await PlatformShare.findOneAndUpdate(
      {
        fromUserId: invite.fromUserId,
        toUserId: req.user!.userId,
        storageAccountId: invite.storageAccountId,
        resourcePath: invite.resourcePath,
      },
      {
        fromUserId: invite.fromUserId,
        toUserId: req.user!.userId,
        storageAccountId: invite.storageAccountId,
        resourcePath: invite.resourcePath,
        resourceType: invite.resourceType,
        permissions: invite.permissions,
        isActive: true,
        ...(invite.expiresAt && { expiresAt: invite.expiresAt }),
      },
      { upsert: true, new: true }
    )
      .populate('fromUserId', 'name email avatar')
      .populate('storageAccountId', 'name type');

    // Track who accepted (idempotent)
    await ShareInvite.updateOne(
      { _id: invite._id },
      { $addToSet: { acceptedBy: req.user!.userId } }
    );

    res.json({ share, message: 'Access granted' });
  } catch (err) { next(err); }
});

// POST /invites — create an invite link
router.post(
  '/',
  [
    body('storageAccountId').notEmpty(),
    body('resourcePath').notEmpty(),
    body('resourceType').isIn(['FOLDER', 'FILE']),
    body('permissions').isArray({ min: 1 }),
  ],
  validate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { storageAccountId, resourcePath, resourceType, permissions, expiresAt } = req.body as {
        storageAccountId: string;
        resourcePath: string;
        resourceType: 'FOLDER' | 'FILE';
        permissions: Permission[];
        expiresAt?: string;
      };

      const account = await StorageAccount.findOne({ _id: storageAccountId, userId: req.user!.userId });
      if (!account) { res.status(404).json({ error: 'Storage account not found' }); return; }

      const invite = await ShareInvite.create({
        fromUserId: req.user!.userId,
        storageAccountId,
        resourcePath,
        resourceType,
        permissions,
        ...(expiresAt && { expiresAt: new Date(expiresAt) }),
      });

      res.status(201).json(invite);
    } catch (err) { next(err); }
  }
);

// GET /invites — list my invite links
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const invites = await ShareInvite.find({ fromUserId: req.user!.userId })
      .populate('storageAccountId', 'name type')
      .sort({ createdAt: -1 })
      .lean();
    res.json(invites);
  } catch (err) { next(err); }
});

// DELETE /invites/:id — revoke an invite
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const invite = await ShareInvite.findOneAndUpdate(
      { _id: req.params.id, fromUserId: req.user!.userId },
      { isActive: false },
      { new: true }
    );
    if (!invite) { res.status(404).json({ error: 'Invite not found' }); return; }
    res.json({ message: 'Invite revoked' });
  } catch (err) { next(err); }
});

export default router;
