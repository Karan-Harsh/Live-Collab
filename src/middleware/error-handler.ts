import { isHttpError } from 'http-errors';

import { sendError } from '../utils/response';

import type { NextFunction, Request, Response } from 'express';

export const errorHandler = (
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void => {
  if (isHttpError(error)) {
    sendError(response, error.statusCode, error.message);

    return;
  }

  console.error('Unhandled application error:', error);

  sendError(response, 500, 'Internal server error.');
};
