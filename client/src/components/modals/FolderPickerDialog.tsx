import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Folder, ChevronRight, ChevronLeft, Copy } from 'lucide-react';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FolderContents } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (folderPath: string) => void;
  accountId: string;
  rootPath: string;
  title?: string;
  actionLabel?: string;
}

export function FolderPickerDialog({
  open,
  onClose,
  onSelect,
  accountId,
  rootPath,
  title = 'Copy to folder',
  actionLabel = 'Copy here',
}: Props) {
  const [browsePath, setBrowsePath] = useState(rootPath);

  const { data, isLoading } = useQuery<FolderContents>({
    queryKey: ['folder-pick', accountId, browsePath],
    queryFn: () =>
      api.get(`/storage/${accountId}/browse?path=${encodeURIComponent(browsePath)}`).then((r) => r.data),
    enabled: open,
    staleTime: 10_000,
  });

  const folders = (data?.items || []).filter((i) => i.type === 'folder');

  const canGoUp = browsePath !== rootPath && browsePath.length > rootPath.length;

  const goUp = () => {
    const parts = browsePath.split('/').filter(Boolean);
    parts.pop();
    const parent = parts.join('/');
    const newPath = parent.startsWith(rootPath.replace(/^\//, '')) ? (rootPath.startsWith('/') ? `/${parent}` : parent) : rootPath;
    setBrowsePath(newPath.length >= rootPath.length ? newPath : rootPath);
  };

  const handleClose = () => {
    setBrowsePath(rootPath);
    onClose();
  };

  const handleSelect = () => {
    onSelect(browsePath);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-4 w-4" /> {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Current path breadcrumb */}
          <div className="flex items-center gap-1.5 bg-secondary rounded-lg px-3 py-2">
            {canGoUp && (
              <button onClick={goUp} className="p-0.5 rounded hover:bg-border transition-colors flex-shrink-0">
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <Folder className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
            <span className="text-xs font-mono truncate flex-1 text-muted-foreground">
              {browsePath.split('/').filter(Boolean).pop() || 'root'}
            </span>
          </div>

          {/* Subfolder list */}
          <div className="min-h-[120px] max-h-52 overflow-y-auto border border-border rounded-lg">
            {isLoading ? (
              <div className="space-y-1 p-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-9 rounded-md bg-secondary animate-pulse" />
                ))}
              </div>
            ) : folders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-1">
                <Folder className="h-6 w-6 opacity-30" />
                <p className="text-xs">No subfolders — select current folder</p>
              </div>
            ) : (
              <div className="p-1 space-y-0.5">
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => setBrowsePath(folder.path)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary text-sm text-left transition-colors"
                  >
                    <Folder className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <span className="truncate flex-1">{folder.name}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={handleClose}>
              Cancel
            </Button>
            <Button size="sm" className="flex-1" onClick={handleSelect}>
              <Copy className="h-3.5 w-3.5" /> {actionLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
