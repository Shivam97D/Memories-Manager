import { Router, Response, NextFunction } from 'express';
import { StorageAccount } from '../models/StorageAccount';
import { ActivityLog } from '../models/ActivityLog';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createAdapter } from '../services/adapter.factory';

const router = Router();
router.use(authenticate);

export const PIXELVAULT_ROOT = 'PixelVault_Memory_Manager';

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

// GET /storage/:accountId/ensure-root
// Called once when manager opens — creates the root folder if it doesn't exist
router.get('/:accountId/ensure-root', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const account = await getOwnedAccount(req.params.accountId, req.user!.userId);
    const adapter = createAdapter(account.type, account.credentials);

    const rootPath = account.type === 'IMAGEKIT'
      ? `/${PIXELVAULT_ROOT}`
      : PIXELVAULT_ROOT;

    try {
      await adapter.createFolder(rootPath);
    } catch {
      // folder already exists — fine
    }

    await log(req.user!.userId, req.params.accountId, 'INIT_ROOT', rootPath);
    res.json({ path: rootPath });
  } catch (err) { next(err); }
});

// GET /storage/:accountId/browse?path=...&cursor=...
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

// GET /storage/:accountId/upload-params?folder=...&fileName=...
router.get('/:accountId/upload-params', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const account = await getOwnedAccount(req.params.accountId, req.user!.userId);
    const adapter = createAdapter(account.type, account.credentials);
    const folder = (req.query.folder as string) || PIXELVAULT_ROOT;
    const fileName = (req.query.fileName as string) || 'upload';
    const params = await adapter.getSignedUploadParams(folder, fileName);
    res.json(params);
  } catch (err) { next(err); }
});

// DELETE /storage/:accountId/resource — single file delete
router.delete('/:accountId/resource', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const account = await getOwnedAccount(req.params.accountId, req.user!.userId);
    const adapter = createAdapter(account.type, account.credentials);
    const { publicId, mimeType } = req.body as { publicId: string; mimeType?: string };
    await adapter.deleteResource(publicId, mimeType);
    await log(req.user!.userId, req.params.accountId, 'DELETE', publicId);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// DELETE /storage/:accountId/folder — delete a folder and all its contents
router.delete('/:accountId/folder', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const account = await getOwnedAccount(req.params.accountId, req.user!.userId);
    const adapter = createAdapter(account.type, account.credentials);
    const { path } = req.body as { path: string };
    if (!path) { res.status(400).json({ error: 'path required' }); return; }
    await adapter.deleteFolder(path);
    await log(req.user!.userId, req.params.accountId, 'DELETE_FOLDER', path);
    res.json({ message: 'Folder deleted' });
  } catch (err) { next(err); }
});

// POST /storage/:accountId/bulk-delete — delete multiple files
router.post('/:accountId/bulk-delete', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const account = await getOwnedAccount(req.params.accountId, req.user!.userId);
    const adapter = createAdapter(account.type, account.credentials);
    const { publicIds, items: itemsWithMime } = req.body as {
      publicIds?: string[];
      items?: { publicId: string; mimeType?: string }[];
    };

    const toDelete: { publicId: string; mimeType?: string }[] = itemsWithMime ||
      (publicIds || []).map((id) => ({ publicId: id }));

    if (!toDelete.length) { res.status(400).json({ error: 'publicIds or items required' }); return; }

    await Promise.all(toDelete.map((item) => adapter.deleteResource(item.publicId, item.mimeType)));
    await log(req.user!.userId, req.params.accountId, 'BULK_DELETE', `${toDelete.length} items`);
    res.json({ message: `Deleted ${toDelete.length} item(s)` });
  } catch (err) { next(err); }
});

