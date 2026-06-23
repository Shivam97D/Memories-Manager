import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, UserX, FolderOpen, File, Eye, Download, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { PlatformShare, Permission, User, StorageAccount } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { timeAgo, getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';

const PERM_ICONS: Record<Permission, React.ReactNode> = {
  VIEW: <Eye className="h-3 w-3" />,
  DOWNLOAD: <Download className="h-3 w-3" />,
  EDIT: <Upload className="h-3 w-3" />,
  DELETE: <Trash2 className="h-3 w-3" />,
};

export function MySharesPage() {
  const qc = useQueryClient();

  const { data: shares = [], isLoading } = useQuery<PlatformShare[]>({
    queryKey: ['shares-sent'],
    queryFn: () => api.get('/shares/sent').then((r) => r.data),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => api.delete(`/shares/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shares-sent'] }); toast.success('Share revoked'); },
    onError: () => toast.error('Failed to revoke'),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/shares/${id}/permissions`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shares-sent'] }),
    onError: () => toast.error('Failed to update share'),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 h-48 animate-pulse" />
        ))}
      </div>
    );
  }

  if (shares.length === 0) {
    return (
      <div className="text-center py-20 space-y-3">
        <div className="text-6xl">📤</div>
        <h3 className="text-lg font-medium">No shares yet</h3>
        <p className="text-muted-foreground text-sm">Open a storage account and share a folder or file with another user.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{shares.length} active share{shares.length !== 1 && 's'}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {shares.map((share) => {
          const toUser = share.toUserId as User;
          const account = share.storageAccountId as StorageAccount;
          return (
            <div key={share._id} className="bg-card border border-border rounded-xl p-5 space-y-4 animate-fade-in">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {getInitials(toUser.name)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{toUser.name}</p>
                    <p className="text-xs text-muted-foreground">{toUser.email}</p>
                  </div>
                </div>
                <Badge variant={share.isActive ? 'success' : 'secondary'}>
                  {share.isActive ? 'Active' : 'Paused'}
                </Badge>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  {share.resourceType === 'FOLDER' ? (
                    <FolderOpen className="h-4 w-4 text-amber-500" />
                  ) : (
                    <File className="h-4 w-4 text-blue-500" />
                  )}
                  <span className="font-medium truncate">{share.resourcePath}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  from <span className="font-medium text-foreground">{account.name}</span>
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {share.permissions.map((p) => (
                  <span key={p} className="inline-flex items-center gap-1 text-xs bg-secondary px-2 py-0.5 rounded-full">
                    {PERM_ICONS[p]} {p}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">Shared {timeAgo(share.createdAt)}</span>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => toggleMut.mutate({ id: share._id, isActive: !share.isActive })}
                    loading={toggleMut.isPending}
                  >
                    {share.isActive ? <UserX className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {share.isActive ? 'Pause' : 'Resume'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => { if (confirm('Revoke this share?')) revokeMut.mutate(share._id); }}
                  >
                    <Trash2 className="h-3 w-3" /> Revoke
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
