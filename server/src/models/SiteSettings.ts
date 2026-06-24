import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    emailVerificationEnabled: { type: Boolean, default: false },
  },
  { collection: 'site_settings', timestamps: true }
);

export const SiteSettings = mongoose.model('SiteSettings', schema);

export async function getSettings() {
  let settings = await SiteSettings.findOne();
  if (!settings) {
    settings = await SiteSettings.create({ emailVerificationEnabled: false });
  }
  return settings;
}
