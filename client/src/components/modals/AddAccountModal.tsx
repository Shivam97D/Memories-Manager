import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InfoButton } from '@/components/ui/tooltip-info';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { StorageAccountType, StorageAccount } from '@/types';
import {
  CLOUDINARY_GUIDE,
  IMAGEKIT_GUIDE,
  GOOGLE_PHOTOS_GUIDE,
  BACKBLAZE_GUIDE,
} from '@/lib/setup-guides';

interface Props {
  open: boolean;
  onClose: () => void;
  editAccount?: StorageAccount | null;
}

type AccountTypeOption = {
  value: StorageAccountType;
  label: string;
  emoji: string;
  hasManager: boolean;
  description: string;
  freeStorage: string;
};

const ACCOUNT_TYPES: AccountTypeOption[] = [
  { value: 'CLOUDINARY', label: 'Cloudinary', emoji: '☁️', hasManager: true, description: 'Full file manager — upload, view, edit, share', freeStorage: '25 GB free' },
  { value: 'IMAGEKIT', label: 'ImageKit', emoji: '🖼️', hasManager: true, description: 'Full file manager with image transformations', freeStorage: '20 GB free' },
  { value: 'GOOGLE_PHOTOS', label: 'Google Photos', emoji: '📷', hasManager: false, description: 'Quick-access card with link vault', freeStorage: '15 GB/account' },
  { value: 'BACKBLAZE', label: 'Backblaze B2', emoji: '🔥', hasManager: false, description: 'S3-compatible storage, link vault', freeStorage: '10 GB free' },
  { value: 'OTHER', label: 'Other Storage', emoji: '📦', hasManager: false, description: 'Any cloud storage — add a link and notes', freeStorage: 'Varies' },
];

const GUIDE_MAP: Record<string, typeof CLOUDINARY_GUIDE> = {
  CLOUDINARY: CLOUDINARY_GUIDE,
  IMAGEKIT: IMAGEKIT_GUIDE,
  GOOGLE_PHOTOS: GOOGLE_PHOTOS_GUIDE,
  BACKBLAZE: BACKBLAZE_GUIDE,
};

