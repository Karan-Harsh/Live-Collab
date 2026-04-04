import { cn } from '@/lib/utils';

import type { TextareaHTMLAttributes } from 'react';

export const Textarea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  return (
    <textarea
      className={cn(
        'w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-text outline-none transition placeholder:text-muted focus:border-accent/50 focus:bg-white/10',
        className,
      )}
      {...props}
    />
  );
};
