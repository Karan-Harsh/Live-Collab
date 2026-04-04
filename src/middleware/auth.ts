import createHttpError from 'http-errors';

import { verifyAccessToken } from '../modules/auth/auth.utils';

import type { NextFunction, Request, Response } from 'express';

const getBearerToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

export const authenticate = (request: Request, _response: Response, next: NextFunction): void => {
  const token = getBearerToken(request.headers.authorization);

  if (!token) {
    next(createHttpError(401, 'Authentication token is required.'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);

    request.authUser = {
      userId: payload.sub,
      email: payload.email,
    };

    next();
  } catch {
    next(createHttpError(401, 'Invalid or expired authentication token.'));
  }
};
