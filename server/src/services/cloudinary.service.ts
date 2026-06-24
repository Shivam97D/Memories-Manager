import { v2 as cloudinary } from 'cloudinary';
import {
  StorageAdapter,
  FolderContents,
  MediaItem,
  StorageUsage,
  UploadResult,
  Transform,
} from './storage.types';

export interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export class CloudinaryService implements StorageAdapter {
  private cld: typeof cloudinary;

  constructor(creds: CloudinaryCredentials) {
    this.cld = cloudinary;
    this.cld.config({
      cloud_name: creds.cloudName,
      api_key: creds.apiKey,
      api_secret: creds.apiSecret,
      secure: true,
    });
  }

  async listFolder(path = '', cursor?: string): Promise<FolderContents> {
    const folderPath = path || '';

    // Get sub-folders
    const foldersResult = await this.cld.api.sub_folders(folderPath || '/').catch(() => ({ folders: [] }));
    const folders: MediaItem[] = (foldersResult.folders || []).map((f: { name: string; path: string }) => ({
      id: f.path,
      name: f.name,
      type: 'folder' as const,
      path: f.path,
    }));

    // Get resources in folder
    const searchExp = folderPath
      ? `folder="${folderPath}"`
      : 'folder=""';

    const resourcesResult = await this.cld.search
      .expression(searchExp)
      .max_results(50)
      .with_field('tags')
      .with_field('context')
      .next_cursor(cursor || '')
      .execute();

    const files: MediaItem[] = (resourcesResult.resources || []).map((r: {
      public_id: string;
      display_name?: string;
      resource_type: string;
      format?: string;
      bytes?: number;
      width?: number;
      height?: number;
      secure_url: string;
      created_at: string;
      tags?: string[];
    }) => ({
      id: r.public_id,
      name: r.display_name || r.public_id.split('/').pop() || r.public_id,
      type: 'file' as const,
      mimeType: r.resource_type === 'image' ? `image/${r.format}` : r.resource_type,
      size: r.bytes,
      width: r.width,
      height: r.height,
      url: r.secure_url,
      thumbnailUrl: r.resource_type === 'image'
        ? this.cld.url(r.public_id, { width: 300, height: 300, crop: 'fill', quality: 'auto' })
        : r.secure_url,
      publicId: r.public_id,
      path: r.public_id,
      format: r.format,
      createdAt: new Date(r.created_at),
      tags: r.tags,
    }));

    return {
      items: [...folders, ...files],
      nextCursor: resourcesResult.next_cursor,
      totalCount: resourcesResult.total_count,
    };
  }

  async getSignedUploadParams(folder: string, _fileName: string): Promise<Record<string, string>> {
    const timestamp = Math.round(Date.now() / 1000);
    // Only include params that will ALSO be sent in the form data — any mismatch
    // between signed params and sent params causes Cloudinary to reject the upload.
    const sigParams = { timestamp, folder };
    const signature = this.cld.utils.api_sign_request(
      sigParams,
      this.cld.config().api_secret as string
    );
    return {
      signature,
      timestamp: String(timestamp),
      folder,
      api_key: this.cld.config().api_key as string,
      cloud_name: this.cld.config().cloud_name as string,
    };
  }

  async deleteResource(publicId: string, resourceType = 'image'): Promise<void> {
    await this.cld.uploader.destroy(publicId, { resource_type: resourceType as 'image' | 'video' | 'raw' });
  }

  getTransformUrl(publicId: string, transforms: Transform[]): string {
    const t = transforms[0] || {};
    return this.cld.url(publicId, {
      width: t.width,
      height: t.height,
      crop: t.crop || 'fill',
      quality: t.quality || 'auto',
      format: t.format || 'auto',
      effect: t.effect,
      secure: true,
    });
  }

  async getSignedDownloadUrl(publicId: string, expiresInSeconds = 3600): Promise<string> {
    return this.cld.utils.private_download_url(publicId, 'jpg', {
      expires_at: Math.round(Date.now() / 1000) + expiresInSeconds,
    });
  }

  async getUsage(): Promise<StorageUsage> {
    const usage = await this.cld.api.usage();
    const usedBytes = usage.storage?.usage || 0;
    const totalBytes = usage.storage?.limit || 25 * 1024 * 1024 * 1024;
    return {
      usedBytes,
      totalBytes,
      usedMB: Math.round(usedBytes / (1024 * 1024)),
      totalMB: Math.round(totalBytes / (1024 * 1024)),
    };
  }

  async createFolder(path: string): Promise<void> {
    await this.cld.api.create_folder(path);
  }

  async renameResource(fromPath: string, toPath: string): Promise<void> {
    await this.cld.uploader.rename(fromPath, toPath);
  }

  async copyResource(publicId: string, destFolder: string): Promise<void> {
    const sourceUrl = this.cld.url(publicId, { secure: true });
    const filename = publicId.split('/').pop()!;
    const destPublicId = [destFolder, filename].filter(Boolean).join('/');
    await this.cld.uploader.upload(sourceUrl, { public_id: destPublicId });
  }
}
