import { cn } from '@/lib/utils';

import type { InputHTMLAttributes } from 'react';

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <input
      className={cn(
        'w-full rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3.5 text-sm text-text outline-none transition duration-200 placeholder:text-muted focus:border-white/20 focus:bg-white/[0.05] focus:shadow-[0_0_0_4px_rgba(255,255,255,0.05)]',
        className,
      )}
      {...props}
    />
  );
};
