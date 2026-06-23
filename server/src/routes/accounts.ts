import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { StorageAccount } from '../models/StorageAccount';
import { SharedAlbum } from '../models/SharedAlbum';
import { authenticate, AuthRequest } from '../middleware/auth';
import { encryptJSON } from '../utils/encryption';
import { createAdapter } from '../services/adapter.factory';

const router = Router();
router.use(authenticate);

const validate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }
  next();
};

// GET /accounts — list all storage account cards for current user
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [accounts, albums] = await Promise.all([
      StorageAccount.find({ userId: req.user!.userId }).sort({ addedAt: -1 }).lean(),
      SharedAlbum.find({ userId: req.user!.userId }).sort({ addedAt: -1 }).lean(),
    ]);

    // Strip encrypted credentials before sending
    const safeAccounts = accounts.map(({ credentials: _c, ...rest }) => rest);

    res.json({ accounts: safeAccounts, sharedAlbums: albums });
  } catch (err) { next(err); }
});

// POST /accounts — create a storage account card
router.post(
  '/',
  [
    body('type').isIn(['GOOGLE_PHOTOS', 'CLOUDINARY', 'IMAGEKIT', 'BACKBLAZE', 'OTHER']),
    body('name').trim().notEmpty(),
  ],
  validate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { type, name, email, notes, link, credentials } = req.body as {
        type: string;
        name: string;
        email?: string;
        notes?: string;
        link?: string;
        credentials?: Record<string, string>;
      };

      const encryptedCreds = encryptJSON(credentials || {});

      const account = await StorageAccount.create({
        userId: req.user!.userId,
        type,
        name,
        email,
        notes,
        link,
        credentials: encryptedCreds,
      });

      const { credentials: _c, ...safeAccount } = account.toObject();
      res.status(201).json(safeAccount);
    } catch (err) { next(err); }
  }
);

// GET /accounts/:id
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const account = await StorageAccount.findOne({ _id: req.params.id, userId: req.user!.userId });
    if (!account) { res.status(404).json({ error: 'Account not found' }); return; }
    const { credentials: _c, ...safe } = account.toObject();
    res.json(safe);
  } catch (err) { next(err); }
});

// PATCH /accounts/:id
router.patch('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const account = await StorageAccount.findOne({ _id: req.params.id, userId: req.user!.userId });
    if (!account) { res.status(404).json({ error: 'Account not found' }); return; }

    const { name, email, notes, link, credentials } = req.body as {
      name?: string;
      email?: string;
      notes?: string;
      link?: string;
      credentials?: Record<string, string>;
    };

    if (name) account.name = name;
    if (email !== undefined) account.email = email;
    if (notes !== undefined) account.notes = notes;
    if (link !== undefined) account.link = link;
    if (credentials) account.credentials = encryptJSON(credentials);

    await account.save();
    const { credentials: _c, ...safe } = account.toObject();
    res.json(safe);
  } catch (err) { next(err); }
});

// DELETE /accounts/:id
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const account = await StorageAccount.findOneAndDelete({ _id: req.params.id, userId: req.user!.userId });
    if (!account) { res.status(404).json({ error: 'Account not found' }); return; }
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// GET /accounts/:id/usage — sync storage usage
router.get('/:id/usage', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const account = await StorageAccount.findOne({ _id: req.params.id, userId: req.user!.userId });
    if (!account) { res.status(404).json({ error: 'Account not found' }); return; }
    if (!['CLOUDINARY', 'IMAGEKIT'].includes(account.type)) {
      res.status(400).json({ error: 'Usage sync not available for this account type' });
      return;
    }
    const adapter = createAdapter(account.type, account.credentials);
    const usage = await adapter.getUsage();
    account.storageUsedMB = usage.usedMB;
    account.storageTotalMB = usage.totalMB;
    account.lastSyncAt = new Date();
    await account.save();
    res.json(usage);
  } catch (err) { next(err); }
});

// --- Shared Albums ---

// POST /accounts/shared-albums
router.post(
  '/shared-albums/new',
  [body('name').trim().notEmpty(), body('link').notEmpty().isURL()],
  validate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { name, link, sharedToEmail, sharedFromEmail, notes } = req.body as {
        name: string;
        link: string;
        sharedToEmail?: string;
        sharedFromEmail?: string;
        notes?: string;
      };
      const album = await SharedAlbum.create({
        userId: req.user!.userId,
        name,
        link,
        sharedToEmail,
        sharedFromEmail,
        notes,
      });
      res.status(201).json(album);
    } catch (err) { next(err); }
  }
);

// PATCH /accounts/shared-albums/:id
router.patch('/shared-albums/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const album = await SharedAlbum.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.userId },
      { $set: req.body },
      { new: true }
    );
    if (!album) { res.status(404).json({ error: 'Album not found' }); return; }
    res.json(album);
  } catch (err) { next(err); }
});

// DELETE /accounts/shared-albums/:id
router.delete('/shared-albums/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await SharedAlbum.findOneAndDelete({ _id: req.params.id, userId: req.user!.userId });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

export default router;
