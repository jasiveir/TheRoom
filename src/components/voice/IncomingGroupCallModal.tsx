import React from 'react';
import { Phone, PhoneOff, Users, Volume2 } from 'lucide-react';

interface IncomingGroupCallModalProps {
  groupName: string;
  groupPhoto?: string;
  startedByName?: string;
  onJoin: () => void;
  onDecline: () => void;
}

export const IncomingGroupCallModal: React.FC<IncomingGroupCallModalProps> = ({
  groupName,
  groupPhoto,
  startedByName,
  onJoin,
  onDecline
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-zinc-900 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col items-center text-center p-6 relative">
        
        {/* Animated pulse ring */}
        <div className="relative mb-4 mt-2">
          <div className="absolute -inset-3 rounded-full bg-emerald-500/20 animate-ping opacity-75" />
          <div className="relative w-20 h-20 rounded-2xl bg-zinc-800 border-2 border-emerald-500 overflow-hidden flex items-center justify-center shadow-lg">
            {groupPhoto ? (
              <img src={groupPhoto} alt={groupName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <Users className="w-10 h-10 text-emerald-400" />
            )}
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Volume2 className="w-3.5 h-3.5 animate-bounce" />
          <span>Incoming Group Call</span>
        </div>

        <h3 className="text-lg font-bold text-white uppercase tracking-wider max-w-xs truncate">
          {groupName}
        </h3>

        {startedByName && (
          <p className="text-xs text-zinc-400 mt-1">
            Started by <span className="font-semibold text-zinc-200">{startedByName}</span>
          </p>
        )}

        <p className="text-[11px] text-zinc-500 mt-3 max-w-xs">
          Join the conversation now, or decline to join manually later from the chat banner.
        </p>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 w-full mt-6">
          <button
            type="button"
            onClick={onDecline}
            className="w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <PhoneOff className="w-4 h-4 text-rose-400" />
            <span>Later</span>
          </button>

          <button
            type="button"
            onClick={onJoin}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg hover:shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Phone className="w-4 h-4 fill-current" />
            <span>Join Call</span>
          </button>
        </div>

      </div>
    </div>
  );
};
