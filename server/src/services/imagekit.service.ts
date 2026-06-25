import ImageKit from 'imagekit';
import {
  StorageAdapter,
  FolderContents,
  MediaItem,
  StorageUsage,
  Transform,
} from './storage.types';

export interface ImageKitCredentials {
  publicKey: string;
  privateKey: string;
  urlEndpoint: string;
}

export class ImageKitService implements StorageAdapter {
  private ik: ImageKit;
  private urlEndpoint: string;

  constructor(creds: ImageKitCredentials) {
    this.ik = new ImageKit({
      publicKey: creds.publicKey,
      privateKey: creds.privateKey,
      urlEndpoint: creds.urlEndpoint,
    });
    this.urlEndpoint = creds.urlEndpoint;
  }

  async listFolder(path = '/'): Promise<FolderContents> {
    const folderPath = path.startsWith('/') ? path : `/${path}`;

    const [files, foldersRaw] = await Promise.all([
      this.ik.listFiles({ path: folderPath, limit: 50 } as Parameters<typeof this.ik.listFiles>[0]),
      this.ik.listFiles({ type: 'folder', path: folderPath } as Parameters<typeof this.ik.listFiles>[0])
        .catch(() => [] as unknown[]),
    ]);

    const folders = foldersRaw as Array<{ fileId: string; name: string; filePath: string }>;

    const folderItems: MediaItem[] = (folders || [])
      .filter((f) => f && 'filePath' in f)
      .map((f) => ({
        id: f.fileId,
        name: f.name,
        type: 'folder' as const,
        path: f.filePath,
      }));

    const fileItems: MediaItem[] = (files as Array<{
      fileId: string;
      name: string;
      fileType: string;
      mime?: string;
      size: number;
      width?: number;
      height?: number;
      url: string;
      thumbnail?: string;
      filePath: string;
      createdAt: string;
      tags?: string[];
    }>)
      .filter((f) => f && 'fileId' in f)
      .map((f) => ({
        id: f.fileId,
        name: f.name,
        type: 'file' as const,
        mimeType: f.mime || f.fileType,
        size: f.size,
        width: f.width,
        height: f.height,
        url: f.url,
        thumbnailUrl: f.thumbnail || f.url,
        publicId: f.fileId,
        path: f.filePath,
        createdAt: new Date(f.createdAt),
        tags: f.tags,
      }));

    return { items: [...folderItems, ...fileItems] };
  }

  async getSignedUploadParams(folder: string, _fileName: string): Promise<Record<string, string>> {
    const token = this.ik.getAuthenticationParameters();
    return {
      token: token.token,
      expire: String(token.expire),
      signature: token.signature,
      publicKey: this.ik.options.publicKey,
      folder,
      urlEndpoint: this.urlEndpoint,
    };
  }

  async deleteResource(fileId: string): Promise<void> {
    await this.ik.deleteFile(fileId);
  }

  getTransformUrl(fileId: string, transforms: Transform[]): string {
    const t = transforms[0] || {};
    return this.ik.url({
      src: `${this.urlEndpoint}/${fileId}`,
      transformation: [
        {
          width: t.width ? String(t.width) : undefined,
          height: t.height ? String(t.height) : undefined,
          crop: t.crop,
          quality: t.quality ? String(t.quality) : undefined,
          format: t.format,
        },
      ],
    });
  }

  async getSignedDownloadUrl(fileId: string): Promise<string> {
    const details = await this.ik.getFileDetails(fileId);
    return (details as { url: string }).url;
  }

  async getUsage(): Promise<StorageUsage> {
    // ImageKit doesn't expose a direct usage API; return approximate values
    const totalBytes = 20 * 1024 * 1024 * 1024; // 20GB free tier
    return {
      usedBytes: 0,
      totalBytes,
      usedMB: 0,
      totalMB: 20 * 1024,
    };
  }

  async createFolder(path: string): Promise<void> {
    const parts = path.split('/').filter(Boolean);
    const folderName = parts.pop()!;
    const parentFolderPath = '/' + parts.join('/');
    await this.ik.createFolder({ folderName, parentFolderPath });
  }

  async renameResource(filePath: string, toPath: string): Promise<void> {
    const newFileName = toPath.split('/').filter(Boolean).pop()!;
    await this.ik.renameFile({ filePath, newFileName, purgeCache: false });
  }

  async copyResource(filePath: string, destFolder: string): Promise<void> {
    const filename = filePath.split('/').filter(Boolean).pop()!;
    const destinationPath = `${destFolder}/${filename}`;
    await (this.ik as unknown as { copyFile: (o: object) => Promise<void> })
      .copyFile({ sourceFilePath: filePath, destinationPath });
  }
}
