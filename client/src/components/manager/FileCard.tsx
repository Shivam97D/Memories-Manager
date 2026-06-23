import { useState } from 'react';
import { Folder, FileImage, FileVideo, File, MoreVertical, Download, Trash2, Share2, Eye } from 'lucide-react';
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
  permissions?: Permission[];
  isSharedView?: boolean;
}

function getFileIcon(item: MediaItem) {
  if (item.type === 'folder') return <Folder className="h-12 w-12 text-amber-500" />;
  const mime = item.mimeType || '';
  if (mime.startsWith('image/')) return null; // will use thumbnail
  if (mime.startsWith('video/')) return <FileVideo className="h-12 w-12 text-blue-500" />;
  return <File className="h-12 w-12 text-gray-400" />;
}

export function FileCard({ item, onOpen, onDelete, onDownload, onShare, onPreview, permissions = ['VIEW', 'DOWNLOAD', 'EDIT', 'DELETE'], isSharedView }: Props) {
  const [imgError, setImgError] = useState(false);
  const isImage = item.type === 'file' && item.mimeType?.startsWith('image/');
  const canDelete = permissions.includes('DELETE') && !!onDelete;
  const canDownload = permissions.includes('DOWNLOAD') && !!onDownload;
  const canShare = !isSharedView && !!onShare;

  return (
    <div
      className="group relative bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer"
      onClick={() => onOpen(item)}
    >
      {/* Thumbnail */}
      <div className="aspect-square bg-secondary flex items-center justify-center overflow-hidden">
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
            {getFileIcon(item) || <FileImage className="h-12 w-12 text-gray-400" />}
          </div>
        )}

        {/* Hover overlay */}
        {isImage && (
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
                onClick={(e) => { e.stopPropagation(); onDownload(item); }}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{item.name}</p>
            {item.size && <p className="text-xs text-muted-foreground">{formatBytes(item.size)}</p>}
          </div>

          {(canDelete || canDownload || canShare) && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="z-50 min-w-[140px] rounded-lg border border-border bg-card shadow-lg p-1" sideOffset={4} align="end">
                  {canDownload && (
                    <DropdownMenu.Item
                      className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md cursor-pointer hover:bg-secondary"
                      onSelect={(e) => { e.stopPropagation(); onDownload(item); }}
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </DropdownMenu.Item>
                  )}
                  {canShare && (
                    <DropdownMenu.Item
                      className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md cursor-pointer hover:bg-secondary"
                      onSelect={(e) => { e.stopPropagation(); onShare(item); }}
                    >
                      <Share2 className="h-3.5 w-3.5" /> Share
                    </DropdownMenu.Item>
                  )}
                  {canDelete && (
                    <>
                      <DropdownMenu.Separator className="my-1 h-px bg-border" />
                      <DropdownMenu.Item
                        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md cursor-pointer hover:bg-red-50 text-red-600"
                        onSelect={(e) => { e.stopPropagation(); onDelete(item); }}
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
