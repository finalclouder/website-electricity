import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { User } from '../../store/useAuthStore';
import { livestreamApi } from './livestreamApi';
import type { CameraFacingMode, LiveMessage, LiveMode, LiveSession, PeerRole } from './types';

const DEFAULT_ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms));

function nextFacingMode(current: CameraFacingMode): CameraFacingMode {
  return current === 'user' ? 'environment' : 'user';
}

export function useP2PLivestream(user: User | null) {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<LiveMode>('idle');
  const [activeSession, setActiveSession] = useState<LiveSession | null>(null);
  const [statusText, setStatusText] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const [cameraFacingMode, setCameraFacingMode] = useState<CameraFacingMode>('user');
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const timersRef = useRef<number[]>([]);
  const lastCandidateIdRef = useRef(0);
  const lastMessageIdRef = useRef(0);
  const remoteDescriptionSetRef = useRef(false);
  const pendingRemoteCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const lastSignalVersionRef = useRef(0);
  const handledReconnectAtRef = useRef<string | null>(null);
  const autoRejoinSessionIdRef = useRef<string | null>(null);
  const pendingToastIdsRef = useRef<Set<string>>(new Set());
  const enteringRoomRef = useRef(false);
  const iceConfigRef = useRef<RTCConfiguration>(DEFAULT_ICE_CONFIG);
  const disconnectTimerRef = useRef<number | null>(null);

  const isAdmin = user?.role === 'admin';

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(timer => window.clearInterval(timer));
    timersRef.current = [];
    if (disconnectTimerRef.current) {
      window.clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
  }, []);

  const autoEndSession = async (sessionId: string, reason: string) => {
    try {
      await livestreamApi.end(sessionId);
      toast.info(reason);
    } catch (error) {
      console.warn('Auto end live failed:', error);
    } finally {
      cleanupRoom();
      fetchLiveSessions();
    }
  };

  const startDisconnectTimer = (sessionId: string) => {
    if (disconnectTimerRef.current) return;
    disconnectTimerRef.current = window.setTimeout(() => {
      disconnectTimerRef.current = null;
      autoEndSession(sessionId, 'Phiên live đã tự kết thúc vì mất kết nối quá 30 giây');
    }, 30 * 1000);
  };

  const clearDisconnectTimer = () => {
    if (!disconnectTimerRef.current) return;
    window.clearTimeout(disconnectTimerRef.current);
    disconnectTimerRef.current = null;
  };

  const cleanupRoom = useCallback(() => {
    clearTimers();
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current?.getTracks().forEach(track => track.stop());
    remoteStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    lastCandidateIdRef.current = 0;
    lastMessageIdRef.current = 0;
    remoteDescriptionSetRef.current = false;
    pendingRemoteCandidatesRef.current = [];
    lastSignalVersionRef.current = 0;
    handledReconnectAtRef.current = null;
    autoRejoinSessionIdRef.current = null;
    enteringRoomRef.current = false;
    setMessages([]);
    setChatText('');
    setStatusText('');
    setMode('idle');
    setActiveSession(null);
    setConfirmEndOpen(false);
  }, [clearTimers]);

  const attachLocalStream = (stream: MediaStream) => {
    if (!localVideoRef.current) return;
    localVideoRef.current.srcObject = stream;
    localVideoRef.current.play().catch(error => console.warn('Local video autoplay failed:', error));
  };

  const attachRemoteTrack = (peer: RTCPeerConnection) => {
    const remoteStream = new MediaStream();
    remoteStreamRef.current = remoteStream;
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.muted = true;
      remoteVideoRef.current.volume = 0;
    }

    peer.ontrack = event => {
      const streamTracks = event.streams[0]?.getTracks() || [];
      const tracks = streamTracks.length > 0 ? streamTracks : [event.track];
      tracks.forEach(track => {
        if (!remoteStream.getTracks().some(existing => existing.id === track.id)) {
          remoteStream.addTrack(track);
        }
      });
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.muted = true;
        remoteVideoRef.current.volume = 0;
        remoteVideoRef.current.play().catch(error => console.warn('Remote video autoplay failed:', error));
      }
    };
  };

  const openLocalMedia = async (facingMode: CameraFacingMode = cameraFacingMode) => {
    const primaryConstraints: MediaStreamConstraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: { ideal: facingMode },
      },
      audio: true,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(primaryConstraints);
      localStreamRef.current = stream;
      attachLocalStream(stream);
      return stream;
    } catch (primaryError) {
      const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = fallbackStream;
      attachLocalStream(fallbackStream);
      return fallbackStream;
    }
  };

  const switchCamera = async () => {
    if (!localStreamRef.current || isSwitchingCamera) return;
    const nextMode = nextFacingMode(cameraFacingMode);
    setIsSwitchingCamera(true);

    try {
      const nextVideoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: { ideal: nextMode },
        },
        audio: false,
      });
      const nextVideoTrack = nextVideoStream.getVideoTracks()[0];
      if (!nextVideoTrack) throw new Error('Không tìm thấy camera phù hợp');

      const currentStream = localStreamRef.current;
      const oldVideoTracks = currentStream.getVideoTracks();
      oldVideoTracks.forEach(track => {
        currentStream.removeTrack(track);
        track.stop();
      });
      currentStream.addTrack(nextVideoTrack);

      const sender = peerRef.current?.getSenders().find(item => item.track?.kind === 'video');
      await sender?.replaceTrack(nextVideoTrack);

      attachLocalStream(currentStream);
      setCameraFacingMode(nextMode);
    } catch (error: any) {
      try {
        const fallbackVideoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const fallbackVideoTrack = fallbackVideoStream.getVideoTracks()[0];
        if (!fallbackVideoTrack) throw error;

        const currentStream = localStreamRef.current;
        currentStream.getVideoTracks().forEach(track => {
          currentStream.removeTrack(track);
          track.stop();
        });
        currentStream.addTrack(fallbackVideoTrack);

        const sender = peerRef.current?.getSenders().find(item => item.track?.kind === 'video');
        await sender?.replaceTrack(fallbackVideoTrack);

        attachLocalStream(currentStream);
        setCameraFacingMode(nextMode);
      } catch {
        toast.error(error.message || 'Không thể đổi camera');
      }
    } finally {
      setIsSwitchingCamera(false);
    }
  };

  const getIceConfig = async () => {
    try {
      const config = await livestreamApi.getIceServers();
      if (Array.isArray(config.iceServers) && config.iceServers.length > 0) {
        iceConfigRef.current = {
          iceServers: config.iceServers,
          iceTransportPolicy: 'all',
        };
      }
    } catch (error) {
      console.warn('Could not load livestream ICE servers:', error);
    }
    return iceConfigRef.current;
  };

  const waitForIceGatheringComplete = (peer: RTCPeerConnection, timeoutMs = 6000) => new Promise<void>(resolve => {
    if (peer.iceGatheringState === 'complete') {
      resolve();
      return;
    }

    const timeout = window.setTimeout(done, timeoutMs);
    function done() {
      window.clearTimeout(timeout);
      peer.removeEventListener('icegatheringstatechange', onChange);
      resolve();
    }
    function onChange() {
      if (peer.iceGatheringState === 'complete') done();
    }
    peer.addEventListener('icegatheringstatechange', onChange);
  });

  const createPeer = async (sessionId: string, role: PeerRole) => {
    const peer = new RTCPeerConnection(await getIceConfig());
    const connectedStatusText = role === 'host' ? 'Admin đã kết nối' : 'Đã kết nối';
    peer.onicecandidate = event => {
      if (!event.candidate) return;
      livestreamApi.postCandidate(sessionId, role, event.candidate.toJSON()).catch(error => console.warn('Send ICE candidate failed:', error));
    };
    peer.onicecandidateerror = event => {
      console.warn('ICE candidate error:', event.errorCode, event.errorText, event.url);
    };
    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;
      if (state === 'connected') {
        clearDisconnectTimer();
        setStatusText(connectedStatusText);
      }
      if (state === 'connecting') setStatusText('Đang kết nối WebRTC...');
      if (state === 'disconnected') {
        setStatusText('Mất kết nối tạm thời. Tự kết thúc sau 30 giây nếu không khôi phục.');
        startDisconnectTimer(sessionId);
      }
      if (state === 'failed') {
        setStatusText('Kết nối thất bại. Tự kết thúc sau 30 giây nếu không khôi phục.');
        startDisconnectTimer(sessionId);
      }
    };
    peer.oniceconnectionstatechange = () => {
      if (peer.iceConnectionState === 'checking') setStatusText('Đang kiểm tra đường truyền...');
      if (peer.iceConnectionState === 'connected' || peer.iceConnectionState === 'completed') {
        clearDisconnectTimer();
        setStatusText(connectedStatusText);
      }
      if (peer.iceConnectionState === 'disconnected' || peer.iceConnectionState === 'failed') {
        setStatusText('Mất media. Tự kết thúc sau 30 giây nếu không khôi phục.');
        startDisconnectTimer(sessionId);
      }
    };
    attachRemoteTrack(peer);
    peerRef.current = peer;
    return peer;
  };

  const flushPendingRemoteCandidates = async (peer: RTCPeerConnection) => {
    const pending = pendingRemoteCandidatesRef.current.splice(0);
    for (const candidate of pending) {
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const addRemoteCandidate = async (peer: RTCPeerConnection, candidate: RTCIceCandidateInit) => {
    if (!peer.remoteDescription) {
      pendingRemoteCandidatesRef.current.push(candidate);
      return;
    }
    await peer.addIceCandidate(new RTCIceCandidate(candidate));
  };

  const publishHostOffer = async (sessionId: string, peer: RTCPeerConnection, iceRestart = false) => {
    pendingRemoteCandidatesRef.current = [];
    remoteDescriptionSetRef.current = false;
    const offer = await peer.createOffer({ iceRestart });
    await peer.setLocalDescription(offer);
    await waitForIceGatheringComplete(peer);
    const response = await livestreamApi.postOffer(sessionId, peer.localDescription || offer);
    lastSignalVersionRef.current = response.signalVersion || 0;
    lastCandidateIdRef.current = 0;
  };

  const answerAdminOffer = async (sessionId: string, offer: RTCSessionDescriptionInit, signalVersion = 0, recreatePeer = false) => {
    const stream = localStreamRef.current || await openLocalMedia(cameraFacingMode);
    let peer = peerRef.current;
    if (recreatePeer || !peer || peer.signalingState === 'closed') {
      peer?.close();
      peer = await createPeer(sessionId, 'viewer');
      lastCandidateIdRef.current = 0;
      pendingRemoteCandidatesRef.current = [];
    }

    stream.getTracks().forEach(track => {
      if (!peer.getSenders().some(sender => sender.track?.id === track.id)) {
        peer.addTrack(track, stream);
      }
    });
    await peer.setRemoteDescription(new RTCSessionDescription(offer));
    await flushPendingRemoteCandidates(peer);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    await waitForIceGatheringComplete(peer);
    const response = await livestreamApi.postAnswer(sessionId, peer.localDescription || answer);
    lastSignalVersionRef.current = response.signalVersion || signalVersion || 0;
  };

  const pollCandidates = (sessionId: string, role: PeerRole) => {
    const timer = window.setInterval(async () => {
      const peer = peerRef.current;
      if (!peer) return;
      try {
        const result = await livestreamApi.getCandidates(sessionId, role, lastCandidateIdRef.current);
        for (const item of result.candidates || []) {
          lastCandidateIdRef.current = Math.max(lastCandidateIdRef.current, item.id);
          await addRemoteCandidate(peer, item.candidate);
        }
      } catch (error) {
        console.warn('Poll ICE candidates failed:', error);
      }
    }, 1200);
    timersRef.current.push(timer);
  };

  const pollMessages = (sessionId: string) => {
    const timer = window.setInterval(async () => {
      try {
        const result = await livestreamApi.getMessages(sessionId, lastMessageIdRef.current);
        const nextMessages = result.messages || [];
        if (nextMessages.length > 0) {
          lastMessageIdRef.current = Math.max(lastMessageIdRef.current, ...nextMessages.map(message => message.id));
          setMessages(current => [...current, ...nextMessages]);
        }
      } catch (error) {
        console.warn('Poll live messages failed:', error);
      }
    }, 1200);
    timersRef.current.push(timer);
  };

  const fetchLiveSessions = useCallback(async () => {
    try {
      const data = await livestreamApi.listSessions();
      const nextSessions = Array.isArray(data) ? data : [];
      setSessions(nextSessions);

      if (isAdmin) {
        nextSessions
          .filter(session => session.status === 'pending' && !pendingToastIdsRef.current.has(session.id))
          .forEach(session => {
            pendingToastIdsRef.current.add(session.id);
            toast.info(`${session.hostName} yêu cầu phát live: ${session.title}`);
          });
      }

      if (!isAdmin && mode === 'waiting' && activeSession) {
        const latest = nextSessions.find(session => session.id === activeSession.id);
        if (latest?.status === 'live' && !enteringRoomRef.current) {
          enteringRoomRef.current = true;
          await enterAsHost(latest);
          enteringRoomRef.current = false;
        }
        if (!latest && activeSession.status !== 'ended') {
          setStatusText('Yêu cầu live đã kết thúc');
        }
      }
      if (user && mode === 'idle' && !enteringRoomRef.current) {
        const liveSession = nextSessions.find(session => (
          session.status === 'live' && (session.hostId === user.id || session.adminId === user.id)
        ));
        if (liveSession && autoRejoinSessionIdRef.current !== liveSession.id) {
          autoRejoinSessionIdRef.current = liveSession.id;
          enteringRoomRef.current = true;
          if (liveSession.hostId === user.id) {
            await enterAsHost(liveSession);
          } else if (liveSession.adminId === user.id) {
            await enterAsAdmin(liveSession, true);
          }
          enteringRoomRef.current = false;
        }
      }
    } catch (error) {
      console.warn('Could not fetch live sessions:', error);
    }
  }, [activeSession, isAdmin, mode, user]);

  const restartHostNegotiation = async (sessionId: string) => {
    const stream = localStreamRef.current;
    if (!stream) return;
    let peer = peerRef.current;
    if (!peer || peer.signalingState === 'closed') {
      peer = await createPeer(sessionId, 'host');
      stream.getTracks().forEach(track => peer!.addTrack(track, stream));
    }
    if (peer.signalingState !== 'stable') return;
    setStatusText('Äang káº¿t ná»‘i láº¡i phiÃªn live...');
    await publishHostOffer(sessionId, peer, true);
  };

  const pollSessionEnd = (sessionId: string, role: LiveMode) => {
    const timer = window.setInterval(async () => {
      try {
        const latest = await livestreamApi.getSession(sessionId);
        setActiveSession(latest);
        if (latest.status === 'ended') {
          toast.info('Phiên live đã kết thúc');
          cleanupRoom();
          fetchLiveSessions();
        }
        if (role === 'host' && latest.status === 'live' && latest.reconnectRequestedAt && latest.reconnectRequestedAt !== handledReconnectAtRef.current) {
          handledReconnectAtRef.current = latest.reconnectRequestedAt;
          await restartHostNegotiation(sessionId);
        }
      } catch (error) {
        console.warn('Poll live status failed:', error);
      }
    }, 2500);
    timersRef.current.push(timer);
  };

  const startHeartbeat = (sessionId: string) => {
    const beat = async () => {
      try {
        const latest = await livestreamApi.heartbeat(sessionId);
        setActiveSession(latest);
        if (latest.status === 'ended') {
          toast.info('Phiên live đã tự kết thúc do mất kết nối quá 30 giây');
          cleanupRoom();
          fetchLiveSessions();
        }
      } catch (error) {
        console.warn('Live heartbeat failed:', error);
      }
    };

    beat();
    const timer = window.setInterval(beat, 10 * 1000);
    timersRef.current.push(timer);
  };

  const requestLive = async () => {
    if (!user || isAdmin) return;
    const liveTitle = title.trim();
    if (!liveTitle) {
      toast.error('Bạn phải đặt tên phiên live trước khi gửi yêu cầu');
      return;
    }

    setIsBusy(true);
    try {
      const session = await livestreamApi.requestLive(liveTitle);
      setActiveSession(session);
      setMode('waiting');
      setTitle('');
      setStatusText('Đang chờ admin duyệt yêu cầu phát live...');
      toast.success('Đã gửi yêu cầu phát live tới admin');
      fetchLiveSessions();
    } catch (error: any) {
      toast.error(error.message || 'Không thể gửi yêu cầu live');
    } finally {
      setIsBusy(false);
    }
  };

  const enterAsHost = async (session: LiveSession) => {
    setIsBusy(true);
    setActiveSession(session);
    setMode('host');
    setStatusText('Admin đã duyệt. Đang mở camera...');

    try {
      const stream = await openLocalMedia(cameraFacingMode);
      const peer = await createPeer(session.id, 'host');
      stream.getTracks().forEach(track => peer.addTrack(track, stream));

      await publishHostOffer(session.id, peer);

      setStatusText('Đang chờ admin kết nối...');
      pollCandidates(session.id, 'host');
      pollMessages(session.id);
      pollSessionEnd(session.id, 'host');
      startHeartbeat(session.id);

      const answerTimer = window.setInterval(async () => {
        if (!peerRef.current) return;
        try {
          const result = await livestreamApi.getAnswer(session.id);
          const signalVersion = result.signalVersion || 0;
          const canApplyAnswer = Boolean(result.answer)
            && peerRef.current.signalingState === 'have-local-offer'
            && !remoteDescriptionSetRef.current
            && signalVersion >= lastSignalVersionRef.current;

          if (canApplyAnswer) {
            await peerRef.current.setRemoteDescription(new RTCSessionDescription(result.answer));
            await flushPendingRemoteCandidates(peerRef.current);
            remoteDescriptionSetRef.current = true;
            setStatusText('Admin đã kết nối');
          }
        } catch (error) {
          console.warn('Poll answer failed:', error);
        }
      }, 1200);
      timersRef.current.push(answerTimer);
    } catch (error: any) {
      cleanupRoom();
      toast.error(error.message || 'Không thể bắt đầu live');
    } finally {
      setIsBusy(false);
    }
  };

  const enterAsAdmin = async (session: LiveSession, requestReconnect = false) => {
    setActiveSession(session);
    setMode('admin');
    setStatusText('Đang mở camera và chờ user vào phiên live...');

    try {
      await openLocalMedia(cameraFacingMode);
      if (requestReconnect) {
        await livestreamApi.requestReconnect(session.id);
      }

      let offer: RTCSessionDescriptionInit | null = null;
      let signalVersion = 0;
      const minSignalVersion = requestReconnect ? (session.signalVersion || 0) : -1;
      for (let i = 0; i < 20; i += 1) {
        const result = await livestreamApi.getOffer(session.id);
        offer = result.offer;
        signalVersion = result.signalVersion || 0;
        if (offer && signalVersion > minSignalVersion) break;
        await wait(1000);
      }
      if (!offer) throw new Error('User chưa sẵn sàng phát live. Vui lòng thử lại sau.');

      await answerAdminOffer(session.id, offer, signalVersion, true);

      pollCandidates(session.id, 'viewer');
      pollMessages(session.id);
      pollSessionEnd(session.id, 'admin');
      startHeartbeat(session.id);
      const offerTimer = window.setInterval(async () => {
        try {
          const result = await livestreamApi.getOffer(session.id);
          const nextVersion = result.signalVersion || 0;
          if (result.offer && nextVersion > lastSignalVersionRef.current) {
            setStatusText('Äang káº¿t ná»‘i láº¡i phiÃªn live...');
            await answerAdminOffer(session.id, result.offer, nextVersion, true);
          }
        } catch (error) {
          console.warn('Poll live offer failed:', error);
        }
      }, 1500);
      timersRef.current.push(offerTimer);
      setStatusText('Đã kết nối');
    } catch (error: any) {
      cleanupRoom();
      toast.error(error.message || 'Không thể vào phiên live');
    }
  };

  const approveAndJoin = async (session: LiveSession) => {
    if (!isAdmin) return;
    setIsBusy(true);
    try {
      const approved = await livestreamApi.approve(session.id);
      toast.success(`Đã duyệt live của ${approved.hostName}`);
      await enterAsAdmin(approved);
      fetchLiveSessions();
    } catch (error: any) {
      toast.error(error.message || 'Không thể duyệt live');
    } finally {
      setIsBusy(false);
    }
  };

  const sendMessage = async () => {
    if (!activeSession || !chatText.trim()) return;
    const text = chatText.trim();
    setChatText('');
    try {
      const result = await livestreamApi.sendMessage(activeSession.id, text);
      if (result.message) {
        lastMessageIdRef.current = Math.max(lastMessageIdRef.current, result.message.id);
        setMessages(current => [...current, result.message!]);
      }
    } catch (error: any) {
      setChatText(text);
      toast.error(error.message || 'Không gửi được tin nhắn');
    }
  };

  const endLive = async () => {
    if (!activeSession) return;
    setIsBusy(true);
    try {
      await livestreamApi.end(activeSession.id);
      toast.success('Đã kết thúc phiên live');
    } catch (error: any) {
      toast.error(error.message || 'Không thể kết thúc live');
    } finally {
      cleanupRoom();
      fetchLiveSessions();
      setIsBusy(false);
    }
  };

  useEffect(() => {
    fetchLiveSessions();
    const timer = window.setInterval(fetchLiveSessions, 3000);
    return () => window.clearInterval(timer);
  }, [fetchLiveSessions]);

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      attachLocalStream(localStreamRef.current);
    }
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
      remoteVideoRef.current.muted = true;
      remoteVideoRef.current.volume = 0;
      remoteVideoRef.current.play().catch(error => console.warn('Remote video autoplay failed:', error));
    }
  }, [mode, activeSession?.id]);

  useEffect(() => () => cleanupRoom(), [cleanupRoom]);

  return {
    activeSession,
    approveAndJoin,
    cameraFacingMode,
    chatText,
    confirmEndOpen,
    endLive,
    isAdmin,
    isBusy,
    isSwitchingCamera,
    localVideoRef,
    messages,
    mode,
    remoteVideoRef,
    requestLive,
    sendMessage,
    sessions,
    setChatText,
    setConfirmEndOpen,
    setTitle,
    statusText,
    switchCamera,
    title,
  };
}
