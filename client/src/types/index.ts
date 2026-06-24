export type StorageAccountType = 'GOOGLE_PHOTOS' | 'CLOUDINARY' | 'IMAGEKIT' | 'BACKBLAZE' | 'OTHER';
export type Permission = 'VIEW' | 'DOWNLOAD' | 'EDIT' | 'DELETE';
export type ResourceType = 'FOLDER' | 'FILE';
export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  createdAt: string;
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  isSuspended: boolean;
  emailVerified: boolean;
  accountCount: number;
  createdAt: string;
}

export interface StorageAccount {
  _id: string;
  userId: string;
  type: StorageAccountType;
  name: string;
  email?: string;
  notes?: string;
  link?: string;
  storageUsedMB?: number;
  storageTotalMB?: number;
  addedAt: string;
  lastSyncAt?: string;
  createdAt: string;
}

export interface SharedAlbum {
  _id: string;
  userId: string;
  name: string;
  sharedToEmail?: string;
  sharedFromEmail?: string;
  link: string;
  notes?: string;
  addedAt: string;
  createdAt: string;
}

export interface PlatformShare {
  _id: string;
  fromUserId: User | string;
  toUserId: User | string;
  storageAccountId: StorageAccount | string;
  resourcePath: string;
  resourceType: ResourceType;
  permissions: Permission[];
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

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
  createdAt?: string;
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

export interface ActivityLog {
  _id: string;
  userId: string;
  storageAccountId?: string;
  shareId?: string;
  action: string;
  resourcePath?: string;
  createdAt: string;
}

export type CardType = 'account' | 'shared-album';
