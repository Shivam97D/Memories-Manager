import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  path: string;
  onNavigate: (path: string) => void;
}

export function BreadcrumbNav({ path, onNavigate }: Props) {
  const parts = path.split('/').filter(Boolean);

  return (
    <nav className="flex items-center gap-1 text-sm flex-wrap">
      <button
        onClick={() => onNavigate('')}
        className={cn(
          'flex items-center gap-1 hover:text-foreground transition-colors',
          !path ? 'text-foreground font-medium' : 'text-muted-foreground'
        )}
      >
        <Home className="h-3.5 w-3.5" />
        Root
      </button>
      {parts.map((part, i) => {
        const partPath = parts.slice(0, i + 1).join('/');
        const isLast = i === parts.length - 1;
        return (
          <span key={partPath} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <button
              onClick={() => !isLast && onNavigate(partPath)}
              className={cn(
                'transition-colors',
                isLast ? 'text-foreground font-medium cursor-default' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {part}
            </button>
          </span>
        );
      })}
    </nav>
  );
}
