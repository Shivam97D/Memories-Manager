import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const titles: Record<string, string> = {
  '/dashboard': 'My Library',
  '/shares': 'Shared with Me',
  '/my-shares': 'My Shares',
  '/profile': 'Profile',
  '/admin': 'Admin Panel',
  '/manager': 'File Manager',
  '/shared-manager': 'Shared Folder',
};

interface Props {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: Props) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const base = '/' + pathname.split('/')[1];
  const title = titles[base] || 'PixelVault';
  const isDeep = ['/manager', '/shared-manager'].includes(base);

  return (
    <header className="h-14 md:h-16 border-b border-border bg-card flex items-center justify-between px-4 md:px-6 flex-shrink-0 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 -ml-1 rounded-lg hover:bg-secondary transition-colors flex-shrink-0"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Back arrow on deep pages */}
        {isDeep && (
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 -ml-1 rounded-lg hover:bg-secondary transition-colors flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}

        <h1 className="text-base md:text-lg font-semibold truncate">{title}</h1>
      </div>

      <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8 md:h-9 md:w-9">
        <Bell className="h-4 w-4" />
      </Button>
    </header>
  );
}
