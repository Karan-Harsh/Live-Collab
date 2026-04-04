import { cn } from '@/lib/utils';

import type { HTMLAttributes } from 'react';

export const Badge = ({ className, ...props }: HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300',
        className,
      )}
      {...props}
    />
  );
};
