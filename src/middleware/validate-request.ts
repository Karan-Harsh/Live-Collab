import createHttpError from 'http-errors';

import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';

type ValidatedRequestShape = {
  body: unknown;
  params: unknown;
  query: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const replaceObjectContents = (target: Record<string, unknown>, source: Record<string, unknown>): void => {
  for (const key of Object.keys(target)) {
    delete target[key];
  }

  Object.assign(target, source);
};

export const validateRequest = <TSchema extends ZodType<ValidatedRequestShape>>(
  schema: TSchema,
): RequestHandler => {
  return async (request: Request, _response: Response, next: NextFunction): Promise<void> => {
    const parsedRequest = await schema.safeParseAsync({
      body: request.body,
      params: request.params,
      query: request.query,
    });

    if (!parsedRequest.success) {
      next(
        createHttpError(400, 'Request validation failed.', {
          cause: parsedRequest.error.flatten(),
        }),
      );
      return;
    }

    if (isRecord(request.body) && isRecord(parsedRequest.data.body)) {
      replaceObjectContents(request.body, parsedRequest.data.body);
    } else {
      request.body = parsedRequest.data.body as Request['body'];
    }

    if (isRecord(request.params) && isRecord(parsedRequest.data.params)) {
      replaceObjectContents(request.params, parsedRequest.data.params);
    }

    if (isRecord(request.query) && isRecord(parsedRequest.data.query)) {
      replaceObjectContents(request.query as Record<string, unknown>, parsedRequest.data.query);
    }

    next();
  };
};
