import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, FolderPlus, Upload as UploadIcon, RefreshCw,
  Trash2, Download, Share2, X, Pencil,
  Loader2, Copy, HardDrive, CheckSquare, Square,
} from 'lucide-react';
import { api } from '@/lib/api';
import { MediaItem, FolderContents, Permission, ResourceType, StorageUsage } from '@/types';
import { FileCard } from '@/components/manager/FileCard';
import { BreadcrumbNav } from '@/components/manager/BreadcrumbNav';
import { UploadZone } from '@/components/manager/UploadZone';
import { FilePreview } from '@/components/manager/FilePreview';
import { ShareResourceModal } from '@/components/modals/ShareResourceModal';
import { FolderPickerDialog } from '@/components/modals/FolderPickerDialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn, formatBytes } from '@/lib/utils';
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

  const [rootPath, setRootPath] = useState<string | null>(sharedRootPath ?? null);
  const [rootReady, setRootReady] = useState(!!sharedRootPath);
  const [currentPath, setCurrentPath] = useState<string>(sharedRootPath || '');

  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [shareItem, setShareItem] = useState<MediaItem | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [renameItem, setRenameItem] = useState<MediaItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [bulkActing, setBulkActing] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const permissions: Permission[] = sharePerm || ['VIEW', 'DOWNLOAD', 'EDIT', 'DELETE'];
  const selectionMode = isSelecting || selectedIds.size > 0;

  // Ensure root folder on mount
  useEffect(() => {
    if (shareId || !accountId) return;
    api.get(`/storage/${accountId}/ensure-root`)
      .then(({ data }) => { setRootPath(data.path); setCurrentPath(data.path); setRootReady(true); })
      .catch(() => { setRootPath(''); setCurrentPath(''); setRootReady(true); });
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

  // Storage usage (lazy — fetched once when manager opens, for owned accounts)
  const { data: usage } = useQuery<StorageUsage>({
    queryKey: ['storage-usage', accountId],
    queryFn: () => api.get(`/storage/${accountId}/usage`).then((r) => r.data),
    enabled: rootReady && !!accountId && !shareId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const items = data?.items || [];
  const fileItems = items.filter((i) => i.type === 'file');
  const selectedItems = fileItems.filter((i) => selectedIds.has(i.id));

  const navigate = useCallback((path: string) => {
    const root = rootPath ?? '';
    if (!shareId && root && !path.startsWith(root)) return;
    setCurrentPath(path);
    setSelectedIds(new Set());
    setIsSelecting(false);
  }, [rootPath, shareId]);

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
      const delUrl = shareId ? `/proxy/${shareId}/bulk-delete` : `/storage/${accountId}/bulk-delete`;
      await api.post(delUrl, { publicIds });
      setSelectedIds(new Set());
      setIsSelecting(false);
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

  // Bulk download
  const handleBulkDownload = async () => {
    if (selectedItems.length === 0) return;
    setBulkActing(true);
    try {
      const publicIds = selectedItems.map((i) => i.publicId || i.id);
      const dlUrl = shareId ? `/proxy/${shareId}/bulk-download` : `/storage/${accountId}/bulk-download`;
      const { data } = await api.post(dlUrl, { publicIds });
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

  // Bulk copy
  const handleBulkCopy = async (destFolder: string) => {
    if (selectedItems.length === 0) return;
    setBulkActing(true);
    try {
      const copyItems = selectedItems.map((i) => ({ publicId: i.publicId || i.id, path: i.path }));
      await api.post(`/storage/${accountId}/bulk-copy`, { items: copyItems, destFolder });
      toast.success(`Copied ${selectedItems.length} file(s) to ${destFolder.split('/').pop()}`);
      if (destFolder === currentPath) refetch();
    } catch {
      toast.error('Copy failed');
    } finally {
      setBulkActing(false);
    }
  };

  const toggleSelect = (item: MediaItem) => {
    if (item.type === 'folder') return;
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
    const name = newFolderName.trim();
    if (!name) return;
    const path = currentPath ? `${currentPath}/${name}` : name;
    try {
      await api.post(`/storage/${accountId}/folder`, { path });
      setCreateFolderOpen(false);
      setNewFolderName('');
      refetch();
      toast.success('Folder created');
    } catch { toast.error('Failed to create folder'); }
  };

  // Rename
  const openRename = (item: MediaItem) => { setRenameItem(item); setRenameValue(item.name); };
  const handleRename = async () => {
    if (!renameItem || !renameValue.trim() || renameValue.trim() === renameItem.name) {
      setRenameItem(null);
      return;
    }
    try {
      const fromPath = renameItem.path;
      const parts = fromPath.split('/');
      parts[parts.length - 1] = renameValue.trim();
      const toPath = parts.join('/');
      await api.patch(`/storage/${accountId}/resource/rename`, { fromPath, toPath });
      setRenameItem(null);
      refetch();
      toast.success('Renamed');
    } catch { toast.error('Rename failed'); }
  };

  const handleOpen = (item: MediaItem) => {
    if (item.type === 'folder') navigate(item.path);
    else setPreviewItem(item);
  };

  // Storage usage formatting
  const usagePct = usage ? Math.min(100, (usage.usedBytes / usage.totalBytes) * 100) : 0;
  const usageColor = usagePct > 90 ? 'bg-red-500' : usagePct > 70 ? 'bg-amber-500' : 'bg-primary';

  if (!rootReady) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Setting up your PixelVault folder…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Back link */}
      {!shareId && (
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Library
        </Link>
      )}

      {/* Root notice + Storage usage */}
      {!shareId && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-2 bg-accent/40 border border-primary/20 rounded-lg px-3 py-2 text-xs text-muted-foreground flex-1 min-w-0">
            <span className="text-primary font-medium flex-shrink-0">Root:</span>
            <span className="font-mono truncate">{rootPath}</span>
          </div>

          {/* Storage usage widget */}
          {usage && (
            <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 text-xs flex-shrink-0 min-w-[200px]">
              <HardDrive className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span className="text-muted-foreground truncate">{formatBytes(usage.usedBytes)}</span>
                  <span className="text-muted-foreground flex-shrink-0">/ {formatBytes(usage.totalBytes)}</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', usageColor)}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
              </div>
              <span className={cn('text-[10px] font-medium flex-shrink-0', usagePct > 90 ? 'text-red-500' : 'text-muted-foreground')}>
                {usagePct.toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Breadcrumb + toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <BreadcrumbNav
          path={currentPath}
          rootPath={rootPath || ''}
          onNavigate={navigate}
        />

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>

          {fileItems.length > 0 && !selectionMode && (
            <Button variant="outline" size="sm" onClick={() => setIsSelecting(true)}>
              <Square className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Select</span>
            </Button>
          )}

          {selectionMode && (
            <>
              <Button variant="outline" size="sm" onClick={selectAll} disabled={selectedItems.length === fileItems.length}>
                <CheckSquare className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">All</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                <X className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cancel</span>
              </Button>
            </>
          )}

          {permissions.includes('EDIT') && !shareId && !selectionMode && (
            <Button variant="outline" size="sm" onClick={() => { setNewFolderName(''); setCreateFolderOpen(true); }}>
              <FolderPlus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Folder</span>
            </Button>
          )}

          {permissions.includes('EDIT') && !selectionMode && (
            <Button size="sm" onClick={() => setShowUpload((v) => !v)}>
              <UploadIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Upload</span>
            </Button>
          )}
        </div>
      </div>

      {/* Upload zone — works for both owned (accountId) and shared (shareId) views */}
      {showUpload && (accountId || shareId) && (
        <UploadZone
          accountId={accountId ?? ''}
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
              <button className="text-xs text-primary hover:underline" onClick={() => setIsSelecting(true)}>
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

      {/* ── Floating bulk action bar ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 bg-card border border-border shadow-2xl rounded-2xl px-3 py-2.5 animate-in slide-in-from-bottom-3 duration-200">
          <span className="text-xs font-semibold text-muted-foreground pr-2 border-r border-border mr-1">
            {selectedIds.size} selected
          </span>

          {permissions.includes('DOWNLOAD') && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-xs"
              onClick={handleBulkDownload}
              disabled={bulkActing}
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download</span>
            </Button>
          )}

          {permissions.includes('EDIT') && !shareId && accountId && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setCopyDialogOpen(true)}
              disabled={bulkActing}
            >
              <Copy className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Copy to…</span>
            </Button>
          )}

          {permissions.includes('DELETE') && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={handleBulkDelete}
              disabled={bulkActing}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          )}

          <div className="w-px h-4 bg-border mx-1" />

          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={clearSelection}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
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

      {/* Copy-to folder picker */}
      {accountId && rootPath !== null && (
        <FolderPickerDialog
          open={copyDialogOpen}
          onClose={() => setCopyDialogOpen(false)}
          onSelect={handleBulkCopy}
          accountId={accountId}
          rootPath={rootPath}
          title={`Copy ${selectedItems.length} file${selectedItems.length !== 1 ? 's' : ''} to…`}
          actionLabel="Copy here"
        />
      )}

      {/* Create Folder dialog */}
      <Dialog open={createFolderOpen} onOpenChange={(open) => { if (!open) { setCreateFolderOpen(false); setNewFolderName(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="h-4 w-4" /> New Folder
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {currentPath && (
              <p className="text-xs text-muted-foreground">
                Inside: <span className="font-mono bg-secondary px-1.5 py-0.5 rounded">{currentPath.split('/').pop()}</span>
              </p>
            )}
            <Input
              label="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              icon={<FolderPlus className="h-4 w-4" />}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); }}
              autoFocus
              placeholder="e.g. My Photos"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setCreateFolderOpen(false); setNewFolderName(''); }}>Cancel</Button>
              <Button size="sm" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
