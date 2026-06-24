import { ChevronRight, Vault } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  path: string;
  rootPath: string;
  onNavigate: (path: string) => void;
}

export function BreadcrumbNav({ path, rootPath, onNavigate }: Props) {
  // Strip the rootPath prefix to show relative parts
  const relative = path.startsWith(rootPath)
    ? path.slice(rootPath.length).replace(/^\//, '')
    : path;
  const parts = relative.split('/').filter(Boolean);

  return (
    <nav className="flex items-center gap-1 text-sm flex-wrap min-w-0 overflow-x-auto scrollbar-none">
      <button
        onClick={() => onNavigate(rootPath)}
        className={cn(
          'flex items-center gap-1.5 hover:text-foreground transition-colors flex-shrink-0',
          !relative ? 'text-foreground font-medium' : 'text-muted-foreground'
        )}
      >
        <Vault className="h-3.5 w-3.5 flex-shrink-0" />
        <span>PixelVault</span>
      </button>

      {parts.map((part, i) => {
        const partPath = rootPath + '/' + parts.slice(0, i + 1).join('/');
        const isLast = i === parts.length - 1;
        return (
          <span key={partPath} className="flex items-center gap-1 flex-shrink-0">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <button
              onClick={() => !isLast && onNavigate(partPath)}
              className={cn(
                'transition-colors max-w-[120px] truncate',
                isLast
                  ? 'text-foreground font-medium cursor-default'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title={part}
            >
              {part}
            </button>
          </span>
        );
      })}
    </nav>
  );
}
