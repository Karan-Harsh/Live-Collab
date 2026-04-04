import { cn } from '@/lib/utils';

import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'border border-white/10 bg-[linear-gradient(135deg,rgba(94,234,212,0.98),rgba(125,211,252,0.88))] text-slate-950 hover:brightness-105 focus-visible:ring-accent/60 shadow-[0_18px_50px_rgba(94,234,212,0.18)]',
  secondary:
    'border border-white/10 bg-white/[0.06] text-text hover:bg-white/[0.1] focus-visible:ring-white/20',
  ghost:
    'border border-transparent bg-transparent text-muted hover:border-white/10 hover:bg-white/[0.04] hover:text-text focus-visible:ring-white/15',
  danger:
    'border border-rose-400/20 bg-[linear-gradient(135deg,rgba(244,63,94,0.88),rgba(225,29,72,0.92))] text-white hover:brightness-105 focus-visible:ring-rose-500/40',
};

export const Button = ({
  className,
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) => {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
};
