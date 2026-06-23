import mongoose, { Document, Schema } from 'mongoose';

export interface ISharedAlbum extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  sharedToEmail?: string;
  sharedFromEmail?: string;
  link: string;
  notes?: string;
  addedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SharedAlbumSchema = new Schema<ISharedAlbum>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    sharedToEmail: { type: String, trim: true, lowercase: true },
    sharedFromEmail: { type: String, trim: true, lowercase: true },
    link: { type: String, required: true },
    notes: { type: String },
    addedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const SharedAlbum = mongoose.model<ISharedAlbum>('SharedAlbum', SharedAlbumSchema);
