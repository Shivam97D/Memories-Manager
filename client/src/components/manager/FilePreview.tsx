import { X, Download, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaItem, Permission } from '@/types';
import { Button } from '@/components/ui/button';
import { formatBytes, timeAgo } from '@/lib/utils';
import * as Dialog from '@radix-ui/react-dialog';

interface Props {
  item: MediaItem | null;
  items?: MediaItem[];
  onClose: () => void;
  onDownload?: (item: MediaItem) => void;
  onShare?: (item: MediaItem) => void;
  onNavigate?: (item: MediaItem) => void;
  permissions?: Permission[];
}

export function FilePreview({ item, items = [], onClose, onDownload, onShare, onNavigate, permissions = [] }: Props) {
  if (!item) return null;

  const currentIndex = items.findIndex((i) => i.id === item.id);
  const files = items.filter((i) => i.type === 'file');
  const fileIndex = files.findIndex((i) => i.id === item.id);

  const prev = fileIndex > 0 ? files[fileIndex - 1] : null;
  const next = fileIndex < files.length - 1 ? files[fileIndex + 1] : null;

  const isImage = item.mimeType?.startsWith('image/');
  const isVideo = item.mimeType?.startsWith('video/');

  return (
    <Dialog.Root open={!!item} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/90" />
        <Dialog.Content className="fixed inset-0 z-50 flex flex-col outline-none" aria-describedby={undefined}>
          {/* Top bar */}
          <div className="flex items-center justify-between p-4 text-white">
            <div>
              <Dialog.Title className="font-medium">{item.name}</Dialog.Title>
              <p className="text-sm text-white/60">
                {item.size && formatBytes(item.size)}
                {item.width && item.height && ` · ${item.width}×${item.height}`}
                {item.createdAt && ` · ${timeAgo(String(item.createdAt))}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {permissions.includes('DOWNLOAD') && onDownload && (
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => onDownload(item)}>
                  <Download className="h-4 w-4" />
                </Button>
              )}
              {onShare && (
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => onShare(item)}>
                  <Share2 className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Media */}
          <div className="flex-1 flex items-center justify-center relative px-16">
            {prev && onNavigate && (
              <button
                className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                onClick={() => onNavigate(prev)}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}

            {isImage && (
              <img
                src={item.url || item.thumbnailUrl}
                alt={item.name}
                className="max-w-full max-h-full object-contain rounded-lg"
                style={{ maxHeight: 'calc(100vh - 140px)' }}
              />
            )}
            {isVideo && (
              <video
                src={item.url}
                controls
                className="max-w-full rounded-lg"
                style={{ maxHeight: 'calc(100vh - 140px)' }}
              />
            )}
            {!isImage && !isVideo && (
              <div className="text-center text-white/60">
                <p className="text-lg">Cannot preview this file type</p>
                <p className="text-sm">{item.mimeType}</p>
              </div>
            )}

            {next && onNavigate && (
              <button
                className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                onClick={() => onNavigate(next)}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex gap-1.5 p-4 flex-wrap justify-center">
              {item.tags.map((tag) => (
                <span key={tag} className="text-xs bg-white/10 text-white px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
