import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { unfriendUser } from '../../lib/friendService';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, UserX, X } from 'lucide-react';

interface UnfriendModalProps {
  isOpen: boolean;
  friend: UserProfile | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const UnfriendModal: React.FC<UnfriendModalProps> = ({
  isOpen,
  friend,
  onClose,
  onSuccess
}) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !friend) return null;

  const handleConfirmUnfriend = async () => {
    if (!userProfile || !friend) return;
    setLoading(true);
    setError(null);

    try {
      await unfriendUser(userProfile.uid, friend.uid);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error unfriending user:', err);
      setError('Could not remove friend. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#e2dfd2] p-6 overflow-hidden relative transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e2dfd2]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white border border-black shadow-xs">
              <UserX className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-black">
              Remove Friend
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-500 hover:text-black hover:bg-[#f7f5ee] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Friend details preview */}
        <div className="my-4 p-3 bg-[#f7f5ee] border border-[#e2dfd2] rounded-xl flex items-center gap-3">
          {friend.photoURL ? (
            <img
              src={friend.photoURL}
              alt={friend.fullName}
              className="w-10 h-10 rounded-full object-cover border border-[#e2dfd2]"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center font-bold text-white text-sm border border-black shadow-xs">
              {friend.fullName[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="font-bold text-xs text-black">
              {friend.fullName}
            </h3>
            <p className="text-[11px] text-zinc-500">
              @{friend.username} &bull; {friend.friendCode}
            </p>
          </div>
        </div>

        {/* Mandatory Confirmation Notice */}
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-rose-700">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Confirmation Required</span>
          </div>
          <p className="leading-relaxed text-[11px] text-rose-800">
            Are you sure you want to remove this friend? Private messaging will be disabled and existing message history with this friend will be deleted.
          </p>
        </div>

        {error && (
          <div className="mt-3 p-2.5 bg-rose-100 border border-rose-300 text-rose-800 rounded-xl text-xs">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold transition-colors border border-zinc-200 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmUnfriend}
            disabled={loading}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <UserX className="w-4 h-4" />
                <span>Unfriend</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
