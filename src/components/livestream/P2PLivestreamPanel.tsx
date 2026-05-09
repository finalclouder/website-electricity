import React from 'react';
import { Radio, Square, Video } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { ConfirmEndModal } from './ConfirmEndModal';
import { LiveRoom } from './LiveRoom';
import { LiveSessionLists } from './LiveSessionLists';
import { useP2PLivestream } from './useP2PLivestream';

export const P2PLivestreamPanel: React.FC = () => {
  const { user } = useAuthStore();
  const live = useP2PLivestream(user);

  const uniqueSessions = live.sessions.reduce<LiveSession[]>((sessions, session) => {
    const key = session.title.trim().toLowerCase();
    if (!sessions.some(item => item.title.trim().toLowerCase() === key)) {
      sessions.push(session);
    }
    return sessions;
  }, []);

  const pendingSessions = uniqueSessions.filter(session => session.status === 'pending');
  const liveSessions = uniqueSessions.filter(session => session.status === 'live');
  const canRequest = !live.isAdmin && live.mode === 'idle' && !live.isBusy;
  const inRoom = live.mode !== 'idle' && live.mode !== 'waiting' && live.activeSession;

  return (
    <div className="relative left-1/2 -translate-x-1/2 w-full sm:w-[min(92vw,1180px)] bg-white rounded-2xl border border-zinc-200 shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Radio size={18} className="text-red-500 shrink-0" />
            <h2 className="text-sm font-bold text-zinc-900 truncate">Livestream trực tiếp</h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Phiên live 1-1 giữa user và admin, bắt đầu sau khi admin duyệt. Trên điện thoại có thể đổi camera trước/sau trong phòng live.
          </p>
        </div>
        {inRoom && (
          <button
            onClick={() => live.setConfirmEndOpen(true)}
            disabled={live.isBusy}
            className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-zinc-300 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0"
          >
            <Square size={13} />
            <span className="hidden sm:inline">Kết thúc</span>
          </button>
        )}
      </div>

      {live.mode === 'idle' && !live.isAdmin && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={live.title}
            onChange={event => live.setTitle(event.target.value)}
            className="flex-1 min-w-0 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="Tên phiên live bắt buộc"
            maxLength={120}
          />
          <button
            onClick={live.requestLive}
            disabled={!canRequest || !live.title.trim()}
            className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
          >
            <Video size={16} />
            Gửi yêu cầu live
          </button>
        </div>
      )}

      {live.mode === 'waiting' && live.activeSession && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-3 text-sm text-amber-800">
          Đã gửi yêu cầu “{live.activeSession.title}”. Admin sẽ thấy thông báo và mục chờ duyệt. Vui lòng chờ admin duyệt để bắt đầu phiên live.
        </div>
      )}

      {inRoom && (
        <LiveRoom
          activeSession={live.activeSession}
          cameraFacingMode={live.cameraFacingMode}
          chatText={live.chatText}
          isSwitchingCamera={live.isSwitchingCamera}
          localVideoRef={live.localVideoRef}
          messages={live.messages}
          mode={live.mode}
          remoteVideoRef={live.remoteVideoRef}
          statusText={live.statusText}
          userId={user?.id}
          onChatTextChange={live.setChatText}
          onSendMessage={live.sendMessage}
          onSwitchCamera={live.switchCamera}
        />
      )}

      <LiveSessionLists
        isAdmin={Boolean(live.isAdmin)}
        isBusy={live.isBusy}
        mode={live.mode}
        pendingSessions={pendingSessions}
        liveSessions={liveSessions}
        onApprove={live.approveAndJoin}
      />

      {live.confirmEndOpen && live.activeSession && (
        <ConfirmEndModal
          session={live.activeSession}
          isBusy={live.isBusy}
          onCancel={() => live.setConfirmEndOpen(false)}
          onConfirm={live.endLive}
        />
      )}
    </div>
  );
};
