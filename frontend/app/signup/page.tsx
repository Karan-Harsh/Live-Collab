'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { RouteGuard } from '@/components/auth/route-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/error';
import { signup } from '@/services/auth-service';
import { useAuthStore } from '@/services/auth-store';

const SignupPage = () => {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);

  const signupMutation = useMutation({
    mutationFn: signup,
    onSuccess: (session) => {
      setSession(session);
      router.replace('/dashboard');
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError));
    },
  });

  return (
    <RouteGuard mode="guest">
      <AuthShell
        eyebrow="Create account"
        title="Launch your collaboration workspace"
        description="Set up access for secure whiteboard collaboration, shared workspaces, and instant sync."
        alternateHref="/login"
        alternateLabel="Already have an account?"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            signupMutation.mutate(form);
          }}
        >
          <Input
            placeholder="Jane Doe"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
          <Input
            type="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
          <Input
            type="password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={(event) =>
              setForm((current) => ({ ...current, password: event.target.value }))
            }
          />

          {error ? <p className="text-sm text-white/75">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={signupMutation.isPending}>
            {signupMutation.isPending ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted">
          Already invited?{' '}
          <Link href="/login" className="font-semibold text-white">
            Sign in instead
          </Link>
          .
        </div>
      </AuthShell>
    </RouteGuard>
  );
};

export default SignupPage;
