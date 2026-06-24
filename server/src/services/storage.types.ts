export interface MediaItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
  url?: string;
  thumbnailUrl?: string;
  publicId?: string;
  path: string;
  createdAt?: Date;
  updatedAt?: Date;
  format?: string;
  tags?: string[];
}

export interface FolderContents {
  items: MediaItem[];
  nextCursor?: string;
  totalCount?: number;
}

export interface StorageUsage {
  usedBytes: number;
  totalBytes: number;
  usedMB: number;
  totalMB: number;
}

export interface UploadResult extends MediaItem {
  secureUrl: string;
}

export interface Transform {
  width?: number;
  height?: number;
  crop?: string;
  quality?: number | string;
  format?: string;
  effect?: string;
}

export interface StorageAdapter {
  listFolder(path: string, cursor?: string): Promise<FolderContents>;
  getSignedUploadParams(folder: string, fileName: string): Promise<Record<string, string>>;
  deleteResource(publicId: string, resourceType?: string): Promise<void>;
  getTransformUrl(publicId: string, transforms: Transform[]): string;
  getSignedDownloadUrl(publicId: string, expiresInSeconds?: number): Promise<string>;
  getUsage(): Promise<StorageUsage>;
  createFolder(path: string): Promise<void>;
  renameResource(fromPath: string, toPath: string): Promise<void>;
  copyResource(source: string, destFolder: string): Promise<void>;
}
