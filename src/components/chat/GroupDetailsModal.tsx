import React, { useState } from 'react';
import { Chat, UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { leaveGroupChat, removeGroupMember, transferGroupOwnership } from '../../lib/chatService';
import { sendFriendRequest, checkIsFriend } from '../../lib/friendService';
import { X, Users, LogOut, UserMinus, Crown, UserPlus, ShieldAlert, Pin } from 'lucide-react';

interface GroupDetailsModalProps {
  isOpen: boolean;
  chat: Chat | null;
  onClose: () => void;
  onOpenAddMember?: () => void;
}

export const GroupDetailsModal: React.FC<GroupDetailsModalProps> = ({
  isOpen,
  chat,
  onClose
}) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [friendshipStatuses, setFriendshipStatuses] = useState<Record<string, boolean>>({});
  const [addingFriendUid, setAddingFriendUid] = useState<string | null>(null);

  if (!isOpen || !chat || chat.type !== 'group') return null;

  const isOwner = chat.ownerId === userProfile?.uid;

  const handleLeaveGroup = async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      await leaveGroupChat(chat.id, userProfile.uid);
      onClose();
    } catch (e) {
      console.error('Error leaving group:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setLoading(true);
    try {
      await removeGroupMember(chat.id, memberId);
    } catch (e) {
      console.error('Error removing member:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleTransferOwnership = async (newOwnerId: string) => {
    setLoading(true);
    try {
      await transferGroupOwnership(chat.id, newOwnerId);
    } catch (e) {
      console.error('Error transferring ownership:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendReq = async (member: any) => {
    if (!userProfile) return;
    setAddingFriendUid(member.uid);
    try {
      await sendFriendRequest(userProfile, member as UserProfile);
    } catch (e: any) {
      console.error('Could not send friend request:', e);
    } finally {
      setAddingFriendUid(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 p-6 overflow-hidden relative transition-colors max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white border border-zinc-800">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Group Details</h2>
              <p className="text-xs text-zinc-400">{chat.members.length} members</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Group Info */}
        <div className="py-4 overflow-y-auto flex-1 space-y-4">
          <div className="text-center">
            {chat.photoURL ? (
              <img
                src={chat.photoURL}
                alt={chat.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-zinc-700 shadow-md mx-auto mb-2"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-zinc-800 text-white font-bold text-xl flex items-center justify-center shadow-md mx-auto mb-2 border border-zinc-700">
                {chat.name?.[0]?.toUpperCase() || 'G'}
              </div>
            )}
            <h3 className="font-bold text-white text-base">
              {chat.name}
            </h3>
            {chat.description && (
              <p className="text-xs text-zinc-400 mt-1 italic">
                {chat.description}
              </p>
            )}
          </div>

          {/* Member List */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
              Members ({chat.members.length})
            </h4>

            <div className="space-y-1.5 border border-zinc-800 rounded-xl p-2 bg-black max-h-56 overflow-y-auto">
              {chat.members.map((memberId) => {
                const detail = chat.memberDetails?.[memberId] || { fullName: 'Member', username: 'user', uid: memberId };
                const isMemberOwner = chat.ownerId === memberId;
                const isSelf = memberId === userProfile?.uid;

                return (
                  <div
                    key={memberId}
                    className="flex items-center justify-between p-2 rounded-lg bg-zinc-900 border border-zinc-800"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {detail.photoURL ? (
                        <img
                          src={detail.photoURL}
                          alt={detail.fullName}
                          className="w-8 h-8 rounded-full object-cover border border-zinc-700 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-800 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-zinc-700">
                          {detail.fullName?.[0]?.toUpperCase() || 'M'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-xs text-white truncate">
                            {detail.fullName} {isSelf && '(You)'}
                          </span>
                          {isMemberOwner && (
                            <Crown className="w-3.5 h-3.5 text-white fill-white shrink-0" title="Group Owner" />
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 truncate">
                          @{detail.username}
                        </p>
                      </div>
                    </div>

                    {/* Member Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {!isSelf && (
                        <button
                          onClick={() => handleSendFriendReq(detail)}
                          disabled={addingFriendUid === detail.uid}
                          className="p-1.5 rounded-lg bg-black text-white hover:bg-zinc-800 border border-zinc-800 transition-colors"
                          title="Send Friend Request"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {isOwner && !isSelf && (
                        <>
                          <button
                            onClick={() => handleTransferOwnership(memberId)}
                            className="p-1.5 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Transfer Ownership"
                          >
                            <Crown className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleRemoveMember(memberId)}
                            className="p-1.5 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Remove Member"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="pt-3 border-t border-zinc-800 flex justify-between items-center shrink-0">
          <button
            onClick={handleLeaveGroup}
            disabled={loading}
            className="px-3 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Leave Group</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-bold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
