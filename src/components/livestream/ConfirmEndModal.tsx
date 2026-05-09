import React from 'react';
import { X } from 'lucide-react';
import type { LiveSession } from './types';

type Props = {
  session: LiveSession;
  isBusy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export const ConfirmEndModal: React.FC<Props> = ({ session, isBusy, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-zinc-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-zinc-900">Xác nhận kết thúc live?</h3>
          <p className="text-sm text-zinc-500 mt-1">Phiên “{session.title}” sẽ dừng với cả user và admin.</p>
        </div>
        <button onClick={onCancel} className="p-1.5 hover:bg-zinc-100 rounded-lg" aria-label="Đóng">
          <X size={16} />
        </button>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-semibold">
          Hủy
        </button>
        <button
          onClick={onConfirm}
          disabled={isBusy}
          className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white text-sm font-bold"
        >
          Kết thúc live
        </button>
      </div>
    </div>
  </div>
);
