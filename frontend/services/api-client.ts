'use client';

import { API_URL } from '@/lib/config';
import { ApiError } from '@/lib/error';
import { useAuthStore } from './auth-store';

import type { ApiResponse, AuthPayload } from '@/lib/types';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

let refreshInFlight: Promise<string | null> | null = null;

const buildHeaders = (initHeaders: HeadersInit | undefined, token?: string): Headers => {
  const headers = new Headers(initHeaders);
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
};

const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const { refreshToken, clearSession, setSession } = useAuthStore.getState();

    if (!refreshToken) {
      clearSession();
      return null;
    }

    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: buildHeaders(undefined),
      body: JSON.stringify({
        refreshToken,
      }),
    });

    const payload = (await response.json()) as ApiResponse<AuthPayload>;

    if (!response.ok || !payload.success || !payload.data) {
      clearSession();
      return null;
    }

    setSession(payload.data);
    return payload.data.accessToken;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
};

export const apiRequest = async <T>(
  path: string,
  options: RequestOptions = {},
  hasRetried = false,
): Promise<T> => {
  const { accessToken, clearSession } = useAuthStore.getState();
  const { requiresAuth = true, ...init } = options;

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: buildHeaders(init.headers, requiresAuth ? (accessToken ?? undefined) : undefined),
  });

  const payload = (await response.json()) as ApiResponse<T>;

  if (response.status === 401 && requiresAuth && !hasRetried) {
    const refreshedAccessToken = await refreshAccessToken();

    if (refreshedAccessToken) {
      return apiRequest<T>(path, options, true);
    }

    clearSession();
  }

  if (!response.ok || !payload.success || payload.data === null) {
    throw new ApiError(payload.error ?? 'Request failed.', response.status);
  }

  return payload.data;
};
