import { useState } from 'react';
import { User, Mail, Phone, Save, Lock, LogOut, ShieldCheck } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';

export function ProfilePage() {
  const { user, updateUser, logout, refreshToken } = useAuthStore();
  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [showPassSection, setShowPassSection] = useState(false);

  const setProfileField = (key: keyof typeof profile) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setProfile((p) => ({ ...p, [key]: e.target.value }));

  const setPassField = (key: keyof typeof passwords) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setPasswords((p) => ({ ...p, [key]: e.target.value }));

  const profileMut = useMutation({
    mutationFn: (data: typeof profile) => api.patch('/auth/profile', data),
    onSuccess: ({ data }) => { updateUser(data); toast.success('Profile updated'); },
    onError: () => toast.error('Update failed'),
  });

  const passwordMut = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.patch('/auth/change-password', data),
    onSuccess: () => {
      toast.success('Password changed');
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
      setShowPassSection(false);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to change password';
      toast.error(msg);
    },
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwords.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    passwordMut.mutate({
      currentPassword: passwords.currentPassword,
      newPassword: passwords.newPassword,
    });
  };

  const handleLogout = async () => {
    try { await api.post('/auth/logout', { refreshToken }); } catch {}
    logout();
  };

  return (
    <div className="max-w-lg space-y-5">
      {/* Avatar card */}
      <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
          {user ? getInitials(user.name) : 'U'}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold truncate">{user?.name}</h2>
          <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
          <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1">
            <ShieldCheck className="h-3 w-3" /> Verified account
          </span>
        </div>
      </div>

      {/* Personal info */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-medium text-sm">Personal Information</h3>
        <Input
          label="Full Name"
          value={profile.name}
          onChange={setProfileField('name')}
          icon={<User className="h-4 w-4" />}
        />
        <Input
          label="Email"
          value={user?.email || ''}
          disabled
          icon={<Mail className="h-4 w-4" />}
        />
        <Input
          label="Phone (optional)"
          value={profile.phone}
          onChange={setProfileField('phone')}
          icon={<Phone className="h-4 w-4" />}
          placeholder="+91 9876543210"
        />
        <Button
          onClick={() => profileMut.mutate(profile)}
          loading={profileMut.isPending}
          size="sm"
        >
          <Save className="h-4 w-4" /> Save Changes
        </Button>
      </div>

      {/* Change password */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">Password & Security</h3>
          <button
            onClick={() => setShowPassSection((v) => !v)}
            className="text-xs text-primary hover:underline"
          >
            {showPassSection ? 'Cancel' : 'Change password'}
          </button>
        </div>

        {!showPassSection ? (
          <p className="text-sm text-muted-foreground">
            Your password is encrypted and secure. You can change it at any time.
          </p>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-3">
            <Input
              label="Current Password"
              type="password"
              placeholder="••••••••"
              value={passwords.currentPassword}
              onChange={setPassField('currentPassword')}
              icon={<Lock className="h-4 w-4" />}
              required
              autoFocus
            />
            <Input
              label="New Password"
              type="password"
              placeholder="Min 8 characters"
              value={passwords.newPassword}
              onChange={setPassField('newPassword')}
              icon={<Lock className="h-4 w-4" />}
              required
            />
            <Input
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              value={passwords.confirm}
              onChange={setPassField('confirm')}
              icon={<Lock className="h-4 w-4" />}
              required
            />
            <Button type="submit" size="sm" loading={passwordMut.isPending}>
              <ShieldCheck className="h-4 w-4" /> Update Password
            </Button>
          </form>
        )}
      </div>

      {/* Logout */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-medium text-sm mb-3">Session</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Logging out will end your current session on this device.
        </p>
        <Button variant="destructive" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4" /> Log Out
        </Button>
      </div>
    </div>
  );
}
