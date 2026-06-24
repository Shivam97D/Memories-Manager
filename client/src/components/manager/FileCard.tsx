import { useState } from 'react';
import { Folder, FileImage, FileVideo, File, MoreVertical, Download, Trash2, Share2, Eye, Pencil, Check } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MediaItem, Permission } from '@/types';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Props {
  item: MediaItem;
  onOpen: (item: MediaItem) => void;
  onDelete?: (item: MediaItem) => void;
  onDownload?: (item: MediaItem) => void;
  onShare?: (item: MediaItem) => void;
  onPreview?: (item: MediaItem) => void;
  onRename?: (item: MediaItem) => void;
  onSelect?: (item: MediaItem) => void;
  selected?: boolean;
  selectionMode?: boolean;
  permissions?: Permission[];
  isSharedView?: boolean;
}

function getFileIcon(item: MediaItem) {
  if (item.type === 'folder') return <Folder className="h-10 w-10 text-amber-500" />;
  const mime = item.mimeType || '';
  if (mime.startsWith('image/')) return null;
  if (mime.startsWith('video/')) return <FileVideo className="h-10 w-10 text-blue-500" />;
  return <File className="h-10 w-10 text-gray-400" />;
}

export function FileCard({
  item,
  onOpen,
  onDelete,
  onDownload,
  onShare,
  onPreview,
  onRename,
  onSelect,
  selected = false,
  selectionMode = false,
  permissions = ['VIEW', 'DOWNLOAD', 'EDIT', 'DELETE'],
  isSharedView,
}: Props) {
  const [imgError, setImgError] = useState(false);
  const isImage = item.type === 'file' && item.mimeType?.startsWith('image/');
  const canDelete = permissions.includes('DELETE') && !!onDelete;
  const canDownload = permissions.includes('DOWNLOAD') && !!onDownload;
  const canEdit = permissions.includes('EDIT') && !!onRename;
  const canShare = !isSharedView && !!onShare;
  const isFolder = item.type === 'folder';

  const handleClick = (e: React.MouseEvent) => {
    if (selectionMode && onSelect) {
      e.preventDefault();
      onSelect(item);
      return;
    }
    onOpen(item);
  };

  return (
    <div
      className={cn(
        'group relative bg-card border rounded-xl overflow-hidden transition-all cursor-pointer',
        selected
          ? 'border-primary ring-2 ring-primary/30 shadow-md'
          : 'border-border hover:shadow-md hover:border-border/80'
      )}
      onClick={handleClick}
    >
      {/* Thumbnail / Icon */}
      <div className="aspect-square bg-secondary flex items-center justify-center overflow-hidden relative">
        {isImage && !imgError && item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center">
            {getFileIcon(item) || <FileImage className="h-10 w-10 text-gray-400" />}
          </div>
        )}

        {/* Hover actions overlay for images */}
        {isImage && !selectionMode && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => { e.stopPropagation(); onPreview?.(item); }}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            {canDownload && (
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => { e.stopPropagation(); onDownload!(item); }}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}

        {/* Selection checkbox */}
        {(selectionMode || selected) && !isFolder && (
          <div
            className={cn(
              'absolute top-2 left-2 w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center flex-shrink-0',
              selected
                ? 'bg-primary border-primary'
                : 'bg-white/80 border-gray-300 group-hover:border-primary'
            )}
            onClick={(e) => { e.stopPropagation(); onSelect?.(item); }}
          >
            {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
          </div>
        )}
      </div>

      {/* Info row */}
      <div className="p-2.5">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate leading-snug">{item.name}</p>
            {item.size != null && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{formatBytes(item.size)}</p>
            )}
          </div>

          {/* Three-dot menu — visible on hover or when not in selection mode */}
          {!selectionMode && (canDelete || canDownload || canShare || canEdit) && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="z-50 min-w-[150px] rounded-lg border border-border bg-card shadow-lg p-1"
                  sideOffset={4}
                  align="end"
                >
                  {onPreview && isImage && (
                    <DropdownMenu.Item
                      className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md cursor-pointer hover:bg-secondary"
                      onSelect={() => onPreview(item)}
                    >
                      <Eye className="h-3.5 w-3.5" /> Preview
                    </DropdownMenu.Item>
                  )}
                  {canDownload && (
                    <DropdownMenu.Item
                      className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md cursor-pointer hover:bg-secondary"
                      onSelect={() => onDownload!(item)}
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </DropdownMenu.Item>
                  )}
                  {canEdit && !isFolder && (
                    <DropdownMenu.Item
                      className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md cursor-pointer hover:bg-secondary"
                      onSelect={() => onRename!(item)}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Rename
                    </DropdownMenu.Item>
                  )}
                  {canShare && (
                    <DropdownMenu.Item
                      className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md cursor-pointer hover:bg-secondary"
                      onSelect={() => onShare!(item)}
                    >
                      <Share2 className="h-3.5 w-3.5" /> Share
                    </DropdownMenu.Item>
                  )}
                  {canDelete && (
                    <>
                      <DropdownMenu.Separator className="my-1 h-px bg-border" />
                      <DropdownMenu.Item
                        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md cursor-pointer hover:bg-red-50 text-red-600"
                        onSelect={() => onDelete!(item)}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </DropdownMenu.Item>
                    </>
                  )}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
        </div>
      </div>
    </div>
  );
}
