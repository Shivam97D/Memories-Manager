import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  passwordHash: string;
  emailVerified: boolean;
  otp?: string;
  otpExpiresAt?: Date;
  refreshTokens: string[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(plain: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, index: false, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    avatar: { type: String },
    passwordHash: { type: String, required: true },
    emailVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpiresAt: { type: Date },
    refreshTokens: [{ type: String }],
  },
  { timestamps: true }
);

UserSchema.methods.comparePassword = async function (plain: string): Promise<boolean> {
  return bcrypt.compare(plain, this.passwordHash);
};

UserSchema.pre('save', async function (next) {
  if (this.isModified('passwordHash') && !this.passwordHash.startsWith('$2')) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  }
  next();
});

UserSchema.index({ email: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
