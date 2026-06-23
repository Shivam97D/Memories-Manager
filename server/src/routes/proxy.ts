import { Router, Response, NextFunction } from 'express';
import { PlatformShare, Permission } from '../models/PlatformShare';
import { StorageAccount } from '../models/StorageAccount';
import { ActivityLog } from '../models/ActivityLog';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createAdapter } from '../services/adapter.factory';

const router = Router();
router.use(authenticate);

async function resolveShare(shareId: string, requestingUserId: string, requiredPermission: Permission) {
  const share = await PlatformShare.findOne({ _id: shareId, toUserId: requestingUserId, isActive: true });
  if (!share) throw Object.assign(new Error('Share not found or access revoked'), { statusCode: 404 });
  if (share.expiresAt && share.expiresAt < new Date()) {
    throw Object.assign(new Error('Share has expired'), { statusCode: 403 });
  }
  if (!share.permissions.includes(requiredPermission)) {
    throw Object.assign(new Error(`Permission denied: ${requiredPermission} not granted`), { statusCode: 403 });
  }
  const account = await StorageAccount.findById(share.storageAccountId);
  if (!account) throw Object.assign(new Error('Storage account not found'), { statusCode: 404 });
  return { share, account };
}

async function log(userId: string, shareId: string, accountId: string, action: string, path?: string) {
  await ActivityLog.create({
    userId,
    storageAccountId: accountId,
    shareId,
    action: `SHARED:${action}`,
    resourcePath: path,
    metadata: { viaShare: shareId },
  });
}

// GET /proxy/:shareId/browse?path=...
router.get('/:shareId/browse', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { share, account } = await resolveShare(req.params.shareId, req.user!.userId, 'VIEW');
    const adapter = createAdapter(account.type, account.credentials);
    const requestedPath = (req.query.path as string) || share.resourcePath;

    // Prevent path traversal above the shared resource
    if (share.resourceType === 'FOLDER' && !requestedPath.startsWith(share.resourcePath)) {
      res.status(403).json({ error: 'Cannot browse outside the shared folder' });
      return;
    }

    const contents = await adapter.listFolder(requestedPath, req.query.cursor as string);
    await log(req.user!.userId, req.params.shareId, String(account._id), 'VIEW', requestedPath);
    res.json(contents);
  } catch (err) { next(err); }
});

// GET /proxy/:shareId/download?publicId=...
router.get('/:shareId/download', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { share, account } = await resolveShare(req.params.shareId, req.user!.userId, 'DOWNLOAD');
    const adapter = createAdapter(account.type, account.credentials);
    const publicId = req.query.publicId as string;
    const url = await adapter.getSignedDownloadUrl(publicId);
    await log(req.user!.userId, req.params.shareId, String(account._id), 'DOWNLOAD', publicId);
    res.json({ url });
  } catch (err) { next(err); }
});

// DELETE /proxy/:shareId/resource
router.delete('/:shareId/resource', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { share, account } = await resolveShare(req.params.shareId, req.user!.userId, 'DELETE');
    const adapter = createAdapter(account.type, account.credentials);
    const { publicId, resourceType } = req.body as { publicId: string; resourceType?: string };
    await adapter.deleteResource(publicId, resourceType);
    await log(req.user!.userId, req.params.shareId, String(account._id), 'DELETE', publicId);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// GET /proxy/:shareId/upload-params?folder=...
router.get('/:shareId/upload-params', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { share, account } = await resolveShare(req.params.shareId, req.user!.userId, 'EDIT');
    const adapter = createAdapter(account.type, account.credentials);
    const folder = (req.query.folder as string) || share.resourcePath;
    const fileName = (req.query.fileName as string) || 'upload';

    // Restrict uploads to within the shared path
    if (!folder.startsWith(share.resourcePath)) {
      res.status(403).json({ error: 'Cannot upload outside the shared folder' });
      return;
    }

    const params = await adapter.getSignedUploadParams(folder, fileName);
    res.json(params);
  } catch (err) { next(err); }
});

// GET /proxy/:shareId/transform?publicId=...
router.get('/:shareId/transform', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { account } = await resolveShare(req.params.shareId, req.user!.userId, 'VIEW');
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

export default router;