export function AddAccountModal({ open, onClose, editAccount }: Props) {
  const qc = useQueryClient();
  const isEdit = !!editAccount;
  const [step, setStep] = useState<'type' | 'form'>(isEdit ? 'form' : 'type');
  const [selectedType, setSelectedType] = useState<StorageAccountType>(editAccount?.type || 'CLOUDINARY');

  const [form, setForm] = useState({
    name: editAccount?.name || '',
    email: editAccount?.email || '',
    notes: editAccount?.notes || '',
    link: editAccount?.link || '',
    // Cloudinary
    cloudName: '',
    apiKey: '',
    apiSecret: '',
    // ImageKit
    publicKey: '',
    privateKey: '',
    urlEndpoint: '',
  });

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      isEdit
        ? api.patch(`/accounts/${editAccount!._id}`, data)
        : api.post('/accounts', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      toast.success(isEdit ? 'Account updated' : 'Account added');
      handleClose();
    },
    onError: () => toast.error('Something went wrong'),
  });

  const handleClose = () => {
    setStep(isEdit ? 'form' : 'type');
    setForm({ name: '', email: '', notes: '', link: '', cloudName: '', apiKey: '', apiSecret: '', publicKey: '', privateKey: '', urlEndpoint: '' });
    onClose();
  };

  const buildCredentials = () => {
    if (selectedType === 'CLOUDINARY') {
      const creds: Record<string, string> = {};
      if (form.cloudName) creds.cloudName = form.cloudName;
      if (form.apiKey) creds.apiKey = form.apiKey;
      if (form.apiSecret) creds.apiSecret = form.apiSecret;
      return creds;
    }
    if (selectedType === 'IMAGEKIT') {
      const creds: Record<string, string> = {};
      if (form.publicKey) creds.publicKey = form.publicKey;
      if (form.privateKey) creds.privateKey = form.privateKey;
      if (form.urlEndpoint) creds.urlEndpoint = form.urlEndpoint;
      return creds;
    }
    return {};
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Account label is required'); return; }
    mutation.mutate({
      type: selectedType,
      name: form.name,
      email: form.email || undefined,
      notes: form.notes || undefined,
      link: form.link || undefined,
      credentials: buildCredentials(),
    });
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const selectedTypeInfo = ACCOUNT_TYPES.find((t) => t.value === selectedType);
  const guide = GUIDE_MAP[selectedType];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? `Edit — ${editAccount?.name}`
              : step === 'type'
              ? 'Add Storage Account'
              : `${selectedTypeInfo?.emoji} Add ${selectedTypeInfo?.label}`}
          </DialogTitle>
        </DialogHeader>

        {/* ── Step 1: Choose type ── */}
        {step === 'type' && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-3">
              Choose the type of storage account to add. Cloudinary and ImageKit have full file managers built in.
            </p>
            {ACCOUNT_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => { setSelectedType(t.value); setStep('form'); }}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary text-left transition-colors group"
              >
                <span className="text-2xl">{t.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{t.label}</p>
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                      {t.freeStorage}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
                <span className="text-muted-foreground group-hover:text-foreground transition-colors">→</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Step 2: Form ── */}
        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Info button for types that have a guide */}
            {guide && (
              <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg border border-accent">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{selectedTypeInfo?.emoji}</span>
                  <div>
                    <p className="text-xs font-medium">{selectedTypeInfo?.label}</p>
                    <p className="text-xs text-muted-foreground">{selectedTypeInfo?.freeStorage}</p>
                  </div>
                </div>
                <InfoButton guide={guide} />
              </div>
            )}

            <Input
              label="Account Label *"
              placeholder={
                selectedType === 'CLOUDINARY' ? 'e.g. Personal Cloudinary'
                : selectedType === 'IMAGEKIT' ? 'e.g. Work ImageKit'
                : selectedType === 'GOOGLE_PHOTOS' ? 'e.g. Gmail Backup Account 2'
                : 'e.g. My Storage'
              }
              value={form.name}
              onChange={set('name')}
              required
            />

            <Input
              label="Account Email"
              type="email"
              placeholder="the email used to create this account"
              value={form.email}
              onChange={set('email')}
            />

            {/* ── Cloudinary fields ── */}
            {selectedType === 'CLOUDINARY' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">API Credentials</p>
                  {isEdit && <p className="text-xs text-muted-foreground">Leave blank to keep existing</p>}
                </div>
                <Input
                  label="Cloud Name *"
                  placeholder="my-cloud-abc123"
                  value={form.cloudName}
                  onChange={set('cloudName')}
                  required={!isEdit}
                />
                <Input
                  label="API Key *"
                  placeholder="123456789012345"
                  value={form.apiKey}
                  onChange={set('apiKey')}
                  required={!isEdit}
                />
                <Input
                  label="API Secret *"
                  type="password"
                  placeholder="••••••••••••••••••••"
                  value={form.apiSecret}
                  onChange={set('apiSecret')}
                  required={!isEdit}
                />
                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <span>🔒</span>
                  <span>Credentials are encrypted with AES-256 and stored only on our server. Never sent to your browser.</span>
                </p>
              </div>
            )}

            {/* ── ImageKit fields ── */}
            {selectedType === 'IMAGEKIT' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">API Credentials</p>
                  {isEdit && <p className="text-xs text-muted-foreground">Leave blank to keep existing</p>}
                </div>
                <Input
                  label="Public Key *"
                  placeholder="public_••••••••••••••••"
                  value={form.publicKey}
                  onChange={set('publicKey')}
                  required={!isEdit}
                />
                <Input
                  label="Private Key *"
                  type="password"
                  placeholder="private_••••••••••••••"
                  value={form.privateKey}
                  onChange={set('privateKey')}
                  required={!isEdit}
                />
                <Input
                  label="URL Endpoint *"
                  placeholder="https://ik.imagekit.io/your_id"
                  value={form.urlEndpoint}
                  onChange={set('urlEndpoint')}
                  required={!isEdit}
                />
                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <span>🔒</span>
                  <span>Credentials are encrypted with AES-256 and stored only on our server. Never sent to your browser.</span>
                </p>
              </div>
            )}

            {/* ── Link-only types ── */}
            {['GOOGLE_PHOTOS', 'BACKBLAZE', 'OTHER'].includes(selectedType) && (
              <div className="space-y-3">
                <Input
                  label="Link / URL"
                  placeholder={
                    selectedType === 'GOOGLE_PHOTOS'
                      ? 'https://photos.google.com/'
                      : selectedType === 'BACKBLAZE'
                      ? 'https://secure.backblaze.com/b2_buckets.htm'
                      : 'https://...'
                  }
                  value={form.link}
                  onChange={set('link')}
                />
                <p className="text-xs text-muted-foreground">
                  {selectedType === 'GOOGLE_PHOTOS'
                    ? 'The link to this Google account\'s Photos page. Clicking the card will open it directly.'
                    : 'A link to access this storage account. Stored securely in your vault.'}
                </p>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Notes</label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={2}
                placeholder={
                  selectedType === 'GOOGLE_PHOTOS'
                    ? 'e.g. "Work photos 2022-2024, password hint: fav movie + year"'
                    : 'Any notes about this account...'
                }
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>

            <div className="flex gap-2 pt-1">
              {!isEdit && (
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep('type')}>
                  ← Back
                </Button>
              )}
              <Button type="submit" className="flex-1" loading={mutation.isPending}>
                {isEdit ? 'Save Changes' : `Add ${selectedTypeInfo?.label}`}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