// POST /storage/:accountId/bulk-download — get signed URLs for multiple files
router.post('/:accountId/bulk-download', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const account = await getOwnedAccount(req.params.accountId, req.user!.userId);
    const adapter = createAdapter(account.type, account.credentials);
    const { publicIds } = req.body as { publicIds: string[] };

    if (!Array.isArray(publicIds) || publicIds.length === 0) {
      res.status(400).json({ error: 'publicIds array required' });
      return;
    }

    const urls = await Promise.all(publicIds.map((id) => adapter.getSignedDownloadUrl(id)));
    await log(req.user!.userId, req.params.accountId, 'BULK_DOWNLOAD', `${publicIds.length} items`);
    res.json({ urls });
  } catch (err) { next(err); }
});

// PATCH /storage/:accountId/resource/rename — rename a file
router.patch('/:accountId/resource/rename', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const account = await getOwnedAccount(req.params.accountId, req.user!.userId);
    const adapter = createAdapter(account.type, account.credentials);
    const { fromPath, toPath, mimeType } = req.body as { fromPath: string; toPath: string; mimeType?: string };
    if (!fromPath || !toPath) { res.status(400).json({ error: 'fromPath and toPath required' }); return; }
    await adapter.renameResource(fromPath, toPath, mimeType);
    await log(req.user!.userId, req.params.accountId, 'RENAME', `${fromPath} → ${toPath}`);
    res.json({ message: 'Renamed' });
  } catch (err) { next(err); }
});

// PATCH /storage/:accountId/folder/rename — rename a folder
router.patch('/:accountId/folder/rename', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const account = await getOwnedAccount(req.params.accountId, req.user!.userId);
    const adapter = createAdapter(account.type, account.credentials);
    const { fromPath, toPath } = req.body as { fromPath: string; toPath: string };
    if (!fromPath || !toPath) { res.status(400).json({ error: 'fromPath and toPath required' }); return; }
    await adapter.renameFolder(fromPath, toPath);
    await log(req.user!.userId, req.params.accountId, 'RENAME_FOLDER', `${fromPath} → ${toPath}`);
    res.json({ message: 'Folder renamed' });
  } catch (err) { next(err); }
});

// PATCH /storage/:accountId/resource/move — move a file to a different folder
router.patch('/:accountId/resource/move', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const account = await getOwnedAccount(req.params.accountId, req.user!.userId);
    const adapter = createAdapter(account.type, account.credentials);
    const { fromPath, destFolder, mimeType } = req.body as { fromPath: string; destFolder: string; mimeType?: string };
    if (!fromPath || !destFolder) { res.status(400).json({ error: 'fromPath and destFolder required' }); return; }
    await adapter.moveResource(fromPath, destFolder, mimeType);
    await log(req.user!.userId, req.params.accountId, 'MOVE', `${fromPath} → ${destFolder}`);
    res.json({ message: 'Moved' });
  } catch (err) { next(err); }
});

// GET /storage/:accountId/transform?publicId=...
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

// GET /storage/:accountId/usage
router.get('/:accountId/usage', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const account = await getOwnedAccount(req.params.accountId, req.user!.userId);
    const adapter = createAdapter(account.type, account.credentials);
    const usage = await adapter.getUsage();
    res.json(usage);
  } catch (err) { next(err); }
});

// POST /storage/:accountId/bulk-copy
router.post('/:accountId/bulk-copy', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const account = await getOwnedAccount(req.params.accountId, req.user!.userId);
    const adapter = createAdapter(account.type, account.credentials);
    const { items, destFolder } = req.body as {
      items: { publicId: string; path: string; mimeType?: string }[];
      destFolder: string;
    };

    if (!Array.isArray(items) || items.length === 0 || !destFolder) {
      res.status(400).json({ error: 'items[] and destFolder are required' });
      return;
    }

    // ImageKit uses file path; Cloudinary uses publicId
    await Promise.all(
      items.map((item) => {
        const source = account.type === 'IMAGEKIT' ? item.path : item.publicId;
        return adapter.copyResource(source, destFolder, item.mimeType);
      })
    );

    await log(req.user!.userId, req.params.accountId, 'BULK_COPY', `${items.length} items → ${destFolder}`);
    res.json({ message: `Copied ${items.length} item(s) to ${destFolder}` });
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
