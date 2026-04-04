import { cn } from '@/lib/utils';

import type { PropsWithChildren } from 'react';

interface AppShellProps extends PropsWithChildren {
  className?: string;
}

export const AppShell = ({ children, className }: AppShellProps) => {
  return (
    <div
      className={cn(
        'relative min-h-screen overflow-hidden bg-canvas text-text',
        'before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.16),transparent_38%),radial-gradient(circle_at_80%_20%,rgba(56,189,248,0.14),transparent_28%)] before:content-[""]',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-grid bg-[size:56px_56px] opacity-20" />
      <div className="relative z-10 mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
};
