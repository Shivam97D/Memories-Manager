import { NavLink } from 'react-router-dom';
import { LayoutGrid, Share2, CloudUpload, Settings, LogOut, Image, X } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';

const navItems = [
  { to: '/dashboard', icon: LayoutGrid, label: 'My Library' },
  { to: '/shares', icon: Share2, label: 'Shared with Me' },
  { to: '/my-shares', icon: CloudUpload, label: 'My Shares' },
  { to: '/profile', icon: Settings, label: 'Profile' },
];

interface Props {
  onClose?: () => void;
}

export function Sidebar({ onClose }: Props) {
  const { user, logout, refreshToken } = useAuthStore();

  const handleLogout = async () => {
    try { await api.post('/auth/logout', { refreshToken }); } catch {}
    logout();
  };

  return (
    <aside className="w-60 h-full flex-shrink-0 border-r border-border bg-card flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Image className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">PixelVault</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-md hover:bg-secondary transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )
            }
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-border flex-shrink-0">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user ? getInitials(user.name) : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0" title="Logout">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
