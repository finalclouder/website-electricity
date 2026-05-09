import React, { useEffect, useRef, useState } from 'react';
import { Download, Radio, Square, Video, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../utils/api';
import { useAuthStore } from '../../store/useAuthStore';

interface LiveSession {
  id: string;
  title: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  status: 'live' | 'ended';
  hasViewer: boolean;
  viewerName: string | null;
  createdAt: string;
  endedAt: string | null;
  updatedAt: string;
}

interface CandidateResponse {
  candidates: Array<{
    id: number;
    candidate: RTCIceCandidateInit;
    createdAt: string;
  }>;
}

type LiveMode = 'idle' | 'host' | 'viewer';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

function sanitizeFilePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'livestream';
}

function formatDateForFilename(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown-time';
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function buildDownloadName(session: LiveSession): string {
  return `${sanitizeFilePart(session.hostName)}_${sanitizeFilePart(session.title)}_${formatDateForFilename(session.createdAt)}.webm`;
}

export const P2PLivestreamPanel: React.FC = () => {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<LiveMode>('idle');
  const [activeSession, setActiveSession] = useState<LiveSession | null>(null);
  const [statusText, setStatusText] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timersRef = useRef<number[]>([]);
  const lastCandidateIdRef = useRef(0);
  const remoteDescriptionSetRef = useRef(false);
  const finishingRef = useRef(false);

  const fetchLiveSessions = async () => {
    try {
      const data = await api.get<LiveSession[]>('/livestreams/live');
      setSessions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn('Could not fetch live sessions:', error);
    }
  };

  useEffect(() => {
    fetchLiveSessions();
    const timer = window.setInterval(fetchLiveSessions, 4000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
  }, [mode, activeSession]);

  useEffect(() => () => cleanupPeer(false), []);

  const clearTimers = () => {
    timersRef.current.forEach(timer => window.clearInterval(timer));
    timersRef.current = [];
  };

  const startRecorder = (stream: MediaStream) => {
    chunksRef.current = [];
    setRecordedBlob(null);

    if (typeof MediaRecorder === 'undefined') {
      toast.warning('Trình duyệt này chưa hỗ trợ lưu video live cục bộ');
      return;
    }

    try {
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        if (chunksRef.current.length > 0) {
          setRecordedBlob(new Blob(chunksRef.current, { type: 'video/webm' }));
          setShowSavePrompt(true);
        }
      };
      recorder.start(1000);
      recorderRef.current = recorder;
    } catch (error) {
      console.warn('MediaRecorder start failed:', error);
      toast.warning('Không thể bật ghi cục bộ video trên trình duyệt này');
    }
  };

  const stopRecorder = () => {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  };

  const cleanupPeer = (showPrompt: boolean) => {
    clearTimers();
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current?.getTracks().forEach(track => track.stop());
    remoteStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    remoteDescriptionSetRef.current = false;
    lastCandidateIdRef.current = 0;
    stopRecorder();
    if (showPrompt) {
      setShowSavePrompt(true);
    }
    setStatusText('');
    setMode('idle');
    if (!showPrompt) {
      chunksRef.current = [];
      setRecordedBlob(null);
      setShowSavePrompt(false);
      setActiveSession(null);
    }
  };

  const createPeer = (sessionId: string, role: 'host' | 'viewer') => {
    const peer = new RTCPeerConnection(ICE_SERVERS);
    peer.onicecandidate = event => {
      if (!event.candidate) return;
      api.post(`/livestreams/${sessionId}/candidates`, {
        role,
        candidate: event.candidate.toJSON(),
      }).catch(error => console.warn('Send ICE candidate failed:', error));
    };
    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;
      if (state === 'connected') setStatusText('Đã kết nối');
      if (state === 'disconnected') setStatusText('Mất kết nối tạm thời');
      if (state === 'failed') setStatusText('Kết nối thất bại. Có thể mạng cần TURN server.');
    };
    peerRef.current = peer;
    return peer;
  };

  const pollCandidates = (sessionId: string, role: 'host' | 'viewer') => {
    const timer = window.setInterval(async () => {
      const peer = peerRef.current;
      if (!peer) return;
      try {
        const result = await api.get<CandidateResponse>(`/livestreams/${sessionId}/candidates?role=${role}&after=${lastCandidateIdRef.current}`);
        for (const item of result.candidates || []) {
          lastCandidateIdRef.current = Math.max(lastCandidateIdRef.current, item.id);
          await peer.addIceCandidate(new RTCIceCandidate(item.candidate));
        }
      } catch (error) {
        console.warn('Poll ICE candidates failed:', error);
      }
    }, 1200);
    timersRef.current.push(timer);
  };

  const startLive = async () => {
    if (!user) return;
    const liveTitle = title.trim();
    if (!liveTitle) {
      toast.error('Bạn phải đặt tên phiên live trước khi bắt đầu');
      return;
    }

    setIsBusy(true);
    try {
      const session = await api.post<LiveSession>('/livestreams', { title: liveTitle });
      setActiveSession(session);
      setMode('host');
      setStatusText('Đang mở camera...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      startRecorder(stream);

      const peer = createPeer(session.id, 'host');
      stream.getTracks().forEach(track => peer.addTrack(track, stream));
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await api.post(`/livestreams/${session.id}/offer`, { offer });

      setStatusText('Đang chờ người xem kết nối...');
      pollCandidates(session.id, 'host');

      const answerTimer = window.setInterval(async () => {
        if (remoteDescriptionSetRef.current || !peerRef.current) return;
        try {
          const result = await api.get<{ answer: RTCSessionDescriptionInit | null }>(`/livestreams/${session.id}/answer`);
          if (result.answer) {
            await peerRef.current.setRemoteDescription(new RTCSessionDescription(result.answer));
            remoteDescriptionSetRef.current = true;
            setStatusText('Người xem đã kết nối');
          }
        } catch (error) {
          console.warn('Poll answer failed:', error);
        }
      }, 1200);
      timersRef.current.push(answerTimer);
      setTitle('');
      fetchLiveSessions();
    } catch (error: any) {
      cleanupPeer(false);
      toast.error(error.message || 'Không thể bắt đầu live');
    } finally {
      setIsBusy(false);
    }
  };

  const joinLive = async (session: LiveSession) => {
    if (!user) return;
    setIsBusy(true);
    setActiveSession(session);
    setMode('viewer');
    setStatusText('Đang kết nối phiên live...');

    try {
      let offer: RTCSessionDescriptionInit | null = null;
      for (let i = 0; i < 12; i += 1) {
        const result = await api.get<{ offer: RTCSessionDescriptionInit | null }>(`/livestreams/${session.id}/offer`);
        offer = result.offer;
        if (offer) break;
        await new Promise(resolve => window.setTimeout(resolve, 1000));
      }
      if (!offer) throw new Error('Người phát chưa sẵn sàng. Vui lòng thử lại sau.');

      const peer = createPeer(session.id, 'viewer');
      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;

      peer.ontrack = event => {
        event.streams[0]?.getTracks().forEach(track => {
          if (!remoteStream.getTracks().some(existing => existing.id === track.id)) {
            remoteStream.addTrack(track);
          }
        });
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
        if (!recorderRef.current && remoteStream.getVideoTracks().length > 0) {
          startRecorder(remoteStream);
        }
      };

      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await api.post(`/livestreams/${session.id}/answer`, { answer });
      pollCandidates(session.id, 'viewer');

      const statusTimer = window.setInterval(async () => {
        if (finishingRef.current) return;
        try {
          const latest = await api.get<LiveSession>(`/livestreams/${session.id}`);
          if (latest.status === 'ended') {
            finishingRef.current = true;
            setStatusText('Phiên live đã kết thúc');
            cleanupPeer(true);
            finishingRef.current = false;
          }
        } catch (error) {
          console.warn('Poll live status failed:', error);
        }
      }, 2500);
      timersRef.current.push(statusTimer);
      setStatusText('Đang xem live');
    } catch (error: any) {
      cleanupPeer(false);
      toast.error(error.message || 'Không thể xem live');
    } finally {
      setIsBusy(false);
    }
  };

  const endLive = async () => {
    if (!activeSession) return;
    setIsBusy(true);
    try {
      if (mode === 'host') {
        await api.post(`/livestreams/${activeSession.id}/end`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Không thể kết thúc live');
    } finally {
      cleanupPeer(true);
      fetchLiveSessions();
      setIsBusy(false);
    }
  };

  const saveRecording = () => {
    if (!recordedBlob || !activeSession) return;
    const url = URL.createObjectURL(recordedBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = buildDownloadName(activeSession);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    chunksRef.current = [];
    setRecordedBlob(null);
    setShowSavePrompt(false);
    setActiveSession(null);
  };

  const discardRecording = () => {
    chunksRef.current = [];
    setRecordedBlob(null);
    setShowSavePrompt(false);
    setActiveSession(null);
  };

  const ownLive = activeSession && activeSession.hostId === user?.id;
  const canStart = mode === 'idle' && !isBusy;

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Radio size={18} className="text-red-500" />
            <h2 className="text-sm font-bold text-zinc-900">Livestream trực tiếp</h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1">MVP 1 người phát - 1 người xem, không lưu replay trên website.</p>
        </div>
        {mode !== 'idle' && (
          <button
            onClick={endLive}
            disabled={isBusy}
            className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-zinc-300 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
          >
            <Square size={13} />
            {ownLive ? 'Kết thúc' : 'Rời live'}
          </button>
        )}
      </div>

      {mode === 'idle' && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={title}
            onChange={event => setTitle(event.target.value)}
            className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="Tên phiên live bắt buộc"
            maxLength={120}
          />
          <button
            onClick={startLive}
            disabled={!canStart || !title.trim()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
          >
            <Video size={16} />
            Bắt đầu live
          </button>
        </div>
      )}

      {mode !== 'idle' && (
        <div className="space-y-3">
          <div className="rounded-xl overflow-hidden bg-zinc-950 aspect-video border border-zinc-200">
            {mode === 'host' ? (
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            ) : (
              <video ref={remoteVideoRef} autoPlay playsInline controls className="w-full h-full object-contain bg-black" />
            )}
          </div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="min-w-0">
              <p className="font-semibold text-zinc-900 truncate">{activeSession?.title}</p>
              <p className="text-zinc-500 truncate">{mode === 'host' ? 'Bạn đang phát live' : `Đang xem live của ${activeSession?.hostName}`}</p>
            </div>
            <span className="px-2 py-1 rounded-full bg-zinc-100 text-zinc-600 whitespace-nowrap">{statusText || 'Đang xử lý...'}</span>
          </div>
        </div>
      )}

      {mode === 'idle' && sessions.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase">Đang live</p>
          {sessions.map(session => (
            <div key={session.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900 truncate">{session.title}</p>
                <p className="text-xs text-zinc-500 truncate">{session.hostName}{session.hasViewer ? ` · Đang có ${session.viewerName || 'người xem'}` : ''}</p>
              </div>
              <button
                onClick={() => joinLive(session)}
                disabled={isBusy || session.hostId === user?.id || session.hasViewer}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-all"
              >
                {session.hostId === user?.id ? 'Của bạn' : session.hasViewer ? 'Đã có người xem' : 'Xem live'}
              </button>
            </div>
          ))}
        </div>
      )}

      {mode === 'idle' && sessions.length === 0 && (
        <div className="mt-3 rounded-xl bg-zinc-50 border border-dashed border-zinc-200 px-3 py-3 text-xs text-zinc-500">
          Chưa có phiên live nào đang diễn ra.
        </div>
      )}

      {showSavePrompt && activeSession && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-zinc-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-zinc-900">Lưu video live?</h3>
                <p className="text-sm text-zinc-500 mt-1">
                  Video chỉ nằm trên trình duyệt hiện tại. Nếu không lưu, dữ liệu ghi tạm sẽ bị xóa.
                  {!recordedBlob && ' Trình duyệt chưa có đủ dữ liệu để tải file.'}
                </p>
              </div>
              <button onClick={discardRecording} className="p-1.5 hover:bg-zinc-100 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={discardRecording} className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-semibold">
                Không lưu
              </button>
              <button
                onClick={saveRecording}
                disabled={!recordedBlob}
                className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white text-sm font-bold flex items-center gap-1.5"
              >
                <Download size={15} />
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
