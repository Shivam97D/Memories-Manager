import mongoose, { Document, Schema } from 'mongoose';

export type StorageAccountType =
  | 'GOOGLE_PHOTOS'
  | 'CLOUDINARY'
  | 'IMAGEKIT'
  | 'BACKBLAZE'
  | 'OTHER';

export interface IStorageAccount extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: StorageAccountType;
  name: string;
  email?: string;
  notes?: string;
  link?: string;
  credentials: string; // AES-256 encrypted JSON string
  storageUsedMB?: number;
  storageTotalMB?: number;
  addedAt: Date;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StorageAccountSchema = new Schema<IStorageAccount>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['GOOGLE_PHOTOS', 'CLOUDINARY', 'IMAGEKIT', 'BACKBLAZE', 'OTHER'],
      required: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    notes: { type: String },
    link: { type: String },
    credentials: { type: String, required: true }, // encrypted
    storageUsedMB: { type: Number },
    storageTotalMB: { type: Number },
    addedAt: { type: Date, default: Date.now },
    lastSyncAt: { type: Date },
  },
  { timestamps: true }
);

StorageAccountSchema.index({ userId: 1, addedAt: -1 });

export const StorageAccount = mongoose.model<IStorageAccount>('StorageAccount', StorageAccountSchema);
