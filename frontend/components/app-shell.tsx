import { cn } from '@/lib/utils';

import type { PropsWithChildren } from 'react';

interface AppShellProps extends PropsWithChildren {
  className?: string;
  immersive?: boolean;
  hideHeader?: boolean;
}

export const AppShell = ({
  children,
  className,
  immersive = false,
  hideHeader = false,
}: AppShellProps) => {
  return (
    <div
      className={cn(
        'relative min-h-screen overflow-hidden bg-canvas text-text',
        'before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.05),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_18%)] before:content-[""]',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-grid bg-[size:64px_64px] opacity-[0.05]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]" />

      <div
        className={cn(
          'relative z-10 min-h-screen w-full',
          immersive ? 'px-0 py-0' : 'mx-auto max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8',
        )}
      >
        {!hideHeader ? (
          <div className="mb-6 flex items-center justify-between rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 shadow-[0_20px_60px_rgba(2,6,23,0.26)] backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-sm font-black tracking-[0.18em] text-white">
                LC
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">
                  Live Collab
                </p>
                <p className="text-sm text-slate-300">Private realtime whiteboards</p>
              </div>
            </div>
            <div className="hidden rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-medium text-slate-400 md:block">
              Monochrome workspace • Invite only • Live collaboration
            </div>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
};
