import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, KeyRound, Image, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

type Step = 'email' | 'reset';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [form, setForm] = useState({ otp: '', newPassword: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const setField = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setStep('reset');
      toast.success('Reset code sent — check your inbox');
    } catch {
      toast.error('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email,
        otp: form.otp,
        newPassword: form.newPassword,
      });
      toast.success('Password reset! Please log in with your new password.');
      navigate('/login');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Invalid or expired code';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('New reset code sent');
    } catch {
      toast.error('Could not resend. Try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-3">
            <Image className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold">
            {step === 'email' ? 'Forgot password?' : 'Set new password'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {step === 'email'
              ? "Enter your email and we'll send you a reset code"
              : `Enter the 6-digit code sent to ${email}`}
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleSendCode} className="space-y-4 bg-card border border-border rounded-xl p-6">
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="h-4 w-4" />}
              required
              autoFocus
            />
            <Button type="submit" className="w-full" loading={loading}>
              Send Reset Code
            </Button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4 bg-card border border-border rounded-xl p-6">
            <Input
              label="Reset Code"
              placeholder="123456"
              maxLength={6}
              value={form.otp}
              onChange={(e) => setForm((p) => ({ ...p, otp: e.target.value.replace(/\D/g, '') }))}
              icon={<KeyRound className="h-4 w-4" />}
              className="text-center text-2xl font-bold tracking-widest"
              required
              autoFocus
            />
            <Input
              label="New Password"
              type="password"
              placeholder="Min 8 characters"
              value={form.newPassword}
              onChange={setField('newPassword')}
              icon={<Lock className="h-4 w-4" />}
              required
            />
            <Input
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              value={form.confirm}
              onChange={setField('confirm')}
              icon={<Lock className="h-4 w-4" />}
              required
            />
            <Button type="submit" className="w-full" loading={loading}>
              Reset Password
            </Button>
            <button
              type="button"
              onClick={handleResend}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Didn't receive it? Resend code
            </button>
          </form>
        )}

        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <Link to="/login" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to login
          </Link>
          {step === 'reset' && (
            <button
              onClick={() => { setStep('email'); setForm({ otp: '', newPassword: '', confirm: '' }); }}
              className="hover:text-foreground transition-colors"
            >
              Change email
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
