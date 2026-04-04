import { cn } from '@/lib/utils';

import type { InputHTMLAttributes } from 'react';

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <input
      className={cn(
        'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-text outline-none transition placeholder:text-muted focus:border-accent/50 focus:bg-white/10',
        className,
      )}
      {...props}
    />
  );
};
