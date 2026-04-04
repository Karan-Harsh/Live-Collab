import { cn } from '@/lib/utils';

import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-accent text-slate-950 hover:bg-accentStrong focus-visible:ring-accent/60 shadow-glow',
  secondary:
    'bg-white/10 text-text hover:bg-white/15 focus-visible:ring-white/20 border border-white/10',
  ghost: 'bg-transparent text-muted hover:bg-white/5 hover:text-text focus-visible:ring-white/15',
  danger: 'bg-rose-500/85 text-white hover:bg-rose-500 focus-visible:ring-rose-500/40',
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
        'inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
};
