import React from 'react';
import { Check } from 'lucide-react';
import type { LiveSession } from './types';

type Props = {
  isAdmin: boolean;
  isBusy: boolean;
  mode: string;
  pendingSessions: LiveSession[];
  liveSessions: LiveSession[];
  onApprove: (session: LiveSession) => void;
};

export const LiveSessionLists: React.FC<Props> = ({ isAdmin, isBusy, mode, pendingSessions, liveSessions, onApprove }) => {
  return (
    <>
      {isAdmin && pendingSessions.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-red-600 uppercase">Yêu cầu live chờ duyệt</p>
            <span className="min-w-6 h-6 px-2 rounded-full bg-red-600 text-white text-xs font-bold grid place-items-center">
              {pendingSessions.length}
            </span>
          </div>
          <div className="space-y-2">
            {pendingSessions.map(session => (
              <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 truncate">{session.title}</p>
                  <p className="text-xs text-zinc-500 truncate">User yêu cầu: {session.hostName}</p>
                </div>
                <button
                  onClick={() => onApprove(session)}
                  disabled={isBusy}
                  className="w-full sm:w-auto px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
                >
                  <Check size={14} />
                  Duyệt và vào live
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {liveSessions.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase">Phiên đang live</p>
          {liveSessions.map(session => (
            <div key={session.id} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              <p className="text-sm font-semibold text-zinc-900 truncate">{session.title}</p>
              <p className="text-xs text-zinc-500 truncate">{session.hostName} đang trao đổi với {session.adminName || 'admin'}</p>
            </div>
          ))}
        </div>
      )}

      {pendingSessions.length === 0 && liveSessions.length === 0 && (
        <div className="mt-3 rounded-xl bg-zinc-50 border border-dashed border-zinc-200 px-3 py-3 text-xs text-zinc-500">
          {isAdmin ? 'Chưa có yêu cầu live nào. Khi user gửi yêu cầu, admin sẽ nhận toast và mục chờ duyệt ở đây.' : 'Bạn chưa có yêu cầu hoặc phiên live nào đang diễn ra.'}
        </div>
      )}
    </>
  );
};
