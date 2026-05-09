import { api } from '../../utils/api';
import type { CandidateResponse, ChatResponse, LiveSession, SendMessageResponse } from './types';

export const livestreamApi = {
  listSessions: () => api.get<LiveSession[]>('/livestreams/live'),
  getIceServers: () => api.get<{ iceServers: RTCIceServer[]; targetQuality?: { width: number; height: number; label: string } }>('/livestreams/ice-servers'),
  requestLive: (title: string) => api.post<LiveSession>('/livestreams', { title }),
  approve: (sessionId: string) => api.post<LiveSession>(`/livestreams/${sessionId}/approve`),
  getSession: (sessionId: string) => api.get<LiveSession>(`/livestreams/${sessionId}`),
  heartbeat: (sessionId: string) => api.post<LiveSession>(`/livestreams/${sessionId}/heartbeat`),
  requestReconnect: (sessionId: string) => api.post<LiveSession>(`/livestreams/${sessionId}/reconnect`),
  postOffer: (sessionId: string, offer: RTCSessionDescriptionInit) => api.post<{ ok: boolean; signalVersion: number }>(`/livestreams/${sessionId}/offer`, { offer }),
  getOffer: (sessionId: string) => api.get<{ offer: RTCSessionDescriptionInit | null; signalVersion?: number; reconnectRequestedAt?: string | null }>(`/livestreams/${sessionId}/offer`),
  postAnswer: (sessionId: string, answer: RTCSessionDescriptionInit) => api.post<{ ok: boolean; signalVersion: number }>(`/livestreams/${sessionId}/answer`, { answer }),
  getAnswer: (sessionId: string) => api.get<{ answer: RTCSessionDescriptionInit | null; signalVersion?: number }>(`/livestreams/${sessionId}/answer`),
  postCandidate: (sessionId: string, role: 'host' | 'viewer', candidate: RTCIceCandidateInit) =>
    api.post(`/livestreams/${sessionId}/candidates`, { role, candidate }),
  getCandidates: (sessionId: string, role: 'host' | 'viewer', after: number) =>
    api.get<CandidateResponse>(`/livestreams/${sessionId}/candidates?role=${role}&after=${after}`),
  getMessages: (sessionId: string, after: number) => api.get<ChatResponse>(`/livestreams/${sessionId}/messages?after=${after}`),
  sendMessage: (sessionId: string, text: string) => api.post<SendMessageResponse>(`/livestreams/${sessionId}/messages`, { text }),
  end: (sessionId: string) => api.post<LiveSession>(`/livestreams/${sessionId}/end`),
};
