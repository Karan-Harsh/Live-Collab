import { z } from 'zod';

import type { PublicUser } from '../user/user.select';
import type { JwtPayload } from 'jsonwebtoken';

export const signupSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email(),
    name: z.string().trim().min(1).max(120),
    password: z.string().min(8).max(72),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8).max(72),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const meSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export type SignupDto = z.infer<typeof signupSchema>['body'];
export type LoginDto = z.infer<typeof loginSchema>['body'];
export type RefreshDto = z.infer<typeof refreshSchema>['body'];

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  email: string;
  type: 'access';
}

export interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  tokenId: string;
  type: 'refresh';
}

export interface AuthenticatedRequestUser {
  userId: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponseData extends AuthTokens {
  user: PublicUser;
}
