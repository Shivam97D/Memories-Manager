import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Folder, File, Shield, Download, Upload, Trash2,
  Eye, CheckCircle, XCircle, Loader2, Link2, Image,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface InviteDetails {
  token: string;
  isValid: boolean;
  isExpired: boolean;
  isRevoked: boolean;
  resourceType: 'FOLDER' | 'FILE';
  resourceName: string;
  permissions: string[];
  expiresAt?: string;
  fromUser: { name: string; avatar?: string };
  storageAccount: { name: string; type: string };
  acceptedCount: number;
}

const PERM_ICONS: Record<string, React.ReactNode> = {
  VIEW: <Eye className="h-3.5 w-3.5" />,
  DOWNLOAD: <Download className="h-3.5 w-3.5" />,
  EDIT: <Upload className="h-3.5 w-3.5" />,
  DELETE: <Trash2 className="h-3.5 w-3.5" />,
};
const PERM_LABELS: Record<string, string> = {
  VIEW: 'View & Browse',
  DOWNLOAD: 'Download',
  EDIT: 'Upload files',
  DELETE: 'Delete files',
};

export function InviteLandingPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);

  // 1. Load public invite details
  useEffect(() => {
    if (!token) return;
    api.get(`/invites/public/${token}`)
      .then(({ data }) => setInvite(data))
      .catch(() => setInvite(null))
      .finally(() => setLoadingInvite(false));
  }, [token]);

  // 2. Auto-accept if already logged in and invite is valid
  useEffect(() => {
    if (!user || !invite?.isValid || accepted || accepting) return;
    handleAccept();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, invite]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const { data } = await api.post(`/invites/${token}/accept`);
      setShareId(data.share._id);
      setAccepted(true);
      toast.success('Access granted!');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to accept invite';
      toast.error(msg);
    } finally {
      setAccepting(false);
    }
  };

  const goToShared = () => {
    if (shareId) navigate(`/shared-manager/${shareId}`);
    else navigate('/shares');
  };

  if (loadingInvite) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3 max-w-sm">
          <XCircle className="h-12 w-12 text-red-400 mx-auto" />
          <h2 className="text-lg font-semibold">Invite not found</h2>
          <p className="text-sm text-muted-foreground">This link may be invalid or was never created.</p>
          <Button onClick={() => navigate('/login')} variant="outline">Go to Login</Button>
        </div>
      </div>
    );
  }

  if (!invite.isValid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3 max-w-sm">
          <XCircle className="h-12 w-12 text-red-400 mx-auto" />
          <h2 className="text-lg font-semibold">
            {invite.isExpired ? 'Invite expired' : 'Invite revoked'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {invite.isExpired
              ? 'This invite link has expired. Ask the owner for a new one.'
              : 'The owner has revoked this invite link.'}
          </p>
          <Button onClick={() => navigate('/login')} variant="outline">Go to Login</Button>
        </div>
      </div>
    );
  }

  // Auto-accepting (logged in, valid invite)
  if (user && accepting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Granting access…</p>
        </div>
      </div>
    );
  }

  // Access accepted
  if (accepted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <CheckCircle className="h-14 w-14 text-green-500 mx-auto" />
          <div>
            <h2 className="text-xl font-bold">Access granted!</h2>
            <p className="text-sm text-muted-foreground mt-1">
              You can now browse <span className="font-medium text-foreground">"{invite.resourceName}"</span>
            </p>
          </div>
          <Button className="w-full" onClick={goToShared}>
            Open shared {invite.resourceType === 'FOLDER' ? 'folder' : 'file'}
          </Button>
        </div>
      </div>
    );
  }

  // Not logged in — show invite card
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-5">
        {/* Header */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-3">
            <Image className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold">You've been invited</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in or create an account to get access
          </p>
        </div>

        {/* Invite card */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-primary to-violet-500" />
          <div className="p-5 space-y-4">
            {/* Resource */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                {invite.resourceType === 'FOLDER'
                  ? <Folder className="h-6 w-6 text-amber-500" />
                  : <File className="h-6 w-6 text-primary" />}
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{invite.resourceName}</p>
                <p className="text-xs text-muted-foreground">
                  {invite.resourceType === 'FOLDER' ? 'Shared folder' : 'Shared file'}
                  {' · '}{invite.storageAccount.name}
                </p>
              </div>
            </div>

            {/* From */}
            <div className="flex items-center gap-2 text-sm">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Shield className="h-3 w-3 text-primary" />
              </div>
              <span className="text-muted-foreground">Shared by</span>
              <span className="font-medium">{invite.fromUser.name}</span>
            </div>

            {/* Permissions */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">You will be able to:</p>
              <div className="flex flex-wrap gap-1.5">
                {invite.permissions.map((p) => (
                  <span
                    key={p}
                    className={cn(
                      'inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
                      p === 'DELETE'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-accent text-accent-foreground'
                    )}
                  >
                    {PERM_ICONS[p]} {PERM_LABELS[p] || p}
                  </span>
                ))}
              </div>
            </div>

            {/* Expiry */}
            {invite.expiresAt && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                Expires {new Date(invite.expiresAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* CTA buttons */}
        <div className="space-y-2">
          <Button className="w-full" onClick={() => navigate(`/login?invite=${token}`)}>
            Sign in to accept
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate(`/register?invite=${token}`)}>
            Create an account
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {invite.acceptedCount > 0 && `${invite.acceptedCount} person${invite.acceptedCount !== 1 ? 's have' : ' has'} already accepted this invite`}
        </p>
      </div>
    </div>
  );
}
