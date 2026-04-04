import Link from 'next/link';

import { AppShell } from '@/components/app-shell';
import { Badge } from '@/components/ui/badge';

import type { PropsWithChildren } from 'react';

interface AuthShellProps extends PropsWithChildren {
  eyebrow: string;
  title: string;
  description: string;
  alternateHref: string;
  alternateLabel: string;
}

export const AuthShell = ({
  children,
  eyebrow,
  title,
  description,
  alternateHref,
  alternateLabel,
}: AuthShellProps) => {
  return (
    <AppShell className="flex items-center">
      <div className="grid w-full gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="flex flex-col justify-between rounded-[32px] border border-white/10 bg-panel/70 p-8 shadow-2xl shadow-black/20 backdrop-blur xl:p-12">
          <div className="space-y-6">
            <Badge className="border-accent/20 bg-accent/10 text-accent">
              Realtime SaaS Workspace
            </Badge>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Collaborate on living documents without breaking focus.
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted sm:text-lg">
                Shared drafting, instant sync, and secure document access for teams that need speed
                and clarity.
              </p>
            </div>
          </div>
          <div className="grid gap-4 rounded-[28px] border border-white/10 bg-white/5 p-5 sm:grid-cols-3">
            <div>
              <p className="text-2xl font-semibold text-white">Live</p>
              <p className="text-sm text-muted">Socket-powered document rooms</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-white">Secure</p>
              <p className="text-sm text-muted">JWT auth with protected APIs</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-white">Shared</p>
              <p className="text-sm text-muted">Owner controls with view access</p>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-panelSoft/80 p-8 backdrop-blur xl:p-10">
          <div className="mb-8 space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent">
              {eyebrow}
            </p>
            <h2 className="text-3xl font-semibold text-white">{title}</h2>
            <p className="text-sm leading-6 text-muted">{description}</p>
          </div>

          {children}

          <p className="mt-6 text-sm text-muted">
            Need a different path?{' '}
            <Link
              href={alternateHref}
              className="font-semibold text-accent transition hover:text-accentSky"
            >
              {alternateLabel}
            </Link>
          </p>
        </section>
      </div>
    </AppShell>
  );
};
