import { StorageAdapter } from './storage.types';
import { CloudinaryService, CloudinaryCredentials } from './cloudinary.service';
import { ImageKitService, ImageKitCredentials } from './imagekit.service';
import { StorageAccountType } from '../models/StorageAccount';
import { decryptJSON } from '../utils/encryption';

export function createAdapter(type: StorageAccountType, encryptedCredentials: string): StorageAdapter {
  const creds = decryptJSON<Record<string, string>>(encryptedCredentials);

  switch (type) {
    case 'CLOUDINARY':
      return new CloudinaryService(creds as unknown as CloudinaryCredentials);
    case 'IMAGEKIT':
      return new ImageKitService(creds as unknown as ImageKitCredentials);
    default:
      throw new Error(`No storage adapter for type: ${type}`);
  }
}
