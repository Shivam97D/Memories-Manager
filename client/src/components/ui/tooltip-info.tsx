import { useState } from 'react';
import { Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  step: number;
  title: string;
  description: string;
  code?: string;
}

interface InfoGuide {
  title: string;
  description: string;
  signupUrl?: string;
  signupLabel?: string;
  steps: Step[];
  freeNote?: string;
}

interface Props {
  guide: InfoGuide;
  className?: string;
}

export function InfoButton({ guide, className }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors underline underline-offset-2',
          className
        )}
      >
        <Info className="h-3 w-3" />
        How to get these?
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-start justify-between gap-3 rounded-t-xl">
              <div>
                <h3 className="font-semibold text-base">{guide.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{guide.description}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex-shrink-0 p-1 rounded-md hover:bg-secondary transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-5">
              {/* Signup link */}
              {guide.signupUrl && (
                <a
                  href={guide.signupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors"
                >
                  <span className="text-sm font-medium text-primary">{guide.signupLabel || 'Sign up / Open Dashboard'}</span>
                  <span className="text-xs text-primary/70">→</span>
                </a>
              )}

              {/* Steps */}
              <div className="space-y-4">
                {guide.steps.map(({ step, title, description, code }) => (
                  <div key={step} className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center mt-0.5">
                      {step}
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                      {code && (
                        <div className="bg-muted rounded-md px-3 py-2 mt-1">
                          <code className="text-xs font-mono text-foreground break-all">{code}</code>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Free tier note */}
              {guide.freeNote && (
                <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <span className="text-green-600 text-sm">✅</span>
                  <p className="text-xs text-green-700 dark:text-green-400 leading-relaxed">{guide.freeNote}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
