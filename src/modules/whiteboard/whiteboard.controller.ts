import { whiteboardService } from './whiteboard.service';
import { sendSuccess } from '../../utils/response';

import type {
  CreateWhiteboardDto,
  DeleteWhiteboardParams,
  GetWhiteboardParams,
  UpdateWhiteboardDto,
} from './whiteboard.types';
import type { Request, Response } from 'express';

export const createWhiteboard = async (
  request: Request<Record<string, never>, Record<string, never>, CreateWhiteboardDto>,
  response: Response,
): Promise<void> => {
  const whiteboard = await whiteboardService.createWhiteboard(request.authUser!.userId, request.body);

  sendSuccess(response, 201, whiteboard);
};

export const getWhiteboardById = async (
  request: Request<GetWhiteboardParams>,
  response: Response,
): Promise<void> => {
  const whiteboard = await whiteboardService.getWhiteboardById(
    request.params.id,
    request.authUser!.userId,
  );

  sendSuccess(response, 200, whiteboard);
};

export const listWhiteboards = async (request: Request, response: Response): Promise<void> => {
  const whiteboards = await whiteboardService.listWhiteboards(request.authUser!.userId);

  sendSuccess(response, 200, whiteboards);
};

export const updateWhiteboard = async (
  request: Request<GetWhiteboardParams, Record<string, never>, UpdateWhiteboardDto>,
  response: Response,
): Promise<void> => {
  const whiteboard = await whiteboardService.updateWhiteboard(
    request.params.id,
    request.authUser!.userId,
    request.body,
  );

  sendSuccess(response, 200, whiteboard);
};

export const deleteWhiteboard = async (
  request: Request<DeleteWhiteboardParams>,
  response: Response,
): Promise<void> => {
  await whiteboardService.deleteWhiteboard(request.params.id, request.authUser!.userId);

  sendSuccess(response, 200, {
    deleted: true,
    id: request.params.id,
  });
};
