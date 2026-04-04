import { documentService } from './document.service';
import { sendSuccess } from '../../utils/response';

import type {
  CreateDocumentDto,
  DeleteDocumentParams,
  GetDocumentParams,
  UpdateDocumentDto,
} from './document.types';
import type { Request, Response } from 'express';

export const createDocument = async (
  request: Request<Record<string, never>, Record<string, never>, CreateDocumentDto>,
  response: Response,
): Promise<void> => {
  const document = await documentService.createDocument(request.authUser!.userId, request.body);

  sendSuccess(response, 201, document);
};

export const getDocumentById = async (
  request: Request<GetDocumentParams>,
  response: Response,
): Promise<void> => {
  const document = await documentService.getDocumentById(
    request.params.id,
    request.authUser!.userId,
  );

  sendSuccess(response, 200, document);
};

export const listDocuments = async (request: Request, response: Response): Promise<void> => {
  const documents = await documentService.listDocuments(request.authUser!.userId);

  sendSuccess(response, 200, documents);
};

export const updateDocument = async (
  request: Request<GetDocumentParams, Record<string, never>, UpdateDocumentDto>,
  response: Response,
): Promise<void> => {
  const document = await documentService.updateDocument(
    request.params.id,
    request.authUser!.userId,
    request.body,
  );

  sendSuccess(response, 200, document);
};

export const deleteDocument = async (
  request: Request<DeleteDocumentParams>,
  response: Response,
): Promise<void> => {
  await documentService.deleteDocument(request.params.id, request.authUser!.userId);

  sendSuccess(response, 200, {
    deleted: true,
    id: request.params.id,
  });
};
