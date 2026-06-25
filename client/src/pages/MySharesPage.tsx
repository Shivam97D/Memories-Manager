import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Trash2, Eye, Download, Upload, FolderOpen, File,
  Clock, UserX, RefreshCw, Check, ChevronDown, ChevronUp,
} from 'lucide-react';
import { api } from '@/lib/api';
import { PlatformShare, Permission, User, StorageAccount } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, timeAgo, getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';

const ALL_PERMS: { value: Permission; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'VIEW',     label: 'View',     icon: <Eye className="h-3 w-3" />,      color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'DOWNLOAD', label: 'Download', icon: <Download className="h-3 w-3" />, color: 'text-green-600 bg-green-50 border-green-200' },
  { value: 'EDIT',     label: 'Upload',   icon: <Upload className="h-3 w-3" />,   color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'DELETE',   label: 'Delete',   icon: <Trash2 className="h-3 w-3" />,   color: 'text-red-600 bg-red-50 border-red-200' },
];

interface ShareCardProps {
  share: PlatformShare;
  onRevoke: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onUpdatePerms: (id: string, permissions: Permission[]) => void;
  isMutating: boolean;
}

function ShareCard({ share, onRevoke, onToggleActive, onUpdatePerms, isMutating }: ShareCardProps) {
  const toUser = share.toUserId as User;
  const account = share.storageAccountId as StorageAccount;
  const isExpired = share.expiresAt ? new Date(share.expiresAt) < new Date() : false;

  const [editingPerms, setEditingPerms] = useState<Permission[] | null>(null);
  const [expanded, setExpanded] = useState(false);

  const currentPerms = editingPerms ?? share.permissions;
  const isDirty = editingPerms !== null &&
    JSON.stringify([...editingPerms].sort()) !== JSON.stringify([...share.permissions].sort());

  const togglePerm = (p: Permission) => {
    const base = editingPerms ?? [...share.permissions];
    if (p === 'VIEW') return; // VIEW is always required
    setEditingPerms(
      base.includes(p) ? base.filter((x) => x !== p) : [...base, p]
    );
  };

  const cancelEdit = () => setEditingPerms(null);

  const savePerms = () => {
    if (!editingPerms) return;
    onUpdatePerms(share._id, editingPerms);
    setEditingPerms(null);
  };

  return (
    <div className={cn(
      'bg-card border rounded-xl overflow-hidden transition-all',
      !share.isActive || isExpired ? 'border-border opacity-70' : 'border-border',
    )}>
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold flex-shrink-0">
          {getInitials(toUser?.name || '?')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{toUser?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{toUser?.email}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {isExpired ? (
                <Badge variant="destructive">Expired</Badge>
              ) : (
                <Badge variant={share.isActive ? 'success' : 'secondary'}>
                  {share.isActive ? 'Active' : 'Paused'}
                </Badge>
              )}
            </div>
          </div>

          {/* Resource */}
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            {share.resourceType === 'FOLDER'
              ? <FolderOpen className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
              : <File className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />}
            <span className="truncate font-mono">{share.resourcePath.split('/').pop()}</span>
            <span className="text-muted-foreground/60">·</span>
            <span className="flex-shrink-0">{account?.name}</span>
          </div>

          {share.expiresAt && (
            <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {isExpired ? 'Expired' : `Expires`} {new Date(share.expiresAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Permissions row */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground">Access</p>
          {isDirty ? (
            <div className="flex gap-1.5">
              <button onClick={cancelEdit} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
              <Button size="sm" className="h-6 text-xs px-2 gap-1" onClick={savePerms} disabled={isMutating}>
                <Check className="h-3 w-3" /> Save
              </Button>
            </div>
          ) : (
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => setEditingPerms([...share.permissions])}
            >
              Edit access
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ALL_PERMS.map(({ value, label, icon, color }) => {
            const active = currentPerms.includes(value);
            const isView = value === 'VIEW';
            return (
              <button
                key={value}
                disabled={isView || isMutating}
                onClick={() => togglePerm(value)}
                className={cn(
                  'inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border transition-all',
                  active ? color : 'text-muted-foreground bg-secondary border-transparent',
                  !isView && 'cursor-pointer hover:opacity-80',
                  isView && 'cursor-default',
                )}
                title={isView ? 'View is always required' : undefined}
              >
                {icon} {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex items-center justify-between gap-2 border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">Shared {timeAgo(share.createdAt)}</span>
        <div className="flex gap-1.5">
          {!isExpired && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => onToggleActive(share._id, !share.isActive)}
              disabled={isMutating}
            >
              {share.isActive
                ? <><UserX className="h-3 w-3" /> Pause</>
                : <><RefreshCw className="h-3 w-3" /> Resume</>}
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => {
              if (confirm(`Remove ${toUser?.name}'s access? This cannot be undone.`)) onRevoke(share._id);
            }}
            disabled={isMutating}
          >
            <Trash2 className="h-3 w-3" /> Remove
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MySharesPage() {
  const qc = useQueryClient();
  const [groupByResource, setGroupByResource] = useState(true);

  const { data: shares = [], isLoading } = useQuery<PlatformShare[]>({
    queryKey: ['shares-sent'],
    queryFn: () => api.get('/shares/sent').then((r) => r.data),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => api.delete(`/shares/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shares-sent'] }); toast.success('Access removed'); },
    onError: () => toast.error('Failed to remove'),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/shares/${id}/permissions`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shares-sent'] }),
    onError: () => toast.error('Failed to update'),
  });

  const permsMut = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: Permission[] }) =>
      api.patch(`/shares/${id}/permissions`, { permissions }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shares-sent'] }); toast.success('Access updated'); },
    onError: () => toast.error('Failed to update access'),
  });

  const isMutating = revokeMut.isPending || toggleMut.isPending || permsMut.isPending;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 h-52 animate-pulse" />
        ))}
      </div>
    );
  }

  if (shares.length === 0) {
    return (
      <div className="text-center py-20 space-y-3">
        <div className="text-6xl">📤</div>
        <h3 className="text-lg font-medium">No shares yet</h3>
        <p className="text-muted-foreground text-sm">
          Open a storage account, browse to a folder or file, then tap Share to give someone access.
        </p>
      </div>
    );
  }

  // Group by resource path
  const grouped = shares.reduce<Record<string, PlatformShare[]>>((acc, s) => {
    const key = `${(s.storageAccountId as StorageAccount)?._id}::${s.resourcePath}`;
    (acc[key] = acc[key] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {shares.length} active share{shares.length !== 1 && 's'}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => setGroupByResource((v) => !v)}
        >
          {groupByResource ? <><ChevronUp className="h-3 w-3" /> Grouped</> : <><ChevronDown className="h-3 w-3" /> Flat</>}
        </Button>
      </div>

      {groupByResource ? (
        // Grouped by resource
        <div className="space-y-6">
          {Object.entries(grouped).map(([key, groupShares]) => {
            const first = groupShares[0];
            const account = first.storageAccountId as StorageAccount;
            return (
              <div key={key} className="space-y-3">
                <div className="flex items-center gap-2">
                  {first.resourceType === 'FOLDER'
                    ? <FolderOpen className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    : <File className="h-4 w-4 text-blue-500 flex-shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {first.resourcePath.split('/').pop()}
                    </p>
                    <p className="text-xs text-muted-foreground">{account?.name} · {groupShares.length} user{groupShares.length !== 1 && 's'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {groupShares.map((share) => (
                    <ShareCard
                      key={share._id}
                      share={share}
                      onRevoke={(id) => revokeMut.mutate(id)}
                      onToggleActive={(id, isActive) => toggleMut.mutate({ id, isActive })}
                      onUpdatePerms={(id, permissions) => permsMut.mutate({ id, permissions })}
                      isMutating={isMutating}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Flat list
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shares.map((share) => (
            <ShareCard
              key={share._id}
              share={share}
              onRevoke={(id) => revokeMut.mutate(id)}
              onToggleActive={(id, isActive) => toggleMut.mutate({ id, isActive })}
              onUpdatePerms={(id, permissions) => permsMut.mutate({ id, permissions })}
              isMutating={isMutating}
            />
          ))}
        </div>
      )}
    </div>
  );
}
