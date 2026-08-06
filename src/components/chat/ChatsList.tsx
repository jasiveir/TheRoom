import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useLayoutTemplate } from '../../context/LayoutTemplateContext';
import { Chat } from '../../types';
import { MessageSquare, Plus, Users, Search, Terminal, Trash2 } from 'lucide-react';
import { checkIsFriend } from '../../lib/friendService';
import { deleteChatById, markChatAsRead } from '../../lib/chatService';

interface ChatsListProps {
  activeChatId: string | null;
  onSelectChat: (chat: Chat | null) => void;
  onOpenCreateGroup: () => void;
  onOpenAddFriend: () => void;
}

export const ChatsList: React.FC<ChatsListProps> = ({
  activeChatId,
  onSelectChat,
  onOpenCreateGroup,
  onOpenAddFriend
}) => {
  const { userProfile } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [pendingDeleteChatId, setPendingDeleteChatId] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile?.uid) return;

    setLoading(true);
    const q = query(
      collection(db, 'chats'),
      where('members', 'array-contains', userProfile.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const rawList: Chat[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Chat, 'id'>)
      }));

      // Sort by updatedAt or lastMessageTime desc
      rawList.sort((a, b) => {
        const tA = a.lastMessageTime?.toMillis ? a.lastMessageTime.toMillis() : (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0);
        const tB = b.lastMessageTime?.toMillis ? b.lastMessageTime.toMillis() : (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0);
        return tB - tA;
      });

      // Deduplicate private chats in memory safely
      const verifiedList: Chat[] = [];
      const seenPrivateUserIds = new Set<string>();

      for (const chat of rawList) {
        if (chat.type === 'private') {
          const otherUid = chat.members?.find((m) => m !== userProfile.uid);
          if (!otherUid) continue;

          // Deduplicate multiple private chat documents with same friend
          if (seenPrivateUserIds.has(otherUid)) continue;

          seenPrivateUserIds.add(otherUid);
          verifiedList.push(chat);
        } else {
          verifiedList.push(chat);
        }
      }

      setChats(verifiedList);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching chats:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile?.uid, activeChatId]);

  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setPendingDeleteChatId(chatId);
  };

  const confirmDeleteChat = async () => {
    if (!pendingDeleteChatId) return;
    const chatId = pendingDeleteChatId;
    setPendingDeleteChatId(null);
    if (chatId === activeChatId) {
      onSelectChat(null);
    }
    await deleteChatById(chatId);
  };

  const filteredChats = chats.filter((c) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    if (c.type === 'group') {
      return c.name?.toLowerCase().includes(term);
    } else {
      const otherUid = c.members.find((m) => m !== userProfile?.uid);
      const otherDetail = otherUid ? c.memberDetails?.[otherUid] : null;
      return (
        otherDetail?.fullName?.toLowerCase().includes(term) ||
        otherDetail?.username?.toLowerCase().includes(term)
      );
    }
  });

  const { template } = useLayoutTemplate();

  return (
    <div id="chats-list-panel" className={`w-full h-full ${template.bgMain} flex flex-col shrink-0 transition-colors`}>
      {/* Header */}
      <div className={`p-4 border-b ${template.borderMain} space-y-3 ${template.bgSidebar}`}>
        <div className="flex items-center justify-between">
          <h2 className={`font-bold ${template.textPrimary} text-sm flex items-center gap-2 uppercase tracking-wider`}>
            <MessageSquare className={`w-4 h-4 ${template.textPrimary}`} />
            <span>Active Conversations</span>
          </h2>

          <button
            onClick={onOpenCreateGroup}
            className={`p-1.5 rounded-lg ${template.bgCard} ${template.textPrimary} hover:opacity-90 border ${template.borderMain} transition-all cursor-pointer`}
            title="Create Group Chat"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Input */}
        <div className="relative">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search channels..."
            className={`w-full pl-8 pr-3 py-2 ${template.bgCard} border ${template.borderMain} rounded-xl text-xs ${template.textPrimary} placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-sans`}
          />
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* List */}
      <div className={`flex-1 overflow-y-auto p-2 space-y-1.5 ${template.bgMain}`}>
        {loading ? (
          <div className="py-8 text-center flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs">
            <span className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent inline-block" />
            <span>Loading conversations...</span>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-10 px-4 text-zinc-500 text-xs space-y-3 font-sans">
            <Terminal className="w-6 h-6 text-zinc-400 mx-auto" />
            <p className="font-bold text-zinc-700">NO ACTIVE CHANNELS FOUND</p>
            <button
              onClick={onOpenAddFriend}
              className="px-3 py-2 bg-black text-white font-bold rounded-xl text-xs hover:bg-zinc-800 transition-all uppercase tracking-wider cursor-pointer shadow-xs"
            >
              Add Friend via Code
            </button>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isSelected = chat.id === activeChatId;
            const otherUid = chat.type === 'private' ? chat.members.find((m) => m !== userProfile?.uid) : null;
            const otherDetail = otherUid ? chat.memberDetails?.[otherUid] : null;

            const isGroup = chat.type === 'group';
            const name = isGroup ? chat.name : (otherDetail?.username ? `@${otherDetail.username}` : (otherDetail?.fullName || 'User'));
            const photo = isGroup ? chat.photoURL : otherDetail?.photoURL;

            const isDeletedExpired = chat.lastMessageDeletedExpiresAt ? (Date.now() >= chat.lastMessageDeletedExpiresAt) : false;
            const displayLastMsg = isDeletedExpired ? 'Channel created' : (chat.lastMessage || 'Channel created');

            const rawUnread = userProfile?.uid ? chat.unreadCounts?.[userProfile.uid] || 0 : 0;
            const unread = (isDeletedExpired || !chat.lastMessage || displayLastMsg === 'Channel created') ? 0 : rawUnread;

            const handleChatClick = () => {
              if (userProfile?.uid && unread > 0) {
                markChatAsRead(chat.id, userProfile.uid).catch(() => {});
              }
              onSelectChat(chat);
            };

            return (
              <div
                key={chat.id}
                onClick={handleChatClick}
                className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border relative ${
                  isSelected
                    ? `${template.activeTabBg} ${template.activeTabText} border-transparent ${template.cardGlow}`
                    : `${template.bgCard} ${template.borderMain} ${template.textPrimary} hover:opacity-90`
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {photo ? (
                    <img src={photo} alt={name || 'Chat'} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-[#e2dfd2]" referrerPolicy="no-referrer" />
                  ) : (
                    <div className={`w-10 h-10 rounded-lg font-bold text-sm flex items-center justify-center shrink-0 border ${
                      isSelected
                        ? 'bg-white text-black border-white'
                        : 'bg-black text-white border-black'
                    }`}>
                      {isGroup ? <Users className="w-5 h-5" /> : ((otherDetail?.username || otherDetail?.fullName)?.[0]?.toUpperCase() || 'U')}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    {isGroup ? (
                      <h4 className={`font-bold text-xs truncate uppercase tracking-wider ${isSelected ? 'text-white' : 'text-black'}`}>
                        {chat.name}
                      </h4>
                    ) : (
                      <h4 className={`font-bold text-xs truncate uppercase tracking-wider ${isSelected ? 'text-white' : 'text-black'}`}>
                        {otherDetail?.username ? `@${otherDetail.username}` : (otherDetail?.fullName || 'User')}
                      </h4>
                    )}
                  </div>
                  <p className={`text-[11px] truncate ${isSelected ? 'text-zinc-300 font-medium' : 'text-zinc-500'}`}>
                    {displayLastMsg}
                  </p>
                </div>

                {/* Right controls: unread badge + manual delete button */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {unread > 0 && !isSelected && (
                    <span className="w-5 h-5 bg-black text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shrink-0">
                      {unread}
                    </span>
                  )}

                  <button
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer font-bold border ${
                      isSelected
                        ? 'bg-zinc-800 text-white border-zinc-700 hover:bg-rose-900 hover:border-rose-700 hover:text-white'
                        : 'bg-zinc-100 text-black border-zinc-300 hover:bg-rose-100 hover:border-rose-300 hover:text-rose-600'
                    }`}
                    title="Delete Conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Chat Confirmation Modal */}
      {pendingDeleteChatId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#e2dfd2] rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl font-mono">
            <h3 className="text-sm font-bold text-black">Delete Conversation</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Are you sure you want to delete this conversation? All message history will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingDeleteChatId(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-black font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteChat}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Delete Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

