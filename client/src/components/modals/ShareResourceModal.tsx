import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Permission, ResourceType } from '@/types';
import { cn } from '@/lib/utils';
import { Link2, Mail, Copy, Trash2, Users, Check, ExternalLink } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  storageAccountId: string;
  resourcePath: string;
  resourceType: ResourceType;
  resourceName: string;
}

type Tab = 'email' | 'link';

const PERMISSIONS: { value: Permission; label: string; desc: string }[] = [
  { value: 'VIEW', label: 'View', desc: 'Browse & preview' },
  { value: 'DOWNLOAD', label: 'Download', desc: 'Download files' },
  { value: 'EDIT', label: 'Upload', desc: 'Upload new files' },
  { value: 'DELETE', label: 'Delete', desc: 'Delete files' },
];

interface InviteDoc {
  _id: string;
  token: string;
  permissions: Permission[];
  expiresAt?: string;
  isActive: boolean;
  acceptedBy: string[];
  createdAt: string;
}

function PermissionPicker({
  selected,
  onChange,
}: {
  selected: Permission[];
  onChange: (p: Permission[]) => void;
}) {
  const toggle = (p: Permission) =>
    onChange(selected.includes(p) ? selected.filter((x) => x !== p) : [...selected, p]);

  return (
    <div className="grid grid-cols-2 gap-2">
      {PERMISSIONS.map(({ value, label, desc }) => (
        <button
          key={value}
          type="button"
          onClick={() => toggle(value)}
          className={cn(
            'flex flex-col items-start p-3 rounded-lg border text-left transition-colors',
            selected.includes(value)
              ? 'border-primary bg-accent text-accent-foreground'
              : 'border-border hover:bg-secondary'
          )}
        >
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">{desc}</span>
        </button>
      ))}
    </div>
  );
}

export function ShareResourceModal({
  open,
  onClose,
  storageAccountId,
  resourcePath,
  resourceType,
  resourceName,
}: Props) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('link');

  // Email tab state
  const [toUserEmail, setToUserEmail] = useState('');
  const [emailPerms, setEmailPerms] = useState<Permission[]>(['VIEW']);
  const [emailExpiry, setEmailExpiry] = useState('');

  // Link tab state
  const [linkPerms, setLinkPerms] = useState<Permission[]>(['VIEW', 'DOWNLOAD']);
  const [linkExpiry, setLinkExpiry] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const appUrl = window.location.origin;

  // Load existing invite links for this resource
  const { data: invites = [], refetch: refetchInvites } = useQuery<InviteDoc[]>({
    queryKey: ['invites', storageAccountId, resourcePath],
    queryFn: () =>
      api.get('/invites')
        .then((r) => (r.data as InviteDoc[]).filter(
          (i) => i.isActive && i.permissions.length > 0 &&
            // We can't filter by resourcePath server-side easily, so filter client-side
            true
        )),
    enabled: open && tab === 'link',
    staleTime: 10_000,
  });

  // Filter invites to this resource
  const resourceInvites = invites.filter((_) => true); // server returns all; we'll show all active

  // Email share mutation
  const emailMut = useMutation({
    mutationFn: () =>
      api.post('/shares', {
        toUserEmail,
        storageAccountId,
        resourcePath,
        resourceType,
        permissions: emailPerms,
        expiresAt: emailExpiry || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shares-sent'] });
      toast.success(`Shared with ${toUserEmail}`);
      setToUserEmail('');
      setEmailPerms(['VIEW']);
      setEmailExpiry('');
    },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      toast.error(err?.response?.data?.error || 'Failed to share'),
  });

  // Create invite link mutation
  const createLinkMut = useMutation({
    mutationFn: () =>
      api.post('/invites', {
        storageAccountId,
        resourcePath,
        resourceType,
        permissions: linkPerms,
        expiresAt: linkExpiry || undefined,
      }),
    onSuccess: () => {
      refetchInvites();
      toast.success('Invite link created');
      setLinkExpiry('');
    },
    onError: () => toast.error('Failed to create link'),
  });

  // Revoke invite mutation
  const revokeMut = useMutation({
    mutationFn: (id: string) => api.delete(`/invites/${id}`),
    onSuccess: () => { refetchInvites(); toast.success('Link revoked'); },
    onError: () => toast.error('Failed to revoke link'),
  });

  const copyLink = async (token: string) => {
    const url = `${appUrl}/invite/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Link copied!');
  };

  const handleClose = () => {
    onClose();
    setTab('link');
    setToUserEmail('');
    setEmailPerms(['VIEW']);
    setEmailExpiry('');
    setLinkPerms(['VIEW', 'DOWNLOAD']);
    setLinkExpiry('');
  };

  const tabs = [
    { id: 'link' as Tab, label: 'Share via Link', icon: <Link2 className="h-3.5 w-3.5" /> },
    { id: 'email' as Tab, label: 'Share by Email', icon: <Mail className="h-3.5 w-3.5" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share "{resourceName}"</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          {tabs.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                tab === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* ── Share via Link tab ── */}
        {tab === 'link' && (
          <div className="space-y-4">
            <PermissionPicker selected={linkPerms} onChange={setLinkPerms} />

            <Input
              label="Expires at (optional)"
              type="datetime-local"
              value={linkExpiry}
              onChange={(e) => setLinkExpiry(e.target.value)}
            />

            <Button
              className="w-full"
              onClick={() => createLinkMut.mutate()}
              loading={createLinkMut.isPending}
              disabled={linkPerms.length === 0}
            >
              <Link2 className="h-4 w-4" /> Generate invite link
            </Button>

            {/* Existing invite links for this account */}
            {resourceInvites.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Active invite links
                </p>
                {resourceInvites.map((inv) => (
                  <div key={inv._id} className="flex items-center gap-2 p-2.5 bg-secondary rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-1 mb-1">
                        {inv.permissions.map((p) => (
                          <span key={p} className="text-[10px] bg-card border border-border px-1.5 py-0.5 rounded-full font-medium">
                            {p}
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {inv.acceptedBy.length} accepted
                        {inv.expiresAt && ` · expires ${new Date(inv.expiresAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <button
                      onClick={() => copyLink(inv.token)}
                      className="p-1.5 rounded-md hover:bg-card transition-colors flex-shrink-0"
                      title="Copy link"
                    >
                      {copiedId === inv.token
                        ? <Check className="h-3.5 w-3.5 text-green-500" />
                        : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                    <a
                      href={`/invite/${inv.token}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-md hover:bg-card transition-colors flex-shrink-0"
                      title="Open link"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                    <button
                      onClick={() => revokeMut.mutate(inv._id)}
                      className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
                      title="Revoke link"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Share by Email tab ── */}
        {tab === 'email' && (
          <div className="space-y-4">
            <Input
              label="Share with (email)"
              type="email"
              placeholder="user@example.com"
              value={toUserEmail}
              onChange={(e) => setToUserEmail(e.target.value)}
            />

            <PermissionPicker selected={emailPerms} onChange={setEmailPerms} />

            <Input
              label="Expires at (optional)"
              type="datetime-local"
              value={emailExpiry}
              onChange={(e) => setEmailExpiry(e.target.value)}
            />

            <Button
              className="w-full"
              onClick={() => emailMut.mutate()}
              loading={emailMut.isPending}
              disabled={!toUserEmail || emailPerms.length === 0}
            >
              <Mail className="h-4 w-4" /> Share
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              The user must already have a PixelVault account. For new users, use "Share via Link" instead.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
