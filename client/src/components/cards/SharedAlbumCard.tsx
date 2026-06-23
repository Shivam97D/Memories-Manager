import { ExternalLink, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { SharedAlbum } from '@/types';
import { Button } from '@/components/ui/button';
import { timeAgo } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface Props {
  album: SharedAlbum;
  onEdit: (album: SharedAlbum) => void;
}

export function SharedAlbumCard({ album, onEdit }: Props) {
  const qc = useQueryClient();

  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/accounts/shared-albums/${album._id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); toast.success('Album removed'); },
    onError: () => toast.error('Failed to delete'),
  });

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4 hover:shadow-md transition-shadow animate-fade-in">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg bg-green-500">
            📂
          </div>
          <div>
            <h3 className="font-semibold text-sm leading-tight">{album.name}</h3>
            <span className="text-xs text-muted-foreground">Shared Album</span>
          </div>
        </div>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="z-50 min-w-[140px] rounded-lg border border-border bg-card shadow-lg p-1" sideOffset={4} align="end">
              <DropdownMenu.Item className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md cursor-pointer hover:bg-secondary" onSelect={() => onEdit(album)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md cursor-pointer hover:bg-red-50 text-red-600"
                onSelect={() => { if (confirm('Remove this album?')) deleteMut.mutate(); }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        {album.sharedFromEmail && <p>From: <span className="text-foreground">{album.sharedFromEmail}</span></p>}
        {album.sharedToEmail && <p>To: <span className="text-foreground">{album.sharedToEmail}</span></p>}
        {album.notes && <p className="line-clamp-2">{album.notes}</p>}
      </div>

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground">Added {timeAgo(album.addedAt)}</span>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => window.open(album.link, '_blank')}>
          Open <ExternalLink className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
