'use client';

import { useEffect } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const ErrorPage = ({ error, reset }: ErrorPageProps) => {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AppShell className="flex items-center justify-center">
      <div className="max-w-lg rounded-[32px] border border-white/10 bg-panel/80 p-8 text-center backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent">
          Unexpected Error
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white">The workspace hit a snag.</h1>
        <p className="mt-4 text-sm leading-6 text-muted">
          {error.message ||
            'Please try again. If the issue persists, restart the frontend and backend.'}
        </p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </AppShell>
  );
};

export default ErrorPage;
