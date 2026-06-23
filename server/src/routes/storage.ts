import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { StorageAccount } from '../models/StorageAccount';
import { ActivityLog } from '../models/ActivityLog';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createAdapter } from '../services/adapter.factory';

const router = Router();
router.use(authenticate);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

async function getOwnedAccount(accountId: string, userId: string) {
  const account = await StorageAccount.findOne({ _id: accountId, userId });
  if (!account) throw Object.assign(new Error('Account not found'), { statusCode: 404 });
  if (!['CLOUDINARY', 'IMAGEKIT'].includes(account.type)) {
    throw Object.assign(new Error('This account type does not support the file manager'), { statusCode: 400 });
  }
  return account;
}

async function log(userId: string, accountId: string, action: string, path?: string) {
  await ActivityLog.create({ userId, storageAccountId: accountId, action, resourcePath: path });
}

// GET /storage/:accountId/browse?path=folder/path&cursor=...
router.get('/:accountId/browse', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const account = await getOwnedAccount(req.params.accountId, req.user!.userId);
    const adapter = createAdapter(account.type, account.credentials);
    const path = (req.query.path as string) || '';
    const cursor = (req.query.cursor as string) || undefined;
    const contents = await adapter.listFolder(path, cursor);
    await log(req.user!.userId, req.params.accountId, 'VIEW', path);
    res.json(contents);
  } catch (err) { next(err); }
});

// GET /storage/:accountId/upload-params?folder=...
router.get('/:accountId/upload-params', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const account = await getOwnedAccount(req.params.accountId, req.user!.userId);
    const adapter = createAdapter(account.type, account.credentials);
    const folder = (req.query.folder as string) || '';
    const fileName = (req.query.fileName as string) || 'upload';
    const params = await adapter.getSignedUploadParams(folder, fileName);
    res.json(params);
  } catch (err) { next(err); }
});

// DELETE /storage/:accountId/resource
router.delete('/:accountId/resource', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const account = await getOwnedAccount(req.params.accountId, req.user!.userId);
    const adapter = createAdapter(account.type, account.credentials);
    const { publicId, resourceType } = req.body as { publicId: string; resourceType?: string };
    await adapter.deleteResource(publicId, resourceType);
    await log(req.user!.userId, req.params.accountId, 'DELETE', publicId);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// GET /storage/:accountId/transform?publicId=...&w=...&h=...&crop=...
router.get('/:accountId/transform', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const account = await getOwnedAccount(req.params.accountId, req.user!.userId);
    const adapter = createAdapter(account.type, account.credentials);
    const { publicId, w, h, crop, quality, format } = req.query as Record<string, string>;
    const url = adapter.getTransformUrl(publicId, [{
      width: w ? parseInt(w) : undefined,
      height: h ? parseInt(h) : undefined,
      crop,
      quality: quality || 'auto',
      format: format || 'auto',
    }]);
    res.json({ url });
  } catch (err) { next(err); }
});

// GET /storage/:accountId/download?publicId=...
router.get('/:accountId/download', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const account = await getOwnedAccount(req.params.accountId, req.user!.userId);
    const adapter = createAdapter(account.type, account.credentials);
    const publicId = req.query.publicId as string;
    const url = await adapter.getSignedDownloadUrl(publicId);
    await log(req.user!.userId, req.params.accountId, 'DOWNLOAD', publicId);
    res.json({ url });
  } catch (err) { next(err); }
});

// POST /storage/:accountId/folder
router.post('/:accountId/folder', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const account = await getOwnedAccount(req.params.accountId, req.user!.userId);
    const adapter = createAdapter(account.type, account.credentials);
    const { path } = req.body as { path: string };
    await adapter.createFolder(path);
    await log(req.user!.userId, req.params.accountId, 'CREATE_FOLDER', path);
    res.json({ message: 'Folder created' });
  } catch (err) { next(err); }
});

// GET /storage/:accountId/activity
router.get('/:accountId/activity', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await getOwnedAccount(req.params.accountId, req.user!.userId);
    const logs = await ActivityLog.find({
      userId: req.user!.userId,
      storageAccountId: req.params.accountId,
    }).sort({ createdAt: -1 }).limit(50).lean();
    res.json(logs);
  } catch (err) { next(err); }
});

export default router;
