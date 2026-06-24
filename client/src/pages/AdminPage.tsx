import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, LayoutDashboard, Shield, ShieldOff, Trash2,
  Search, ChevronLeft, ChevronRight, Activity,
  UserCog, CheckCircle, XCircle, Crown, Settings2, Mail, MailX,
} from 'lucide-react';
import { api } from '@/lib/api';
import { AdminUser, SiteSettings } from '@/types';
import { Button } from '@/components/ui/button';
import { cn, getInitials, timeAgo } from '@/lib/utils';
import toast from 'react-hot-toast';

type Tab = 'stats' | 'users' | 'activity' | 'settings';

interface Stats {
  totalUsers: number;
  totalAdmins: number;
  totalAccounts: number;
  totalShares: number;
  totalLogs: number;
  recentUsers: AdminUser[];
}

interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  pages: number;
}

interface ActivityEntry {
  _id: string;
  userId?: { name: string; email: string } | string;
  action: string;
  resourcePath?: string;
  createdAt: string;
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', color)}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
      role === 'admin'
        ? 'bg-primary/10 text-primary'
        : 'bg-secondary text-muted-foreground'
    )}>
      {role === 'admin' && <Crown className="h-3 w-3" />}
      {role}
    </span>
  );
}

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('stats');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then((r) => r.data),
    enabled: tab === 'stats',
  });

  const { data: usersData, isLoading: usersLoading } = useQuery<UsersResponse>({
    queryKey: ['admin-users', page, search, roleFilter],
    queryFn: () =>
      api.get(`/admin/users?page=${page}&search=${encodeURIComponent(search)}&role=${roleFilter}`)
        .then((r) => r.data),
    enabled: tab === 'users',
  });

  const { data: activity = [], isLoading: activityLoading } = useQuery<ActivityEntry[]>({
    queryKey: ['admin-activity'],
    queryFn: () => api.get('/admin/activity?limit=100').then((r) => r.data),
    enabled: tab === 'activity',
  });

  const { data: siteSettings, isLoading: settingsLoading } = useQuery<SiteSettings>({
    queryKey: ['admin-settings'],
    queryFn: () => api.get('/admin/settings').then((r) => r.data),
    enabled: tab === 'settings',
  });

  const settingsMut = useMutation({
    mutationFn: (emailVerificationEnabled: boolean) =>
      api.patch('/admin/settings', { emailVerificationEnabled }).then((r) => r.data),
    onSuccess: (data: SiteSettings) => {
      qc.setQueryData(['admin-settings'], data);
      toast.success(
        data.emailVerificationEnabled
          ? 'Email verification enabled'
          : 'Email verification disabled — users can sign up and log in directly'
      );
    },
    onError: () => toast.error('Failed to update settings'),
  });

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.patch(`/admin/users/${id}/role`, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Role updated');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed';
      toast.error(msg);
    },
  });

  const suspendMut = useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) =>
      api.patch(`/admin/users/${id}/suspend`, { suspended }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User status updated');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed';
      toast.error(msg);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('User deleted');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed';
      toast.error(msg);
    },
  });

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleRoleFilter = (v: string) => { setRoleFilter(v); setPage(1); };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'stats', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'users', label: 'Users', icon: <Users className="h-4 w-4" /> },
    { id: 'activity', label: 'Activity', icon: <Activity className="h-4 w-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings2 className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold">Admin Panel</h1>
          <p className="text-xs text-muted-foreground">Site management &amp; user control</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1 w-fit">
        {tabs.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              tab === id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* STATS TAB */}
      {tab === 'stats' && (
        <div className="space-y-5">
          {statsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4 h-20 animate-pulse" />
              ))}
            </div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={<Users className="h-5 w-5 text-white" />} label="Total Users" value={stats.totalUsers} color="bg-blue-500" />
                <StatCard icon={<Crown className="h-5 w-5 text-white" />} label="Admins" value={stats.totalAdmins} color="bg-primary" />
                <StatCard icon={<Shield className="h-5 w-5 text-white" />} label="Storage Accounts" value={stats.totalAccounts} color="bg-green-500" />
                <StatCard icon={<Activity className="h-5 w-5 text-white" />} label="Total Shares" value={stats.totalShares} color="bg-orange-500" />
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-medium text-sm mb-4">Recently Joined</h3>
                <div className="space-y-3">
                  {stats.recentUsers.map((u) => (
                    <div key={u._id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {getInitials(u.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <RoleBadge role={u.role} />
                        <span className="text-xs text-muted-foreground hidden sm:block">{timeAgo(u.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* USERS TAB */}
      {tab === 'users' && (
        <div className="space-y-4">
          {/* Search + filter */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={roleFilter}
              onChange={(e) => handleRoleFilter(e.target.value)}
            >
              <option value="">All roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
          </div>

          {usersLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl h-16 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div className="text-xs text-muted-foreground">
                {usersData?.total ?? 0} user{usersData?.total !== 1 && 's'}
              </div>

              <div className="space-y-2">
                {(usersData?.users ?? []).map((u) => (
                  <div
                    key={u._id}
                    className={cn(
                      'bg-card border border-border rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3',
                      u.isSuspended && 'opacity-60 border-red-200'
                    )}
                  >
                    {/* Avatar + info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                        u.role === 'admin' ? 'bg-primary text-white' : 'bg-secondary'
                      )}>
                        {getInitials(u.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">{u.name}</p>
                          <RoleBadge role={u.role} />
                          {u.isSuspended && (
                            <span className="text-xs text-red-500 font-medium">Suspended</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                      <span className="hidden md:block">{u.accountCount} account{u.accountCount !== 1 && 's'}</span>
                      <span className="hidden sm:block">{timeAgo(u.createdAt)}</span>
                      {u.emailVerified
                        ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                        : <XCircle className="h-3.5 w-3.5 text-red-400" />
                      }
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                      {/* Toggle role */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => roleMut.mutate({ id: u._id, role: u.role === 'admin' ? 'user' : 'admin' })}
                        loading={roleMut.isPending}
                        title={u.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                      >
                        <UserCog className="h-3 w-3" />
                        {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                      </Button>

                      {/* Suspend / Activate */}
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn('h-7 text-xs gap-1', u.isSuspended ? 'text-green-600 border-green-300' : 'text-orange-600 border-orange-300')}
                        onClick={() => suspendMut.mutate({ id: u._id, suspended: !u.isSuspended })}
                        loading={suspendMut.isPending}
                      >
                        {u.isSuspended
                          ? <><ShieldOff className="h-3 w-3" /> Activate</>
                          : <><Shield className="h-3 w-3" /> Suspend</>
                        }
                      </Button>

                      {/* Delete */}
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => {
                          if (confirm(`Delete user "${u.name}" and all their data? This cannot be undone.`)) {
                            deleteMut.mutate(u._id);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {usersData && usersData.pages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {usersData.pages}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page === usersData.pages}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* SETTINGS TAB */}
      {tab === 'settings' && (
        <div className="space-y-4 max-w-lg">
          {settingsLoading ? (
            <div className="bg-card border border-border rounded-xl h-24 animate-pulse" />
          ) : (
            <div className="bg-card border border-border rounded-xl p-5 space-y-5">
              <div>
                <h3 className="font-semibold text-sm">Authentication Settings</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Control how users sign up and log in</p>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                    siteSettings?.emailVerificationEnabled ? 'bg-green-100 text-green-600' : 'bg-secondary text-muted-foreground'
                  )}>
                    {siteSettings?.emailVerificationEnabled
                      ? <Mail className="h-4 w-4" />
                      : <MailX className="h-4 w-4" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email Verification</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {siteSettings?.emailVerificationEnabled
                        ? 'Users must verify their email via OTP before accessing the app.'
                        : 'Off — users can register and log in directly without email verification.'
                      }
                    </p>
                  </div>
                </div>

                {/* Toggle */}
                <button
                  role="switch"
                  aria-checked={siteSettings?.emailVerificationEnabled ?? false}
                  disabled={settingsMut.isPending}
                  onClick={() => settingsMut.mutate(!(siteSettings?.emailVerificationEnabled ?? false))}
                  className={cn(
                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50',
                    siteSettings?.emailVerificationEnabled ? 'bg-green-500' : 'bg-secondary'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200',
                      siteSettings?.emailVerificationEnabled ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>

              <div className={cn(
                'rounded-lg px-4 py-3 text-xs leading-relaxed',
                siteSettings?.emailVerificationEnabled
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              )}>
                {siteSettings?.emailVerificationEnabled
                  ? 'Email verification is active. Make sure SMTP is configured on Render for emails to deliver.'
                  : 'Email verification is off. New users are created as verified and logged in immediately after sign-up.'
                }
              </div>
            </div>
          )}
        </div>
      )}

      {/* ACTIVITY TAB */}
      {tab === 'activity' && (
        <div className="space-y-2">
          {activityLoading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-lg h-12 animate-pulse" />
            ))
          ) : activity.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">No activity yet</div>
          ) : (
            activity.map((log) => {
              const who = typeof log.userId === 'object' && log.userId
                ? log.userId.email
                : 'Unknown';
              return (
                <div key={log._id} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{who}</span>
                      {' · '}
                      <span className="text-muted-foreground">{log.action}</span>
                      {log.resourcePath && (
                        <span className="text-xs text-muted-foreground ml-1 font-mono truncate">
                          {log.resourcePath.length > 40
                            ? '…' + log.resourcePath.slice(-40)
                            : log.resourcePath}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{timeAgo(log.createdAt)}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
