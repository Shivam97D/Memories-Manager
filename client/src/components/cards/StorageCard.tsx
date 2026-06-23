import { useNavigate } from 'react-router-dom';
import { ExternalLink, MoreVertical, Pencil, Trash2, RefreshCw, ArrowRight } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { StorageAccount } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn, formatMB, getAccountTypeColor, getAccountTypeLabel, timeAgo } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface Props {
  account: StorageAccount;
  onEdit: (account: StorageAccount) => void;
}

const typeIcons: Record<string, string> = {
  CLOUDINARY: '☁️',
  IMAGEKIT: '🖼️',
  GOOGLE_PHOTOS: '📷',
  BACKBLAZE: '🔥',
  OTHER: '📦',
};

export function StorageCard({ account, onEdit }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const hasManager = ['CLOUDINARY', 'IMAGEKIT'].includes(account.type);
  const hasLink = !!account.link;

  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/accounts/${account._id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); toast.success('Account removed'); },
    onError: () => toast.error('Failed to delete'),
  });

  const syncMut = useMutation({
    mutationFn: () => api.get(`/accounts/${account._id}/usage`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); toast.success('Usage synced'); },
    onError: () => toast.error('Sync failed'),
  });

  const handleOpen = () => {
    if (hasManager) navigate(`/manager/${account._id}?type=${account.type.toLowerCase()}`);
    else if (hasLink) window.open(account.link!, '_blank');
  };

  const usedPct = account.storageUsedMB && account.storageTotalMB
    ? (account.storageUsedMB / account.storageTotalMB) * 100
    : null;

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4 hover:shadow-md transition-shadow animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-lg', getAccountTypeColor(account.type))}>
            {typeIcons[account.type]}
          </div>
          <div>
            <h3 className="font-semibold text-sm leading-tight">{account.name}</h3>
            <Badge variant="outline" className="mt-0.5 text-xs">{getAccountTypeLabel(account.type)}</Badge>
          </div>
        </div>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-[140px] rounded-lg border border-border bg-card shadow-lg p-1"
              sideOffset={4}
              align="end"
            >
              <DropdownMenu.Item
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md cursor-pointer hover:bg-secondary"
                onSelect={() => onEdit(account)}
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </DropdownMenu.Item>
              {hasManager && (
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md cursor-pointer hover:bg-secondary"
                  onSelect={() => syncMut.mutate()}
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', syncMut.isPending && 'animate-spin')} /> Sync Usage
                </DropdownMenu.Item>
              )}
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md cursor-pointer hover:bg-red-50 text-red-600"
                onSelect={() => { if (confirm('Remove this account?')) deleteMut.mutate(); }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* Info */}
      <div className="space-y-1.5 text-xs text-muted-foreground">
        {account.email && (
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-foreground truncate">{account.email}</span>
          </div>
        )}
        {account.notes && <p className="line-clamp-2">{account.notes}</p>}
      </div>

      {/* Storage bar */}
      {usedPct !== null && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatMB(account.storageUsedMB!)} used</span>
            <span>{formatMB(account.storageTotalMB!)} total</span>
          </div>
          <Progress value={account.storageUsedMB!} max={account.storageTotalMB!} />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground">Added {timeAgo(account.addedAt)}</span>
        {(hasManager || hasLink) && (
          <Button
            variant={hasManager ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={handleOpen}
          >
            {hasManager ? (
              <>Open Manager <ArrowRight className="h-3 w-3" /></>
            ) : (
              <>Open <ExternalLink className="h-3 w-3" /></>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
