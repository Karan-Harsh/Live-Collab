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

export interface WhiteboardRecord {
  id: string;
  title: string;
  content: string;
  isShared: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RealtimeReceiveChangesPayload {
  whiteboardId: string;
  changes: unknown;
  title?: string;
  content?: string;
  updatedBy: string;
  timestamp: string;
  synchronized?: boolean;
}

export interface RealtimeJoinResponse {
  whiteboardId: string;
  title: string;
  content: string;
  isShared: boolean;
  ownerId: string;
}
