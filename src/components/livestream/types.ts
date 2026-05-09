export interface LiveSession {
  id: string;
  title: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  adminId: string | null;
  adminName: string | null;
  status: 'pending' | 'live' | 'ended';
  hasViewer: boolean;
  viewerName: string | null;
  createdAt: string;
  approvedAt: string | null;
  endedAt: string | null;
  updatedAt: string;
  signalVersion?: number;
  reconnectRequestedAt?: string | null;
}

export interface LiveMessage {
  id: number;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface CandidateResponse {
  candidates: Array<{
    id: number;
    candidate: RTCIceCandidateInit;
    createdAt: string;
  }>;
}

export interface ChatResponse {
  messages: LiveMessage[];
}

export interface SendMessageResponse {
  ok: boolean;
  message?: LiveMessage;
}

export type LiveMode = 'idle' | 'waiting' | 'host' | 'admin';
export type PeerRole = 'host' | 'viewer';
export type CameraFacingMode = 'user' | 'environment';
