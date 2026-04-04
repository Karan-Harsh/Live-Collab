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
        'before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_20%_0%,rgba(94,234,212,0.14),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(246,193,119,0.14),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_22%)] before:content-[""]',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-grid bg-[size:64px_64px] opacity-[0.08]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent)]" />
      <div className="pointer-events-none absolute left-[-8rem] top-40 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(94,234,212,0.18),transparent_65%)] blur-3xl" />
      <div className="pointer-events-none absolute right-[-6rem] top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(246,193,119,0.14),transparent_60%)] blur-3xl" />

      <div className="relative z-10 mx-auto min-h-screen w-full max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 shadow-[0_20px_60px_rgba(2,6,23,0.26)] backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(94,234,212,0.92),rgba(125,211,252,0.88))] text-sm font-black tracking-[0.18em] text-slate-950">
              LC
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7dd3fc]">
                Live Collab Studio
              </p>
              <p className="text-sm text-slate-300">Realtime whiteboards for invited teams</p>
            </div>
          </div>
          <div className="hidden rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-medium text-slate-400 md:block">
            Private boards • Live presence • Shared canvases
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};
