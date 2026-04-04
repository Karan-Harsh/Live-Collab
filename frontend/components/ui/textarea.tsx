import { cn } from '@/lib/utils';

import type { TextareaHTMLAttributes } from 'react';

export const Textarea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  return (
    <textarea
      className={cn(
        'w-full rounded-[26px] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-text outline-none transition duration-200 placeholder:text-muted focus:border-accent/40 focus:bg-white/[0.08] focus:shadow-[0_0_0_4px_rgba(94,234,212,0.08)]',
        className,
      )}
      {...props}
    />
  );
};
