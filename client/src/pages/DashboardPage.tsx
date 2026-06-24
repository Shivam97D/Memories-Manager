import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { StorageAccount, SharedAlbum } from '@/types';
import { StorageCard } from '@/components/cards/StorageCard';
import { SharedAlbumCard } from '@/components/cards/SharedAlbumCard';
import { AddAccountModal } from '@/components/modals/AddAccountModal';
import { AddSharedAlbumModal } from '@/components/modals/AddSharedAlbumModal';
import { Button } from '@/components/ui/button';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface AccountsResponse {
  accounts: StorageAccount[];
  sharedAlbums: SharedAlbum[];
}

const TYPE_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'CLOUDINARY', label: 'Cloudinary' },
  { value: 'IMAGEKIT', label: 'ImageKit' },
  { value: 'GOOGLE_PHOTOS', label: 'Google' },
  { value: 'SHARED_ALBUM', label: 'Albums' },
  { value: 'OTHER', label: 'Other' },
];

export function DashboardPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddAlbum, setShowAddAlbum] = useState(false);
  const [editingAccount, setEditingAccount] = useState<StorageAccount | null>(null);
  const [editingAlbum, setEditingAlbum] = useState<SharedAlbum | null>(null);

  const { data, isLoading } = useQuery<AccountsResponse>({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts').then((r) => r.data),
  });

  const accounts = data?.accounts || [];
  const albums = data?.sharedAlbums || [];

  const filtered = {
    accounts: accounts.filter((a) => {
      if (filter === 'SHARED_ALBUM') return false;
      if (filter !== 'ALL' && a.type !== filter) return false;
      const q = search.toLowerCase();
      return !q || a.name.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q);
    }),
    albums: albums.filter((a) => {
      if (filter !== 'ALL' && filter !== 'SHARED_ALBUM') return false;
      const q = search.toLowerCase();
      return !q || a.name.toLowerCase().includes(q);
    }),
  };

  const totalItems = filtered.accounts.length + filtered.albums.length;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Accounts', value: accounts.length },
          { label: 'Shared Albums', value: albums.length },
          { label: 'Cloudinary', value: accounts.filter((a) => a.type === 'CLOUDINARY').length },
          { label: 'ImageKit', value: accounts.filter((a) => a.type === 'IMAGEKIT').length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-3 md:p-4">
            <p className="text-xl md:text-2xl font-bold">{value}</p>
            <p className="text-xs md:text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="space-y-3">
        {/* Search + Add row */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Search accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button className="flex-shrink-0">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add New</span>
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="z-50 min-w-[180px] rounded-lg border border-border bg-card shadow-lg p-1"
                sideOffset={4}
                align="end"
              >
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-secondary"
                  onSelect={() => setShowAddAccount(true)}
                >
                  ☁️ Storage Account
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-secondary"
                  onSelect={() => setShowAddAlbum(true)}
                >
                  📂 Shared Album
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        {/* Filter chips — horizontally scrollable on mobile */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {TYPE_FILTERS.map(({ value, label }) => (
            <Button
              key={value}
              variant={filter === value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(value)}
              className="whitespace-nowrap flex-shrink-0 h-7 text-xs px-3"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 h-44 animate-pulse" />
          ))}
        </div>
      ) : totalItems === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="text-5xl">📭</div>
          <h3 className="text-base font-medium">
            {search || filter !== 'ALL' ? 'No matching accounts' : 'No accounts yet'}
          </h3>
          <p className="text-muted-foreground text-sm">
            {search || filter !== 'ALL' ? 'Try clearing filters' : 'Add your first storage account to get started'}
          </p>
          {!search && filter === 'ALL' && (
            <Button onClick={() => setShowAddAccount(true)} className="mt-2">
              <Plus className="h-4 w-4" /> Add First Account
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {filtered.accounts.map((account) => (
            <StorageCard key={account._id} account={account} onEdit={setEditingAccount} />
          ))}
          {filtered.albums.map((album) => (
            <SharedAlbumCard key={album._id} album={album} onEdit={setEditingAlbum} />
          ))}
        </div>
      )}

      <AddAccountModal
        open={showAddAccount || !!editingAccount}
        onClose={() => { setShowAddAccount(false); setEditingAccount(null); }}
        editAccount={editingAccount}
      />
      <AddSharedAlbumModal
        open={showAddAlbum || !!editingAlbum}
        onClose={() => { setShowAddAlbum(false); setEditingAlbum(null); }}
        editAlbum={editingAlbum}
      />
    </div>
  );
}
