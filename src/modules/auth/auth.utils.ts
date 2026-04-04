import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createHash, randomUUID } from 'node:crypto';

import { env } from '../../config/env';

import type { AccessTokenPayload, AuthTokens, RefreshTokenPayload } from './auth.types';

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
};

export const verifyPassword = async (password: string, passwordHash: string): Promise<boolean> => {
  return bcrypt.compare(password, passwordHash);
};

export const hashRefreshToken = (refreshToken: string): string => {
  return createHash('sha256').update(refreshToken).digest('hex');
};

export const createAccessToken = (userId: string, email: string): string => {
  return jwt.sign(
    {
      email,
      type: 'access',
    },
    env.JWT_SECRET,
    {
      expiresIn: `${env.ACCESS_TOKEN_TTL_MINUTES}m`,
      subject: userId,
    },
  );
};

export const createRefreshToken = (userId: string, tokenId: string): string => {
  return jwt.sign(
    {
      tokenId,
      type: 'refresh',
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d`,
      subject: userId,
    },
  );
};

export const generateTokenPair = (
  userId: string,
  email: string,
): AuthTokens & { tokenId: string } => {
  const tokenId = randomUUID();

  return {
    tokenId,
    accessToken: createAccessToken(userId, email),
    refreshToken: createRefreshToken(userId, tokenId),
  };
};

const parseJwtPayload = <TPayload extends AccessTokenPayload | RefreshTokenPayload>(
  token: string,
  secret: string,
): TPayload => {
  const payload = jwt.verify(token, secret);

  if (typeof payload === 'string') {
    throw new Error('Invalid token payload.');
  }

  return payload as TPayload;
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const payload = parseJwtPayload<AccessTokenPayload>(token, env.JWT_SECRET);

  if (payload.type !== 'access' || !payload.sub || !payload.email) {
    throw new Error('Invalid access token.');
  }

  return payload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const payload = parseJwtPayload<RefreshTokenPayload>(token, env.JWT_REFRESH_SECRET);

  if (payload.type !== 'refresh' || !payload.sub || !payload.tokenId) {
    throw new Error('Invalid refresh token.');
  }

  return payload;
};

export const getRefreshTokenExpiryDate = (): Date => {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
};
