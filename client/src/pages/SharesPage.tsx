import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, File, Eye, Download, Upload, Trash2, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { PlatformShare, Permission, User, StorageAccount } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { timeAgo, getInitials } from '@/lib/utils';

const PERM_ICONS: Record<Permission, React.ReactNode> = {
  VIEW: <Eye className="h-3 w-3" />,
  DOWNLOAD: <Download className="h-3 w-3" />,
  EDIT: <Upload className="h-3 w-3" />,
  DELETE: <Trash2 className="h-3 w-3" />,
};

function ShareCard({ share, onOpen }: { share: PlatformShare; onOpen: () => void }) {
  const fromUser = share.fromUserId as User;
  const account = share.storageAccountId as StorageAccount;
  const isExpired = share.expiresAt && new Date(share.expiresAt) < new Date();

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {getInitials(fromUser.name)}
          </div>
          <div>
            <p className="font-medium text-sm">{fromUser.name}</p>
            <p className="text-xs text-muted-foreground">{fromUser.email}</p>
          </div>
        </div>
        {isExpired ? (
          <Badge variant="destructive">Expired</Badge>
        ) : (
          <Badge variant="success">Active</Badge>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-sm">
          {share.resourceType === 'FOLDER' ? (
            <FolderOpen className="h-4 w-4 text-amber-500" />
          ) : (
            <File className="h-4 w-4 text-blue-500" />
          )}
          <span className="font-medium truncate">{share.resourcePath}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          from <span className="font-medium text-foreground">{account.name}</span> ({account.type})
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
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>Shared {timeAgo(share.createdAt)}</p>
          {share.expiresAt && (
            <p className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {isExpired ? 'Expired' : `Expires ${timeAgo(share.expiresAt)}`}
            </p>
          )}
        </div>
        {!isExpired && (
          <Button size="sm" onClick={onOpen}>
            Open
          </Button>
        )}
      </div>
    </div>
  );
}

export function SharesPage() {
  const navigate = useNavigate();
  const { data: shares = [], isLoading } = useQuery<PlatformShare[]>({
    queryKey: ['shares-received'],
    queryFn: () => api.get('/shares/received').then((r) => r.data),
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
        <div className="text-6xl">🤝</div>
        <h3 className="text-lg font-medium">No shared content yet</h3>
        <p className="text-muted-foreground text-sm">When someone shares photos or folders with you, they'll appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{shares.length} shared resource{shares.length !== 1 && 's'}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {shares.map((share) => (
          <ShareCard
            key={share._id}
            share={share}
            onOpen={() =>
              navigate(`/shared-manager/${share._id}?permissions=${share.permissions.join(',')}&path=${share.resourcePath}`)
            }
          />
        ))}
      </div>
    </div>
  );
}
