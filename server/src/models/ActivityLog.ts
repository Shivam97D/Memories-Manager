import mongoose, { Document, Schema } from 'mongoose';

export interface IActivityLog extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  storageAccountId?: mongoose.Types.ObjectId;
  shareId?: mongoose.Types.ObjectId;
  action: string;
  resourcePath?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    storageAccountId: { type: Schema.Types.ObjectId, ref: 'StorageAccount' },
    shareId: { type: Schema.Types.ObjectId, ref: 'PlatformShare' },
    action: { type: String, required: true },
    resourcePath: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, versionKey: false }
);

ActivityLogSchema.index({ userId: 1, createdAt: -1 });

export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
