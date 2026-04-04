'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useAuthStore } from '@/services/auth-store';

import type { PropsWithChildren } from 'react';

interface RouteGuardProps extends PropsWithChildren {
  mode: 'protected' | 'guest';
}

export const RouteGuard = ({ children, mode }: RouteGuardProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { accessToken, hydrated } = useAuthStore(
    useShallow((state) => ({
      accessToken: state.accessToken,
      hydrated: state.hydrated,
    })),
  );

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (mode === 'protected' && !accessToken) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }

    if (mode === 'guest' && accessToken) {
      router.replace('/dashboard');
    }
  }, [accessToken, hydrated, mode, pathname, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-muted">
        Loading workspace...
      </div>
    );
  }

  if (mode === 'protected' && !accessToken) {
    return null;
  }

  if (mode === 'guest' && accessToken) {
    return null;
  }

  return <>{children}</>;
};
