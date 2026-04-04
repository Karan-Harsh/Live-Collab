'use client';

import { apiRequest } from './api-client';

import type { DocumentRecord } from '@/lib/types';

interface CreateDocumentInput {
  title: string;
  content: string;
  isShared: boolean;
}

interface UpdateDocumentInput {
  title?: string;
  content?: string;
  isShared?: boolean;
}

export const listDocuments = async (): Promise<DocumentRecord[]> => {
  return apiRequest<DocumentRecord[]>('/documents');
};

export const createDocument = async (input: CreateDocumentInput): Promise<DocumentRecord> => {
  return apiRequest<DocumentRecord>('/documents', {
    method: 'POST',
    body: JSON.stringify(input),
  });
};

export const getDocument = async (documentId: string): Promise<DocumentRecord> => {
  return apiRequest<DocumentRecord>(`/documents/${documentId}`);
};

export const updateDocument = async (
  documentId: string,
  input: UpdateDocumentInput,
): Promise<DocumentRecord> => {
  return apiRequest<DocumentRecord>(`/documents/${documentId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
};

export const deleteDocument = async (
  documentId: string,
): Promise<{ deleted: true; id: string }> => {
  return apiRequest<{ deleted: true; id: string }>(`/documents/${documentId}`, {
    method: 'DELETE',
  });
};
