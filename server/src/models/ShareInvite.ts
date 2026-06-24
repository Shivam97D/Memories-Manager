import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';
import { Permission } from './PlatformShare';

export interface IShareInvite extends Document {
  _id: mongoose.Types.ObjectId;
  token: string;
  fromUserId: mongoose.Types.ObjectId;
  storageAccountId: mongoose.Types.ObjectId;
  resourcePath: string;
  resourceType: 'FOLDER' | 'FILE';
  permissions: Permission[];
  expiresAt?: Date;
  isActive: boolean;
  acceptedBy: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const ShareInviteSchema = new Schema<IShareInvite>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomBytes(24).toString('hex'),
    },
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    storageAccountId: { type: Schema.Types.ObjectId, ref: 'StorageAccount', required: true },
    resourcePath: { type: String, required: true },
    resourceType: { type: String, enum: ['FOLDER', 'FILE'], required: true },
    permissions: [{ type: String, enum: ['VIEW', 'DOWNLOAD', 'EDIT', 'DELETE'] }],
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    acceptedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

ShareInviteSchema.index({ token: 1 });
ShareInviteSchema.index({ fromUserId: 1 });

export const ShareInvite = mongoose.model<IShareInvite>('ShareInvite', ShareInviteSchema);
