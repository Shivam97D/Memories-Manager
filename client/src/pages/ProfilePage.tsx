import { useState } from 'react';
import { User, Mail, Phone, Save } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';

export function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });

  const mutation = useMutation({
    mutationFn: (data: typeof form) => api.patch('/auth/profile', data),
    onSuccess: ({ data }) => {
      updateUser(data);
      toast.success('Profile updated');
    },
    onError: () => toast.error('Update failed'),
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-card border border-border rounded-xl p-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
          {user ? getInitials(user.name) : 'U'}
        </div>
        <div>
          <h2 className="text-lg font-semibold">{user?.name}</h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="font-medium">Personal Information</h3>
        <Input
          label="Full Name"
          value={form.name}
          onChange={set('name')}
          icon={<User className="h-4 w-4" />}
        />
        <Input
          label="Email"
          value={user?.email || ''}
          disabled
          icon={<Mail className="h-4 w-4" />}
        />
        <Input
          label="Phone"
          value={form.phone}
          onChange={set('phone')}
          icon={<Phone className="h-4 w-4" />}
          placeholder="+91 9876543210"
        />
        <Button onClick={() => mutation.mutate(form)} loading={mutation.isPending}>
          <Save className="h-4 w-4" /> Save Changes
        </Button>
      </div>
    </div>
  );
}
