import React from 'react';
import { UserProfile } from '../../types';
import { X, MessageSquare, UserX, MapPin, Calendar, Hash, ShieldCheck, Phone } from 'lucide-react';
import { useVoiceCall } from '../../context/VoiceCallContext';

interface FriendProfileModalProps {
  isOpen: boolean;
  friend: UserProfile | null;
  onClose: () => void;
  onStartChat: (friend: UserProfile) => void;
  onOpenUnfriend: (friend: UserProfile) => void;
  isFriend: boolean;
}

export const FriendProfileModal: React.FC<FriendProfileModalProps> = ({
  isOpen,
  friend,
  onClose,
  onStartChat,
  onOpenUnfriend,
  isFriend
}) => {
  const { startVoiceCall } = useVoiceCall();

  if (!isOpen || !friend) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 p-6 overflow-hidden relative transition-colors">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Profile Card Center */}
        <div className="text-center pt-2">
          <div className="relative inline-block mb-3">
            {friend.photoURL ? (
              <img
                src={friend.photoURL}
                alt={friend.fullName}
                className="w-20 h-20 rounded-full object-cover border-2 border-zinc-700 shadow-md mx-auto"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white text-black font-bold text-2xl flex items-center justify-center shadow-md mx-auto">
                {friend.fullName[0]?.toUpperCase()}
              </div>
            )}
            <span 
              className={`absolute bottom-0 right-1 w-4 h-4 rounded-full border-2 border-zinc-900 ${
                friend.status === 'online' ? 'bg-white ring-1 ring-zinc-500' : 'bg-zinc-600'
              }`} 
            />
          </div>

          <h2 className="text-lg font-bold text-white">
            {friend.fullName}
          </h2>
          <p className="text-xs text-zinc-400">
            @{friend.username}
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-black border border-zinc-800 rounded-full text-xs font-mono font-bold text-zinc-300 mt-2">
            <Hash className="w-3.5 h-3.5 text-zinc-500" />
            <span>{friend.friendCode}</span>
          </div>
        </div>

        {/* Bio & Details */}
        <div className="mt-5 space-y-3">
          {friend.bio && (
            <div className="p-3 bg-black rounded-xl text-xs text-zinc-300 italic border border-zinc-800">
              "{friend.bio}"
            </div>
          )}

          <div className="space-y-2 text-xs text-zinc-400">
            {(friend.city || friend.country) && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-zinc-500 shrink-0" />
                <span>{[friend.city, friend.country].filter(Boolean).join(', ')}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-white shrink-0" />
              <span>{isFriend ? 'Confirmed Friend' : 'Group Member'}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-2">
          {isFriend && (
            <button
              onClick={() => {
                startVoiceCall(
                  friend.uid,
                  friend.fullName || friend.email?.split('@')[0] || 'Friend',
                  friend.photoURL || ''
                );
                onClose();
              }}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Phone className="w-4 h-4 fill-current" />
              <span>Start Voice Call</span>
            </button>
          )}

          {isFriend && (
            <button
              onClick={() => {
                onStartChat(friend);
                onClose();
              }}
              className="w-full py-2.5 bg-white hover:bg-zinc-200 text-black rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Send Private Message</span>
            </button>
          )}

          {isFriend && (
            <button
              onClick={() => {
                onOpenUnfriend(friend);
                onClose();
              }}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <UserX className="w-4 h-4" />
              <span>Unfriend User</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
