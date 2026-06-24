import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

type Step = 'register' | 'verify';

export function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [step, setStep] = useState<Step>('register');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
      });

      if (data.accessToken) {
        // Email verification is off — server issued tokens immediately
        setAuth(data.user, data.accessToken, data.refreshToken);
        toast.success('Account created! Welcome to PixelVault.');
        navigate('/dashboard');
      } else {
        // Email verification is on — proceed to OTP step
        setEmail(form.email);
        setStep('verify');
        toast.success('Check your email for the verification code');
      }
    } catch (err: unknown) {
      const e = err as { code?: string; response?: { data?: { error?: string } } };
      const msg =
        e.code === 'ECONNABORTED'
          ? 'Request timed out — server may be starting up. Please try again in a moment.'
          : e.response?.data?.error || 'Registration failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-email', { email, otp });
      setAuth(data.user, data.accessToken, data.refreshToken);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Verification failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await api.post('/auth/resend-otp', { email });
      toast.success('New OTP sent');
    } catch {
      toast.error('Failed to resend OTP');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-3">
            <Image className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold">{step === 'register' ? 'Create account' : 'Verify email'}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {step === 'register' ? 'Start managing your media libraries' : `Enter the 6-digit code sent to ${email}`}
          </p>
        </div>

        {step === 'register' ? (
          <form onSubmit={handleRegister} className="space-y-4 bg-card border border-border rounded-xl p-6">
            <Input label="Full Name" placeholder="Shivam Dahifale" value={form.name} onChange={set('name')} icon={<User className="h-4 w-4" />} required />
            <Input label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} icon={<Mail className="h-4 w-4" />} required />
            <Input label="Phone (optional)" type="tel" placeholder="+91 9876543210" value={form.phone} onChange={set('phone')} icon={<Phone className="h-4 w-4" />} />
            <Input label="Password" type="password" placeholder="Min 8 characters" value={form.password} onChange={set('password')} icon={<Lock className="h-4 w-4" />} required />
            <Input label="Confirm Password" type="password" placeholder="••••••••" value={form.confirm} onChange={set('confirm')} icon={<Lock className="h-4 w-4" />} required />
            <Button type="submit" className="w-full" loading={loading}>Create Account</Button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4 bg-card border border-border rounded-xl p-6">
            <Input
              label="Verification Code"
              placeholder="123456"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl font-bold tracking-widest"
              required
            />
            <Button type="submit" className="w-full" loading={loading}>Verify & Sign In</Button>
            <button type="button" onClick={handleResend} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
              Didn't receive it? Resend code
            </button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
