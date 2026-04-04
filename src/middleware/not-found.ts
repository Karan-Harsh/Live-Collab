import createHttpError from 'http-errors';

import type { NextFunction, Request, Response } from 'express';

export const notFoundHandler = (
  _request: Request,
  _response: Response,
  next: NextFunction,
): void => {
  next(createHttpError(404, 'Route not found.'));
};
