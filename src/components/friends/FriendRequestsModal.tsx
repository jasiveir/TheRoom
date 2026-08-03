import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useLayoutTemplate } from '../../context/LayoutTemplateContext';
import { FriendRequest, UserProfile } from '../../types';
import { acceptFriendRequest, declineFriendRequest } from '../../lib/friendService';
import { X, Check, XCircle, Clock, UserCheck } from 'lucide-react';

interface FriendRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FriendRequestsModal: React.FC<FriendRequestsModalProps> = ({ isOpen, onClose }) => {
  const { template } = useLayoutTemplate();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-zinc-950 text-white rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-zinc-800 p-6 overflow-hidden relative transition-colors max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center border-2 border-zinc-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">Friend Requests</h2>
                {template.id === 'apple-glass' && (
                  <span className="retro-badge-spectrum">
                    FRIEND REQUESTS
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">Manage incoming invitations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer border border-transparent hover:border-zinc-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <span className="animate-spin rounded-full h-6 w-6 border-2 border-current border-t-transparent" />
            </div>
          ) : incomingRequests.length === 0 ? (
            <div className={`text-center py-8 px-4 ${template.textSecondary}`}>
              <Clock className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
              <p className={`text-xs font-bold ${template.textPrimary}`}>No pending friend requests</p>
              <p className={`text-[11px] ${template.textSecondary} mt-1`}>
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
                  className={`p-3 ${template.bgMain} border ${template.borderMain} rounded-xl flex items-center justify-between gap-3 animate-in fade-in`}
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
                      <div className={`w-10 h-10 rounded-full ${template.bgCard} ${template.textPrimary} flex items-center justify-center font-bold text-sm shrink-0 border ${template.borderMain}`}>
                        {sender?.fullName?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className={`font-bold text-xs ${template.textPrimary} truncate`}>
                        {sender?.fullName}
                      </h4>
                      <p className={`text-[11px] ${template.textSecondary} truncate`}>
                        @{sender?.username}
                      </p>
                      <p className={`text-[10px] ${template.textSecondary} font-mono`}>
                        {sender?.friendCode}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleAccept(req)}
                      disabled={isWorking}
                      className={`px-3 py-1.5 ${
                        template.id === 'apple-glass'
                          ? 'animate-spectrum-bg hover:opacity-90 font-black'
                          : 'bg-black hover:bg-zinc-800 text-white font-bold'
                      } text-xs rounded-lg flex items-center gap-1 shadow-xs transition-all cursor-pointer`}
                      title="Accept Request"
                    >
                      {isWorking ? (
                        <span className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent" />
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleDecline(req.id)}
                      disabled={isWorking}
                      className={`p-1.5 ${template.bgCard} ${template.textSecondary} hover:text-rose-500 rounded-lg transition-colors border ${template.borderMain} cursor-pointer`}
                      title="Decline Request"
                    >
                      <XCircle className="w-4 h-4" />
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
