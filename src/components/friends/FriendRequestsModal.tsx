import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { FriendRequest, UserProfile } from '../../types';
import { acceptFriendRequest, declineFriendRequest } from '../../lib/friendService';
import { X, Check, XCircle, Clock, UserCheck } from 'lucide-react';

interface FriendRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FriendRequestsModal: React.FC<FriendRequestsModalProps> = ({ isOpen, onClose }) => {
  const { userProfile } = useAuth();
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !userProfile?.uid) return;

    setLoading(true);
    const q = query(
      collection(db, 'friendRequests'),
      where('receiverId', '==', userProfile.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: FriendRequest[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<FriendRequest, 'id'>)
      }));
      setIncomingRequests(list);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching friend requests:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, userProfile?.uid]);

  if (!isOpen) return null;

  const handleAccept = async (request: FriendRequest) => {
    if (!userProfile) return;
    setActionInProgress(request.id);
    try {
      await acceptFriendRequest(request, userProfile);
    } catch (err) {
      console.error('Error accepting friend request:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    setActionInProgress(requestId);
    try {
      await declineFriendRequest(requestId);
    } catch (err) {
      console.error('Error declining friend request:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 p-6 overflow-hidden relative transition-colors max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white border border-zinc-800">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Friend Requests</h2>
              <p className="text-xs text-zinc-400">Manage incoming invitations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <span className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
            </div>
          ) : incomingRequests.length === 0 ? (
            <div className="text-center py-8 px-4 text-zinc-400">
              <Clock className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
              <p className="text-xs font-medium text-white">No pending friend requests</p>
              <p className="text-[11px] text-zinc-500 mt-1">
                When someone adds you using your Friend Code ({userProfile?.friendCode}), it will appear here.
              </p>
            </div>
          ) : (
            incomingRequests.map((req) => {
              const sender = req.senderProfile;
              const isWorking = actionInProgress === req.id;

              return (
                <div
                  key={req.id}
                  className="p-3 bg-black border border-zinc-800 rounded-xl flex items-center justify-between gap-3 animate-in fade-in"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {sender?.photoURL ? (
                      <img
                        src={sender.photoURL}
                        alt={sender.fullName || 'User'}
                        className="w-10 h-10 rounded-full object-cover border border-zinc-700 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-zinc-800 text-white flex items-center justify-center font-bold text-sm shrink-0 border border-zinc-700">
                        {sender?.fullName?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-white truncate">
                        {sender?.fullName}
                      </h4>
                      <p className="text-[11px] text-zinc-400 truncate">
                        @{sender?.username}
                      </p>
                      <p className="text-[10px] text-zinc-300 font-mono">
                        {sender?.friendCode}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleAccept(req)}
                      disabled={isWorking}
                      className="px-2.5 py-1.5 bg-white hover:bg-zinc-200 text-black rounded-lg text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                      title="Accept"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Accept</span>
                    </button>
                    <button
                      onClick={() => handleDecline(req.id)}
                      disabled={isWorking}
                      className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50"
                      title="Decline"
                    >
                      <XCircle className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="hidden sm:inline">Decline</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
