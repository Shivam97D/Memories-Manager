import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  color?: string;
}

export function Progress({ value, max = 100, className, color }: ProgressProps) {
  const pct = Math.min(100, (value / max) * 100);
  const barColor = pct > 85 ? 'bg-red-500' : pct > 65 ? 'bg-amber-500' : color || 'bg-primary';
  return (
    <div className={cn('h-1.5 w-full rounded-full bg-secondary overflow-hidden', className)}>
      <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} />
    </div>
  );
}
