import { authService } from './auth.service';
import { sendSuccess } from '../../utils/response';

import type { LoginDto, RefreshDto, SignupDto } from './auth.types';
import type { Request, Response } from 'express';

export const signup = async (
  request: Request<Record<string, never>, Record<string, never>, SignupDto>,
  response: Response,
): Promise<void> => {
  const result = await authService.signup(request.body);

  sendSuccess(response, 201, result);
};

export const login = async (
  request: Request<Record<string, never>, Record<string, never>, LoginDto>,
  response: Response,
): Promise<void> => {
  const result = await authService.login(request.body);

  sendSuccess(response, 200, result);
};

export const refresh = async (
  request: Request<Record<string, never>, Record<string, never>, RefreshDto>,
  response: Response,
): Promise<void> => {
  const result = await authService.refresh(request.body);

  sendSuccess(response, 200, result);
};

export const me = async (request: Request, response: Response): Promise<void> => {
  const user = await authService.getCurrentUser(request.authUser!.userId);

  sendSuccess(response, 200, user);
};
