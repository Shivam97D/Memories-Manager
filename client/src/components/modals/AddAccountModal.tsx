import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { StorageAccountType, StorageAccount } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  editAccount?: StorageAccount | null;
}

type AccountTypeOption = { value: StorageAccountType; label: string; emoji: string; hasManager: boolean };

const ACCOUNT_TYPES: AccountTypeOption[] = [
  { value: 'CLOUDINARY', label: 'Cloudinary', emoji: '☁️', hasManager: true },
  { value: 'IMAGEKIT', label: 'ImageKit', emoji: '🖼️', hasManager: true },
  { value: 'GOOGLE_PHOTOS', label: 'Google Photos', emoji: '📷', hasManager: false },
  { value: 'BACKBLAZE', label: 'Backblaze B2', emoji: '🔥', hasManager: false },
  { value: 'OTHER', label: 'Other Storage', emoji: '📦', hasManager: false },
];

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
      return { cloudName: form.cloudName, apiKey: form.apiKey, apiSecret: form.apiSecret };
    }
    if (selectedType === 'IMAGEKIT') {
      return { publicKey: form.publicKey, privateKey: form.privateKey, urlEndpoint: form.urlEndpoint };
    }
    return {};
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    mutation.mutate({
      type: selectedType,
      name: form.name,
      email: form.email || undefined,
      notes: form.notes || undefined,
      link: form.link || undefined,
      credentials: buildCredentials(),
    });
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Account' : step === 'type' ? 'Add Storage Account' : `Add ${ACCOUNT_TYPES.find(t => t.value === selectedType)?.label}`}</DialogTitle>
        </DialogHeader>

        {/* Step 1: Choose type */}
        {step === 'type' && (
          <div className="grid grid-cols-1 gap-2">
            {ACCOUNT_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => { setSelectedType(t.value); setStep('form'); }}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary text-left transition-colors"
              >
                <span className="text-2xl">{t.emoji}</span>
                <div>
                  <p className="font-medium text-sm">{t.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.hasManager ? 'Full file manager included' : 'Link & credential vault'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Form */}
        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Account Label *" placeholder="e.g. Personal Cloudinary" value={form.name} onChange={set('name')} required />
            <Input label="Account Email" type="email" placeholder="account@email.com" value={form.email} onChange={set('email')} />

            {/* Cloudinary fields */}
            {selectedType === 'CLOUDINARY' && (
              <>
                <Input label="Cloud Name *" placeholder="your-cloud-name" value={form.cloudName} onChange={set('cloudName')} required={!isEdit} />
                <Input label="API Key *" placeholder="123456789012345" value={form.apiKey} onChange={set('apiKey')} required={!isEdit} />
                <Input label="API Secret *" type="password" placeholder="••••••••••••••••" value={form.apiSecret} onChange={set('apiSecret')} required={!isEdit} />
                {isEdit && <p className="text-xs text-muted-foreground">Leave API fields empty to keep existing credentials.</p>}
              </>
            )}

            {/* ImageKit fields */}
            {selectedType === 'IMAGEKIT' && (
              <>
                <Input label="Public Key *" placeholder="public_••••••••" value={form.publicKey} onChange={set('publicKey')} required={!isEdit} />
                <Input label="Private Key *" type="password" placeholder="private_••••••••" value={form.privateKey} onChange={set('privateKey')} required={!isEdit} />
                <Input label="URL Endpoint *" placeholder="https://ik.imagekit.io/your-id" value={form.urlEndpoint} onChange={set('urlEndpoint')} required={!isEdit} />
                {isEdit && <p className="text-xs text-muted-foreground">Leave key fields empty to keep existing credentials.</p>}
              </>
            )}

            {/* Link-only types */}
            {['GOOGLE_PHOTOS', 'BACKBLAZE', 'OTHER'].includes(selectedType) && (
              <Input label="Link / URL" placeholder="https://photos.google.com/..." value={form.link} onChange={set('link')} />
            )}

            <div>
              <label className="text-sm font-medium text-foreground">Notes</label>
              <textarea
                className="mt-1.5 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={2}
                placeholder="Any notes about this account..."
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>

            <div className="flex gap-2 pt-2">
              {!isEdit && (
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep('type')}>
                  Back
                </Button>
              )}
              <Button type="submit" className="flex-1" loading={mutation.isPending}>
                {isEdit ? 'Save Changes' : 'Add Account'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
