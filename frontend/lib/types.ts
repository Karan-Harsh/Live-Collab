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

export interface WhiteboardPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canInvite: boolean;
  canManageAccess: boolean;
}

export interface WhiteboardCollaborator {
  id: string;
  userId: string;
  role: 'EDITOR';
  createdAt: string;
  updatedAt: string;
  user: User;
}

export interface WhiteboardSummary {
  id: string;
  title: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WhiteboardInvitationRecord {
  id: string;
  whiteboardId: string;
  inviterId: string;
  recipientId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELED';
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  inviter: User;
  recipient: User;
  whiteboard?: WhiteboardSummary;
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
  version: number;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  owner: User;
  accessRole: 'owner' | 'collaborator';
  permissions: WhiteboardPermissions;
  collaborators: WhiteboardCollaborator[];
  pendingInvites: WhiteboardInvitationRecord[];
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
  ownerId: string;
  accessRole: 'owner' | 'collaborator';
  permissions: WhiteboardPermissions;
}
