import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, FolderPlus, Upload as UploadIcon, RefreshCw,
  Trash2, Download, Share2, CheckSquare, Square, X, Pencil,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { MediaItem, FolderContents, Permission, ResourceType } from '@/types';
import { FileCard } from '@/components/manager/FileCard';
import { BreadcrumbNav } from '@/components/manager/BreadcrumbNav';
import { UploadZone } from '@/components/manager/UploadZone';
import { FilePreview } from '@/components/manager/FilePreview';
import { ShareResourceModal } from '@/components/modals/ShareResourceModal';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const PIXELVAULT_ROOT = 'PixelVault_Memory_Manager';

interface Props {
  shareId?: string;
  permissions?: Permission[];
  sharedRootPath?: string;
}

export function StorageManagerPage({ shareId, permissions: sharePerm, sharedRootPath }: Props) {
  const { accountId } = useParams<{ accountId: string }>();
  const [searchParams] = useSearchParams();
  const accountType = (searchParams.get('type') || 'cloudinary').toUpperCase();
  const qc = useQueryClient();

  // Resolved root — for shared views it's the share root; for owned accounts we call ensure-root
  const [rootPath, setRootPath] = useState<string | null>(sharedRootPath ?? null);
  const [rootReady, setRootReady] = useState(!!sharedRootPath);
  const [currentPath, setCurrentPath] = useState<string>(sharedRootPath || '');

  // UI state
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [shareItem, setShareItem] = useState<MediaItem | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [renameItem, setRenameItem] = useState<MediaItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [bulkActing, setBulkActing] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);

  const permissions: Permission[] = sharePerm || ['VIEW', 'DOWNLOAD', 'EDIT', 'DELETE'];
  const selectionMode = isSelecting || selectedIds.size > 0;

  // Step 1: ensure root folder exists (only for owned accounts)
  useEffect(() => {
    if (shareId || !accountId) return;
    api.get(`/storage/${accountId}/ensure-root`)
      .then(({ data }) => {
        setRootPath(data.path);
        setCurrentPath(data.path);
        setRootReady(true);
      })
      .catch(() => {
        // fallback — just open root without locking
        setRootPath('');
        setCurrentPath('');
        setRootReady(true);
      });
  }, [accountId, shareId]);

  // Browse query
  const browseUrl = shareId
    ? `/proxy/${shareId}/browse?path=${encodeURIComponent(currentPath)}`
    : `/storage/${accountId}/browse?path=${encodeURIComponent(currentPath)}`;

  const { data, isLoading, refetch } = useQuery<FolderContents>({
    queryKey: ['browse', shareId || accountId, currentPath],
    queryFn: () => api.get(browseUrl).then((r) => r.data),
    enabled: rootReady && !!(accountId || shareId),
  });

  const items = data?.items || [];
  const fileItems = items.filter((i) => i.type === 'file');
  const selectedItems = fileItems.filter((i) => selectedIds.has(i.id));

  // Navigate — guard against leaving the root folder for owned accounts
  const navigate = useCallback((path: string) => {
    const root = rootPath ?? '';
    if (!shareId && root && !path.startsWith(root)) return; // prevent escaping root
    setCurrentPath(path);
    setSelectedIds(new Set());
    setIsSelecting(false);
  }, [rootPath, shareId]);

  // Load more
  const loadMore = async () => {
    if (!data?.nextCursor) return;
    const res = await api.get(browseUrl + `&cursor=${data.nextCursor}`);
    qc.setQueryData(['browse', shareId || accountId, currentPath], (old: FolderContents) => ({
      ...res.data,
      items: [...(old?.items || []), ...res.data.items],
    }));
  };

  // Single delete
  const deleteMut = useMutation({
    mutationFn: (item: MediaItem) => {
      const url = shareId ? `/proxy/${shareId}/resource` : `/storage/${accountId}/resource`;
      return api.delete(url, { data: { publicId: item.publicId || item.id } });
    },
    onSuccess: () => { refetch(); toast.success('Deleted'); },
    onError: () => toast.error('Delete failed'),
  });

  const handleDelete = (item: MediaItem) => {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    deleteMut.mutate(item);
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (!confirm(`Delete ${selectedItems.length} item(s)? This cannot be undone.`)) return;
    setBulkActing(true);
    try {
      const publicIds = selectedItems.map((i) => i.publicId || i.id);
      await api.post(`/storage/${accountId}/bulk-delete`, { publicIds });
      setSelectedIds(new Set());
      refetch();
      toast.success(`Deleted ${selectedItems.length} item(s)`);
    } catch {
      toast.error('Bulk delete failed');
    } finally {
      setBulkActing(false);
    }
  };

  // Single download
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

  // Bulk download — open each URL with a small delay to avoid popup blockers
  const handleBulkDownload = async () => {
    if (selectedItems.length === 0) return;
    setBulkActing(true);
    try {
      const publicIds = selectedItems.map((i) => i.publicId || i.id);
      const { data } = await api.post(`/storage/${accountId}/bulk-download`, { publicIds });
      (data.urls as string[]).forEach((url, i) => {
        setTimeout(() => window.open(url, '_blank'), i * 300);
      });
      toast.success(`Downloading ${selectedItems.length} file(s)…`);
    } catch {
      toast.error('Bulk download failed');
    } finally {
      setBulkActing(false);
    }
  };

  // Select toggle
  const toggleSelect = (item: MediaItem) => {
    if (item.type === 'folder') return; // can't select folders
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(item.id) ? next.delete(item.id) : next.add(item.id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(fileItems.map((i) => i.id)));
  const clearSelection = () => { setSelectedIds(new Set()); setIsSelecting(false); };

  // Create folder
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

  // Rename
  const openRename = (item: MediaItem) => {
    setRenameItem(item);
    setRenameValue(item.name);
  };

  const handleRename = async () => {
    if (!renameItem || !renameValue.trim() || renameValue.trim() === renameItem.name) {
      setRenameItem(null);
      return;
    }
    try {
      const fromPath = renameItem.publicId || renameItem.path;
      // Build toPath: same parent folder, new name (strip extension for Cloudinary publicId)
      const parts = fromPath.split('/');
      parts[parts.length - 1] = renameValue.trim();
      const toPath = parts.join('/');
      await api.patch(`/storage/${accountId}/resource/rename`, { fromPath, toPath });
      setRenameItem(null);
      refetch();
      toast.success('Renamed');
    } catch {
      toast.error('Rename failed');
    }
  };

  // Open item
  const handleOpen = (item: MediaItem) => {
    if (item.type === 'folder') navigate(item.path);
    else setPreviewItem(item);
  };

  if (!rootReady) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Setting up your PixelVault folder…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back link */}
      {!shareId && (
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Library
        </Link>
      )}

      {/* Root notice */}
      {!shareId && (
        <div className="flex items-center gap-2 bg-accent/40 border border-primary/20 rounded-lg px-3 py-2 text-xs text-muted-foreground">
          <span className="text-primary font-medium">Root:</span>
          <span className="font-mono">{rootPath}</span>
          <span className="text-muted-foreground">— Memory Manager · contact: +91 8446992405</span>
        </div>
      )}

      {/* Breadcrumb + action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <BreadcrumbNav
          path={currentPath}
          rootPath={rootPath || ''}
          onNavigate={navigate}
        />

        {/* Selection mode actions */}
        {selectionMode ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">{selectedItems.length} selected</span>
            <Button variant="outline" size="sm" onClick={selectAll} disabled={selectedItems.length === fileItems.length}>
              <CheckSquare className="h-3.5 w-3.5" /> All
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection}>
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
            {permissions.includes('DOWNLOAD') && (
              <Button size="sm" onClick={handleBulkDownload} loading={bulkActing}>
                <Download className="h-3.5 w-3.5" /> Download ({selectedItems.length})
              </Button>
            )}
            {permissions.includes('DELETE') && (
              <Button variant="destructive" size="sm" onClick={handleBulkDelete} loading={bulkActing}>
                <Trash2 className="h-3.5 w-3.5" /> Delete ({selectedItems.length})
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            {fileItems.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setIsSelecting(true)}>
                <Square className="h-3.5 w-3.5" /> Select
              </Button>
            )}
            {permissions.includes('EDIT') && !shareId && (
              <Button variant="outline" size="sm" onClick={handleCreateFolder}>
                <FolderPlus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New Folder</span>
              </Button>
            )}
            {permissions.includes('EDIT') && (
              <Button size="sm" onClick={() => setShowUpload((v) => !v)}>
                <UploadIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Upload</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Upload zone */}
      {showUpload && accountId && (
        <UploadZone
          accountId={accountId}
          accountType={accountType}
          currentPath={currentPath}
          shareId={shareId}
          onUploadComplete={() => { setShowUpload(false); refetch(); }}
        />
      )}

      {/* File grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square bg-secondary rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <div className="text-5xl">📂</div>
          <h3 className="text-base font-medium">Empty folder</h3>
          <p className="text-sm text-muted-foreground">
            Upload files to <span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">{currentPath}</span>
          </p>
          {permissions.includes('EDIT') && (
            <Button size="sm" onClick={() => setShowUpload(true)}>
              <UploadIcon className="h-3.5 w-3.5" /> Upload Files
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {items.length} item{items.length !== 1 && 's'}
              {data?.totalCount && data.totalCount > items.length && ` of ${data.totalCount}`}
            </p>
            {fileItems.length > 0 && !selectionMode && (
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => setIsSelecting(true)}
              >
                Select items
              </button>
            )}
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
                onRename={permissions.includes('EDIT') && !shareId ? openRename : undefined}
                onSelect={toggleSelect}
                selected={selectedIds.has(item.id)}
                selectionMode={selectionMode}
                permissions={permissions}
                isSharedView={!!shareId}
              />
            ))}
          </div>

          {data?.nextCursor && (
            <div className="text-center pt-2">
              <Button variant="outline" size="sm" onClick={loadMore}>Load more</Button>
            </div>
          )}
        </>
      )}

      {/* File preview lightbox */}
      <FilePreview
        item={previewItem}
        items={items}
        onClose={() => setPreviewItem(null)}
        onDownload={permissions.includes('DOWNLOAD') ? handleDownload : undefined}
        onShare={!shareId && accountId ? (i) => { setPreviewItem(null); setShareItem(i); } : undefined}
        onNavigate={(item) => setPreviewItem(item)}
        permissions={permissions}
      />

      {/* Share modal */}
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

      {/* Rename dialog */}
      <Dialog open={!!renameItem} onOpenChange={(open) => !open && setRenameItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-xs text-muted-foreground truncate">
              Current: <span className="font-mono">{renameItem?.name}</span>
            </p>
            <Input
              label="New name"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              icon={<Pencil className="h-4 w-4" />}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); }}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setRenameItem(null)}>Cancel</Button>
              <Button size="sm" onClick={handleRename}>Rename</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
