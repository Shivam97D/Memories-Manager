import mongoose, { Document, Schema } from 'mongoose';

export type Permission = 'VIEW' | 'DOWNLOAD' | 'EDIT' | 'DELETE';
export type ResourceType = 'FOLDER' | 'FILE';

export interface IPlatformShare extends Document {
  _id: mongoose.Types.ObjectId;
  fromUserId: mongoose.Types.ObjectId;
  toUserId: mongoose.Types.ObjectId;
  storageAccountId: mongoose.Types.ObjectId;
  resourcePath: string;
  resourceType: ResourceType;
  permissions: Permission[];
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlatformShareSchema = new Schema<IPlatformShare>(
  {
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    storageAccountId: { type: Schema.Types.ObjectId, ref: 'StorageAccount', required: true },
    resourcePath: { type: String, required: true },
    resourceType: { type: String, enum: ['FOLDER', 'FILE'], required: true },
    permissions: [{ type: String, enum: ['VIEW', 'DOWNLOAD', 'EDIT', 'DELETE'] }],
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PlatformShareSchema.index({ fromUserId: 1 });
PlatformShareSchema.index({ toUserId: 1 });
PlatformShareSchema.index({ storageAccountId: 1 });

export const PlatformShare = mongoose.model<IPlatformShare>('PlatformShare', PlatformShareSchema);
