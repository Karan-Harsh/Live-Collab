import type { ApiErrorResponse, ApiSuccessResponse } from '../types/api.types';
import type { Response } from 'express';

export const sendSuccess = <T>(response: Response, statusCode: number, data: T): Response => {
  const payload: ApiSuccessResponse<T> = {
    success: true,
    data,
    error: null,
  };

  return response.status(statusCode).json(payload);
};

export const sendError = (response: Response, statusCode: number, error: string): Response => {
  const payload: ApiErrorResponse = {
    success: false,
    data: null,
    error,
  };

  return response.status(statusCode).json(payload);
};
