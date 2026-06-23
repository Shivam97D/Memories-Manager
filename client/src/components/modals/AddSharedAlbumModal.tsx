import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { SharedAlbum } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  editAlbum?: SharedAlbum | null;
}

export function AddSharedAlbumModal({ open, onClose, editAlbum }: Props) {
  const qc = useQueryClient();
  const isEdit = !!editAlbum;

  const [form, setForm] = useState({
    name: editAlbum?.name || '',
    link: editAlbum?.link || '',
    sharedFromEmail: editAlbum?.sharedFromEmail || '',
    sharedToEmail: editAlbum?.sharedToEmail || '',
    notes: editAlbum?.notes || '',
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      isEdit
        ? api.patch(`/accounts/shared-albums/${editAlbum!._id}`, data)
        : api.post('/accounts/shared-albums/new', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      toast.success(isEdit ? 'Album updated' : 'Album added');
      onClose();
    },
    onError: () => toast.error('Something went wrong'),
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.link.trim()) { toast.error('Name and link are required'); return; }
    mutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Shared Album' : 'Add Shared Album'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Album Name *" placeholder="Family Summer 2024" value={form.name} onChange={set('name')} required />
          <Input label="Album Link *" placeholder="https://photos.google.com/share/..." value={form.link} onChange={set('link')} required />
          <Input label="Shared From (email)" type="email" placeholder="sender@gmail.com" value={form.sharedFromEmail} onChange={set('sharedFromEmail')} />
          <Input label="Shared To (your email)" type="email" placeholder="you@gmail.com" value={form.sharedToEmail} onChange={set('sharedToEmail')} />
          <div>
            <label className="text-sm font-medium">Notes</label>
            <textarea
              className="mt-1.5 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={2}
              value={form.notes}
              onChange={set('notes')}
              placeholder="Any notes..."
            />
          </div>
          <Button type="submit" className="w-full" loading={mutation.isPending}>
            {isEdit ? 'Save Changes' : 'Add Album'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
