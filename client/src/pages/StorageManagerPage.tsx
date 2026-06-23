import { useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FolderPlus, Upload as UploadIcon, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { MediaItem, FolderContents, Permission, ResourceType } from '@/types';
import { FileCard } from '@/components/manager/FileCard';
import { BreadcrumbNav } from '@/components/manager/BreadcrumbNav';
import { UploadZone } from '@/components/manager/UploadZone';
import { FilePreview } from '@/components/manager/FilePreview';
import { ShareResourceModal } from '@/components/modals/ShareResourceModal';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface Props {
  shareId?: string;
  permissions?: Permission[];
  sharedRootPath?: string;
}

export function StorageManagerPage({ shareId, permissions: sharePerm, sharedRootPath }: Props) {
  const { accountId } = useParams<{ accountId: string }>();
  const [searchParams] = useSearchParams();
  const accountType = searchParams.get('type') || 'cloudinary';
  const qc = useQueryClient();

  const [currentPath, setCurrentPath] = useState(sharedRootPath || '');
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [shareItem, setShareItem] = useState<MediaItem | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [allItems, setAllItems] = useState<MediaItem[]>([]);

  const permissions: Permission[] = sharePerm || ['VIEW', 'DOWNLOAD', 'EDIT', 'DELETE'];

  const browseUrl = shareId
    ? `/proxy/${shareId}/browse?path=${encodeURIComponent(currentPath)}`
    : `/storage/${accountId}/browse?path=${encodeURIComponent(currentPath)}`;

  const { data, isLoading, refetch } = useQuery<FolderContents>({
    queryKey: ['browse', shareId || accountId, currentPath],
    queryFn: async () => {
      const res = await api.get(browseUrl);
      setAllItems(res.data.items);
      return res.data;
    },
    enabled: !!(accountId || shareId),
  });

  const loadMore = async () => {
    if (!data?.nextCursor) return;
    const cursor = data.nextCursor;
    const url = browseUrl + `&cursor=${cursor}`;
    const res = await api.get(url);
    setAllItems((prev) => [...prev, ...res.data.items]);
    qc.setQueryData(['browse', shareId || accountId, currentPath], (old: FolderContents) => ({
      ...res.data,
      items: [...(old?.items || []), ...res.data.items],
    }));
  };

  const deleteMut = useMutation({
    mutationFn: (item: MediaItem) => {
      const url = shareId
        ? `/proxy/${shareId}/resource`
        : `/storage/${accountId}/resource`;
      return api.delete(url, { data: { publicId: item.publicId || item.id } });
    },
    onSuccess: () => { refetch(); toast.success('Deleted'); },
    onError: () => toast.error('Delete failed'),
  });

  const handleDelete = (item: MediaItem) => {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    deleteMut.mutate(item);
  };

  const handleDownload = async (item: MediaItem) => {
    try {
      const url = shareId
        ? `/proxy/${shareId}/download?publicId=${encodeURIComponent(item.publicId || item.id)}`
        : `/storage/${accountId}/download?publicId=${encodeURIComponent(item.publicId || item.id)}`;
      const { data } = await api.get(url);
      window.open(data.url, '_blank');
    } catch {
      toast.error('Download failed');
    }
  };

  const handleOpen = (item: MediaItem) => {
    if (item.type === 'folder') setCurrentPath(item.path);
    else setPreviewItem(item);
  };

  const handleCreateFolder = async () => {
    const name = prompt('Folder name:');
    if (!name?.trim()) return;
    const path = currentPath ? `${currentPath}/${name.trim()}` : name.trim();
    try {
      await api.post(`/storage/${accountId}/folder`, { path });
      refetch();
      toast.success('Folder created');
    } catch {
      toast.error('Failed to create folder');
    }
  };

  const items = data?.items || [];

  return (
    <div className="space-y-5">
      {/* Back link if not embedded */}
      {!shareId && (
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Library
        </Link>
      )}

      {/* Breadcrumb + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <BreadcrumbNav
          path={sharedRootPath ? currentPath.replace(sharedRootPath, '') || '/' : currentPath}
          onNavigate={(p) => setCurrentPath(sharedRootPath ? `${sharedRootPath}${p}` : p)}
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          {permissions.includes('EDIT') && !shareId && (
            <Button variant="outline" size="sm" onClick={handleCreateFolder}>
              <FolderPlus className="h-3.5 w-3.5" /> New Folder
            </Button>
          )}
          {permissions.includes('EDIT') && (
            <Button size="sm" onClick={() => setShowUpload((v) => !v)}>
              <UploadIcon className="h-3.5 w-3.5" /> Upload
            </Button>
          )}
        </div>
      </div>

      {/* Upload zone */}
      {showUpload && accountId && (
        <UploadZone
          accountId={accountId}
          accountType={accountType.toUpperCase()}
          currentPath={currentPath}
          shareId={shareId}
          onUploadComplete={() => { setShowUpload(false); refetch(); }}
        />
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square bg-secondary rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 space-y-2">
          <div className="text-5xl">📂</div>
          <h3 className="text-lg font-medium">Empty folder</h3>
          <p className="text-sm text-muted-foreground">Upload files to get started</p>
        </div>
      ) : (
        <>
          <div className="text-sm text-muted-foreground">
            {items.length} items{data?.totalCount && data.totalCount > items.length && ` of ${data.totalCount}`}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {items.map((item) => (
              <FileCard
                key={item.id}
                item={item}
                onOpen={handleOpen}
                onDelete={permissions.includes('DELETE') ? handleDelete : undefined}
                onDownload={permissions.includes('DOWNLOAD') ? handleDownload : undefined}
                onShare={!shareId && accountId ? (i) => setShareItem(i) : undefined}
                onPreview={(i) => setPreviewItem(i)}
                permissions={permissions}
                isSharedView={!!shareId}
              />
            ))}
          </div>
          {data?.nextCursor && (
            <div className="text-center pt-4">
              <Button variant="outline" onClick={loadMore}>Load more</Button>
            </div>
          )}
        </>
      )}

      <FilePreview
        item={previewItem}
        items={items}
        onClose={() => setPreviewItem(null)}
        onDownload={permissions.includes('DOWNLOAD') ? handleDownload : undefined}
        onShare={!shareId && accountId ? (i) => { setPreviewItem(null); setShareItem(i); } : undefined}
        onNavigate={(item) => setPreviewItem(item)}
        permissions={permissions}
      />

      {shareItem && accountId && (
        <ShareResourceModal
          open={!!shareItem}
          onClose={() => setShareItem(null)}
          storageAccountId={accountId}
          resourcePath={shareItem.path}
          resourceType={shareItem.type === 'folder' ? 'FOLDER' : 'FILE'}
          resourceName={shareItem.name}
        />
      )}
    </div>
  );
}
