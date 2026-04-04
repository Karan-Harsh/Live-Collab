'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { RouteGuard } from '@/components/auth/route-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/error';
import { login } from '@/services/auth-service';
import { useAuthStore } from '@/services/auth-store';

const LoginPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((state) => state.setSession);

  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (session) => {
      setSession(session);
      router.replace(searchParams.get('next') ?? '/dashboard');
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError));
    },
  });

  return (
    <RouteGuard mode="guest">
      <AuthShell
        eyebrow="Welcome back"
        title="Sign in to Liv Collab"
        description="Use your account to open dashboards, join whiteboard rooms, and sync changes in real time."
        alternateHref="/signup"
        alternateLabel="Create an account"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            loginMutation.mutate(form);
          }}
        >
          <Input
            type="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
          <Input
            type="password"
            placeholder="Your secure password"
            value={form.password}
            onChange={(event) =>
              setForm((current) => ({ ...current, password: event.target.value }))
            }
          />

          {error ? <p className="text-sm text-white/75">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted">
          New here?{' '}
          <Link href="/signup" className="font-semibold text-white">
            Create your account
          </Link>
          .
        </div>
      </AuthShell>
    </RouteGuard>
  );
};

export default LoginPage;
