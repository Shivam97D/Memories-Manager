import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Permission, ResourceType } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  storageAccountId: string;
  resourcePath: string;
  resourceType: ResourceType;
  resourceName: string;
}

const PERMISSIONS: { value: Permission; label: string; desc: string }[] = [
  { value: 'VIEW', label: 'View', desc: 'Can browse and preview' },
  { value: 'DOWNLOAD', label: 'Download', desc: 'Can download files' },
  { value: 'EDIT', label: 'Upload', desc: 'Can upload new files' },
  { value: 'DELETE', label: 'Delete', desc: 'Can delete files' },
];

export function ShareResourceModal({ open, onClose, storageAccountId, resourcePath, resourceType, resourceName }: Props) {
  const qc = useQueryClient();
  const [toUserEmail, setToUserEmail] = useState('');
  const [permissions, setPermissions] = useState<Permission[]>(['VIEW']);
  const [expiresAt, setExpiresAt] = useState('');

  const togglePerm = (p: Permission) => {
    setPermissions((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const mutation = useMutation({
    mutationFn: () => api.post('/shares', {
      toUserEmail,
      storageAccountId,
      resourcePath,
      resourceType,
      permissions,
      expiresAt: expiresAt || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shares-sent'] });
      toast.success(`Shared with ${toUserEmail}`);
      onClose();
      setToUserEmail('');
      setPermissions(['VIEW']);
      setExpiresAt('');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err?.response?.data?.error || 'Failed to share');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share "{resourceName}"</DialogTitle>
          <DialogDescription>Share this {resourceType.toLowerCase()} with another PixelVault user.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            label="Share with (email) *"
            type="email"
            placeholder="user@example.com"
            value={toUserEmail}
            onChange={(e) => setToUserEmail(e.target.value)}
          />

          <div>
            <label className="text-sm font-medium block mb-2">Permissions</label>
            <div className="grid grid-cols-2 gap-2">
              {PERMISSIONS.map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => togglePerm(value)}
                  className={cn(
                    'flex flex-col items-start p-3 rounded-lg border text-left transition-colors',
                    permissions.includes(value)
                      ? 'border-primary bg-accent text-accent-foreground'
                      : 'border-border hover:bg-secondary'
                  )}
                >
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Expires at (optional)"
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />

          <Button
            className="w-full"
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!toUserEmail || permissions.length === 0}
          >
            Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
