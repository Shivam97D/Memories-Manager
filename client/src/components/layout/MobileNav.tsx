import { NavLink } from 'react-router-dom';
import { LayoutGrid, Share2, CloudUpload, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', icon: LayoutGrid, label: 'Library' },
  { to: '/shares', icon: Share2, label: 'Shared' },
  { to: '/my-shares', icon: CloudUpload, label: 'My Shares' },
  { to: '/profile', icon: Settings, label: 'Profile' },
];

export function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border">
      <div className="flex items-center justify-around px-2 py-1 safe-area-bottom">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors min-w-0 flex-1',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn('p-1.5 rounded-lg transition-colors', isActive && 'bg-accent')}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
