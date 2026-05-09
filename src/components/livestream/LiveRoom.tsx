import React, { useEffect, useState } from 'react';
import { Camera, Maximize2, MessageCircle, Minimize2, RefreshCw, Send, Volume2 } from 'lucide-react';
import type { CameraFacingMode, LiveMessage, LiveMode, LiveSession } from './types';

type Props = {
  activeSession: LiveSession;
  cameraFacingMode: CameraFacingMode;
  chatText: string;
  isSwitchingCamera: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  messages: LiveMessage[];
  mode: LiveMode;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  statusText: string;
  userId?: string;
  onChatTextChange: (value: string) => void;
  onSendMessage: () => void;
  onSwitchCamera: () => void;
};

export const LiveRoom: React.FC<Props> = ({
  activeSession,
  cameraFacingMode,
  chatText,
  isSwitchingCamera,
  localVideoRef,
  messages,
  mode,
  remoteVideoRef,
  statusText,
  userId,
  onChatTextChange,
  onSendMessage,
  onSwitchCamera,
}) => {
  const [fullscreenElement, setFullscreenElement] = useState<Element | null>(null);
  const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(false);

  useEffect(() => {
    const onFullscreenChange = () => setFullscreenElement(document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = async (element: HTMLElement | null) => {
    if (!element) return;
    if (document.fullscreenElement === element) {
      await document.exitFullscreen();
      return;
    }
    await element.requestFullscreen();
  };

  const enableRemoteAudio = async () => {
    const video = remoteVideoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = 1;
    await video.play();
    setRemoteAudioEnabled(true);
  };

  const FullscreenButton = ({ target, title }: { target: React.RefObject<HTMLDivElement | null>; title: string }) => {
    const isFullscreen = fullscreenElement === target.current;
    return (
      <button
        onClick={() => toggleFullscreen(target.current)}
        className="hidden sm:flex absolute right-2 top-2 h-9 px-3 rounded-full bg-black/70 hover:bg-black/85 text-white text-xs font-bold items-center gap-1.5 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        title={isFullscreen ? 'Thu nhỏ' : title}
      >
        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        {isFullscreen ? 'Thu nhỏ' : 'Phóng to'}
      </button>
    );
  };

  const remoteFrameRef = React.useRef<HTMLDivElement>(null);
  const localFrameRef = React.useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div ref={remoteFrameRef} className="group relative rounded-xl overflow-hidden bg-zinc-950 aspect-video border border-zinc-200 min-h-[220px]">
            <video ref={remoteVideoRef} autoPlay playsInline muted={!remoteAudioEnabled} className="w-full h-full object-contain bg-black" />
            {!remoteAudioEnabled && (
              <button
                onClick={enableRemoteAudio}
                className="absolute left-2 bottom-2 h-10 px-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5"
                title="Bật âm thanh người còn lại"
              >
                <Volume2 size={15} />
                Bật âm thanh
              </button>
            )}
            <FullscreenButton target={remoteFrameRef} title="Phóng to khung remote" />
          </div>
          <div ref={localFrameRef} className="group relative rounded-xl overflow-hidden bg-zinc-950 aspect-video border border-zinc-200 min-h-[220px]">
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            <FullscreenButton target={localFrameRef} title="Phóng to camera của bạn" />
            <button
              onClick={onSwitchCamera}
              disabled={isSwitchingCamera}
              className="absolute right-2 bottom-2 h-10 px-3 rounded-full bg-black/70 hover:bg-black/85 disabled:bg-black/35 text-white text-xs font-bold flex items-center gap-1.5"
              title="Đổi camera trước/sau"
            >
              {isSwitchingCamera ? <RefreshCw size={15} className="animate-spin" /> : <Camera size={15} />}
              <span className="hidden sm:inline">{cameraFacingMode === 'user' ? 'Cam trước' : 'Cam sau'}</span>
            </button>
          </div>
        </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="min-w-0">
          <p className="font-semibold text-zinc-900 truncate">{activeSession.title}</p>
          <p className="text-zinc-500 truncate">
            {mode === 'host' ? `Đang trao đổi với ${activeSession.adminName || 'admin'}` : `Đang trao đổi với ${activeSession.hostName}`}
          </p>
        </div>
        <span className="w-fit max-w-full px-2 py-1 rounded-full bg-zinc-100 text-zinc-600">{statusText || 'Đang xử lý...'}</span>
      </div>
    </div>

    <div className="border border-zinc-200 rounded-xl overflow-hidden flex flex-col min-h-[260px] lg:min-h-[300px] max-h-[70vh]">
      <div className="px-3 py-2 border-b border-zinc-200 bg-zinc-50 flex items-center gap-2 text-sm font-bold text-zinc-900">
        <MessageCircle size={15} />
        Chat
      </div>
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-xs text-zinc-400 text-center py-8">Chưa có tin nhắn</p>
        ) : messages.map(message => (
          <div key={`${message.id}-${message.createdAt}`} className={message.authorId === userId ? 'text-right' : 'text-left'}>
            <div className={`inline-block max-w-[90%] rounded-xl px-3 py-2 text-sm ${message.authorId === userId ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-800'}`}>
              <p className="text-[11px] opacity-75 mb-0.5">{message.authorName}</p>
              <p className="break-words">{message.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="p-2 border-t border-zinc-200 flex gap-2">
        <input
          value={chatText}
          onChange={event => onChatTextChange(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') onSendMessage();
          }}
          className="flex-1 min-w-0 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Nhập tin nhắn..."
          maxLength={500}
        />
        <button
          onClick={onSendMessage}
          disabled={!chatText.trim()}
          className="w-10 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 text-white grid place-items-center"
          title="Gửi"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
    </div>
  );
};
