import { cn } from '@/lib/utils';

import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(224,224,224,0.88))] text-black hover:brightness-105 focus-visible:ring-white/30 shadow-[0_18px_50px_rgba(255,255,255,0.08)]',
  secondary:
    'border border-white/12 bg-white/[0.06] text-text hover:bg-white/[0.1] focus-visible:ring-white/20',
  ghost:
    'border border-transparent bg-transparent text-muted hover:border-white/10 hover:bg-white/[0.04] hover:text-text focus-visible:ring-white/15',
  danger:
    'border border-white/12 bg-[linear-gradient(180deg,rgba(58,58,58,0.96),rgba(24,24,24,0.96))] text-white hover:brightness-110 focus-visible:ring-white/20',
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
