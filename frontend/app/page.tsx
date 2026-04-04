'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { RouteGuard } from '@/components/auth/route-guard';
import { useAuthStore } from '@/services/auth-store';

const HomePage = () => {
  const router = useRouter();
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

    router.replace(accessToken ? '/dashboard' : '/login');
  }, [accessToken, hydrated, router]);

  return (
    <RouteGuard mode="guest">
      <div className="min-h-screen bg-canvas" />
    </RouteGuard>
  );
};

export default HomePage;
