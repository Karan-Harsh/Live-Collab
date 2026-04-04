'use client';

import { apiRequest } from './api-client';

import type { AuthPayload, User } from '@/lib/types';

interface AuthInput {
  email: string;
  password: string;
}

interface SignupInput extends AuthInput {
  name: string;
}

export const login = async (input: AuthInput): Promise<AuthPayload> => {
  return apiRequest<AuthPayload>('/auth/login', {
    method: 'POST',
    requiresAuth: false,
    body: JSON.stringify(input),
  });
};

export const signup = async (input: SignupInput): Promise<AuthPayload> => {
  return apiRequest<AuthPayload>('/auth/signup', {
    method: 'POST',
    requiresAuth: false,
    body: JSON.stringify(input),
  });
};

export const getCurrentUser = async (): Promise<User> => {
  return apiRequest<User>('/auth/me');
};
