import { userService } from './user.service';
import { sendSuccess } from '../../utils/response';

import type { GetUserParams } from './user.types';
import type { Request, Response } from 'express';

export const getUserById = async (
  request: Request<GetUserParams>,
  response: Response,
): Promise<void> => {
  const user = await userService.getUserById(request.params.userId);

  sendSuccess(response, 200, user);
};

export const listUsers = async (_request: Request, response: Response): Promise<void> => {
  const users = await userService.listUsers();

  sendSuccess(response, 200, users);
};
