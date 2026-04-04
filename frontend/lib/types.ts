export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthPayload {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface DocumentRecord {
  id: string;
  title: string;
  content: string;
  isShared: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RealtimeReceiveChangesPayload {
  documentId: string;
  changes: unknown;
  title?: string;
  content?: string;
  updatedBy: string;
  timestamp: string;
  synchronized?: boolean;
}

export interface RealtimeJoinResponse {
  documentId: string;
  title: string;
  content: string;
  isShared: boolean;
  ownerId: string;
}
