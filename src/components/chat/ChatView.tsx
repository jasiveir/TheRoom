import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useVoiceCall } from '../../context/VoiceCallContext';
import { useLayoutTemplate } from '../../context/LayoutTemplateContext';
import { Chat, Message, UserProfile } from '../../types';
import { sendMessage, markChatAsRead, markMessageRead, setTypingState, deleteChatById, deleteMessageForEveryone } from '../../lib/chatService';
import { filterValidMessages, purgeExpiredMessagesForChat } from '../../lib/messageCleanup';
import { MessageBubble } from './MessageBubble';
import { EmojiPicker } from './EmojiPicker';
import { 
  Send, 
  Smile, 
  Image as ImageIcon, 
  Search, 
  X, 
  ArrowLeft, 
  Info, 
  UserX, 
  Phone,
  ShieldAlert,
  Terminal,
  Activity,
  Timer,
  Clock,
  Calendar,
  Zap
} from 'lucide-react';
import { checkIsFriend } from '../../lib/friendService';

interface ChatViewProps {
  chat: Chat;
  onBackMobile?: () => void;
  onCloseChat?: () => void;
  onOpenGroupDetails?: (chat: Chat) => void;
  onOpenFriendProfile?: (friend: UserProfile) => void;
  onOpenUnfriendModal?: (friend: UserProfile) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  chat,
  onBackMobile,
  onCloseChat,
  onOpenGroupDetails,
  onOpenFriendProfile,
  onOpenUnfriendModal
}) => {
  const { userProfile } = useAuth();
  const { startVoiceCall, joinGroupVoiceCall } = useVoiceCall();
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState('');
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isOtherUserFriend, setIsOtherUserFriend] = useState(true);
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);
  const [groupCallCount, setGroupCallCount] = useState<number>(0);

  // Listen for live active participants in group voice room
  useEffect(() => {
    if (chat.type !== 'group' || !chat.id) return;
    const colRef = collection(db, 'groupCalls', chat.id, 'participants');
    const unsub = onSnapshot(colRef, (snap) => {
      setGroupCallCount(snap.size);
    }, () => setGroupCallCount(0));
    return () => unsub();
  }, [chat.id, chat.type]);

  // Disappearing & Scheduled Messages States
  const [disappearingDuration, setDisappearingDuration] = useState<number>(0); // 0 = off, else seconds
  const [scheduledFor, setScheduledFor] = useState<number | null>(null);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [showScheduleMenu, setShowScheduleMenu] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    if (onCloseChat) onCloseChat();
    if (onBackMobile) onBackMobile();
  };

  // Listen to chat doc directly to detect if deleted from Firestore
  useEffect(() => {
    if (!chat.id) return;
    const chatDocRef = doc(db, 'chats', chat.id);
    const unsub = onSnapshot(chatDocRef, (snap) => {
      if (!snap.exists()) {
        handleClose();
      }
    });
    return () => unsub();
  }, [chat.id]);

  const handleGallerySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 1000;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            setSelectedGalleryImage(canvas.toDataURL('image/jpeg', 0.82));
          } else {
            setSelectedGalleryImage(event.target?.result as string);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error loading gallery image:', err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Identify other user in private chat
  const otherUserId = chat.type === 'private'
    ? chat.members.find((mId) => mId !== userProfile?.uid)
    : null;

  // Check friendship status for private chat
  useEffect(() => {
    if (chat.type === 'private' && otherUserId && userProfile?.uid) {
      checkIsFriend(userProfile.uid, otherUserId).then((isF) => {
        setIsOtherUserFriend(isF);
      });

      getDoc(doc(db, 'users', otherUserId)).then((uDoc) => {
        if (uDoc.exists()) {
          setOtherUser({ uid: uDoc.id, ...uDoc.data() } as UserProfile);
        }
      });
    }
  }, [chat.id, otherUserId, userProfile?.uid]);

  // Subscribe to real-time messages & run auto 7-day retention cleanup
  useEffect(() => {
    if (!chat.id || !userProfile?.uid) return;

    // Mark chat as read
    markChatAsRead(chat.id, userProfile.uid);

    // Background safety purge for expired messages (>7 days)
    purgeExpiredMessagesForChat(chat.id);

    const messagesRef = collection(db, 'chats', chat.id, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Message[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Message, 'id'>)
      }));

      // Filter messages strictly <= 7 days old
      const valid = filterValidMessages(list);
      setMessages(valid);

      // Auto mark messages read
      valid.forEach((msg) => {
        if (!msg.readBy?.includes(userProfile.uid)) {
          markMessageRead(chat.id, msg.id, userProfile.uid);
        }
      });
    });

    return () => unsubscribe();
  }, [chat.id, userProfile?.uid]);

  // Live 1-second ticker for disappearing message countdowns & scheduled delivery checks
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setCurrentTime(now);

      // Auto delete expired messages in real time
      messages.forEach((msg) => {
        if (msg.expiresAt && now >= msg.expiresAt && !msg.isDeleted) {
          deleteMessageForEveryone(chat.id, msg.id).catch(() => {});
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [messages, chat.id]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userProfile) return;

    const trimmed = textInput.trim();
    const media = selectedGalleryImage || mediaUrlInput.trim();

    if (!trimmed && !media) return;

    // Block private messages if not confirmed friends
    if (chat.type === 'private' && !isOtherUserFriend) {
      alert('You can no longer send private messages to this user because you are not friends.');
      return;
    }

    try {
      setTextInput('');
      setMediaUrlInput('');
      setSelectedGalleryImage(null);
      setShowMediaInput(false);
      setShowEmojiPicker(false);
      setShowTimerMenu(false);
      setShowScheduleMenu(false);

      const sendTimer = disappearingDuration;
      const sendScheduled = scheduledFor;

      // Reset options after sending
      setDisappearingDuration(0);
      setScheduledFor(null);

      const replyData = replyingTo ? {
        id: replyingTo.id,
        text: replyingTo.text,
        senderName: replyingTo.senderName
      } : undefined;
      setReplyingTo(null);

      await sendMessage(
        chat.id, 
        userProfile, 
        trimmed, 
        media, 
        replyData,
        sendTimer > 0 ? sendTimer : undefined,
        sendScheduled || undefined
      );
      await setTypingState(chat.id, userProfile.uid, false);
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleTypingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTextInput(e.target.value);
    if (userProfile) {
      setTypingState(chat.id, userProfile.uid, e.target.value.length > 0);
    }
  };

  // Filter scheduled messages (only visible to sender until scheduled time arrives)
  const visibleMessages = messages.filter((m) => {
    if (m.scheduledFor && m.scheduledFor > currentTime) {
      return m.senderId === userProfile?.uid;
    }
    return true;
  });

  // Filter messages for search
  const filteredMessages = searchQuery.trim()
    ? visibleMessages.filter((m) => m.text?.toLowerCase().includes(searchQuery.toLowerCase()))
    : visibleMessages;

  const otherDetail = otherUserId ? chat.memberDetails?.[otherUserId] : null;

  const { template } = useLayoutTemplate();

  return (
    <div id="chat-view-container" className={`flex-1 flex flex-col h-full ${template.bgMain} transition-colors relative overflow-hidden`}>
      {/* Chat Header */}
      <div className={`h-16 px-2.5 sm:px-4 ${template.bgSidebar} border-b ${template.borderMain} flex items-center justify-between shrink-0 z-10 shadow-xs gap-2 min-w-0`}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
          {onBackMobile && (
            <button
              onClick={onBackMobile}
              className="lg:hidden p-1.5 rounded-lg text-black hover:bg-[#f7f5ee] border border-[#e2dfd2] cursor-pointer shrink-0"
              title="Back to conversations"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={() => {
              if (chat.type === 'group' && onOpenGroupDetails) {
                onOpenGroupDetails(chat);
              } else if (otherUser && onOpenFriendProfile) {
                onOpenFriendProfile(otherUser);
              }
            }}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none min-w-0 flex-1 overflow-hidden"
          >
            {chat.type === 'group' ? (
              chat.photoURL ? (
                <img src={chat.photoURL} alt={chat.name} className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover shrink-0 border border-[#e2dfd2]" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-black text-white font-bold text-xs sm:text-sm flex items-center justify-center shrink-0 border border-black shadow-xs">
                  {chat.name?.[0]?.toUpperCase() || 'G'}
                </div>
              )
            ) : otherDetail?.photoURL ? (
              <img src={otherDetail.photoURL} alt={otherDetail.fullName} className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover shrink-0 border border-[#e2dfd2]" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-black text-white font-bold text-xs sm:text-sm flex items-center justify-center shrink-0 border border-black shadow-xs">
                {otherDetail?.fullName?.[0]?.toUpperCase() || 'U'}
              </div>
            )}

            <div className="min-w-0 flex-1 overflow-hidden">
              {chat.type === 'group' ? (
                <h3 className="font-bold text-xs sm:text-sm text-black truncate uppercase tracking-wider block min-w-0">
                  {chat.name}
                </h3>
              ) : (
                <div className="relative group/chatheader h-5 flex items-center min-w-0 w-full">
                  <h3 className="font-bold text-xs sm:text-sm text-black truncate uppercase tracking-wider transition-opacity duration-300 group-hover/chatheader:opacity-0 block min-w-0">
                    {otherDetail?.username ? `@${otherDetail.username}` : (otherDetail?.fullName || 'User')}
                  </h3>
                  {otherDetail?.fullName ? (
                    <h3 className="font-bold text-xs sm:text-sm text-emerald-600 truncate uppercase tracking-wider absolute top-0 left-0 w-full opacity-0 transition-opacity duration-300 group-hover/chatheader:opacity-100 pointer-events-none block min-w-0">
                      {otherDetail.fullName}
                    </h3>
                  ) : null}
                </div>
              )}
              <p className="text-[10px] sm:text-[11px] text-zinc-500 truncate flex items-center gap-1.5 font-sans min-w-0">
                {chat.type === 'group' ? (
                  <span>{chat.members.length} members</span>
                ) : (
                  <>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${otherUser?.status === 'online' ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-zinc-400'}`} />
                    <span className="capitalize truncate">{otherUser?.status === 'online' ? 'Online' : 'Offline'}</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-1 sm:ml-2">
          {chat.type === 'private' && (otherUser || otherUserId) && (
            <button
              onClick={() => {
                const targetUid = otherUser?.uid || otherUserId || '';
                const targetName = otherUser?.fullName || otherDetail?.name || otherUser?.email?.split('@')[0] || 'Friend';
                const targetAvatar = otherUser?.photoURL || otherDetail?.photoURL || '';
                startVoiceCall(targetUid, targetName, targetAvatar, chat.id);
              }}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
              title="Start Voice Call"
            >
              <Phone className="w-4 h-4 sm:w-3.5 sm:h-3.5 fill-current shrink-0" />
              <span className="hidden sm:inline">Voice Call</span>
            </button>
          )}

          {chat.type === 'group' && (
            <button
              onClick={() => joinGroupVoiceCall(chat.id, chat.name || 'Group Chat', chat.photoURL, chat.members)}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
              title="Join or Start Group Voice Call"
            >
              <Phone className="w-4 h-4 sm:w-3.5 sm:h-3.5 fill-current shrink-0" />
              <span className="hidden sm:inline">Group Call</span>
            </button>
          )}

          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-1.5 sm:p-2 rounded-lg text-zinc-700 border border-[#e2dfd2] hover:bg-[#f7f5ee] transition-all cursor-pointer shrink-0 ${
              showSearch ? 'bg-black text-white border-black' : ''
            }`}
            title="Search conversation"
          >
            <Search className="w-4 h-4" />
          </button>

          {chat.type === 'group' ? (
            <button
              onClick={() => onOpenGroupDetails && onOpenGroupDetails(chat)}
              className="p-1.5 sm:p-2 rounded-lg text-zinc-700 border border-[#e2dfd2] hover:bg-[#f7f5ee] transition-colors cursor-pointer shrink-0"
              title="Group info"
            >
              <Info className="w-4 h-4" />
            </button>
          ) : (
            otherUser && isOtherUserFriend && onOpenUnfriendModal && (
              <button
                onClick={() => onOpenUnfriendModal(otherUser)}
                className="p-1.5 sm:p-2 rounded-lg text-rose-600 border border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                title="Unfriend User"
              >
                <UserX className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Active Group Call Banner */}
      {chat.type === 'group' && groupCallCount > 0 && (
        <div className="bg-emerald-950 text-white border-b border-emerald-800 px-4 py-2 flex items-center justify-between z-20 shadow-md">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <p className="text-xs font-bold tracking-wide">
              Live Group Call ({groupCallCount} participant{groupCallCount > 1 ? 's' : ''} on call)
            </p>
          </div>
          <button
            type="button"
            onClick={() => joinGroupVoiceCall(chat.id, chat.name || 'Group Chat', chat.photoURL, chat.members)}
            className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95"
          >
            Join Call
          </button>
        </div>
      )}

      {/* In-chat Search Input Bar */}
      {showSearch && (
        <div className="p-2 bg-[#f7f5ee] border-b border-[#e2dfd2] flex items-center gap-2 animate-in slide-in-from-top-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            className="flex-1 px-3 py-1.5 bg-white border border-[#e2dfd2] rounded-lg text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black font-sans"
            autoFocus
          />
          <button
            onClick={() => {
              setSearchQuery('');
              setShowSearch(false);
            }}
            className="p-1 rounded-lg text-zinc-500 hover:text-black cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#faf9f5]">
        {filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs space-y-2 font-sans">
            <Terminal className="w-8 h-8 text-zinc-400" />
            <p className="uppercase tracking-widest text-sm font-bold text-black">Channel ready</p>
            <p className="text-[11px] text-zinc-500">Messages purge automatically after 7 days.</p>
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              chatId={chat.id}
              onReply={(m) => setReplyingTo(m)}
              isGroup={chat.type === 'group'}
              onImageClick={(url) => setPreviewImageUrl(url)}
              currentTime={currentTime}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Replying Banner */}
      {replyingTo && (
        <div className="px-4 py-2 bg-white border-t border-[#e2dfd2] flex items-center justify-between text-xs text-black font-sans">
          <div>
            <span className="font-bold">Replying to {replyingTo.senderName}: </span>
            <span className="italic opacity-80 truncate max-w-xs inline-block align-bottom">{replyingTo.text}</span>
          </div>
          <button onClick={() => setReplyingTo(null)} className="p-1 text-zinc-500 hover:text-black cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Selected Gallery Image Preview Banner */}
      {selectedGalleryImage && (
        <div className="px-4 py-2 bg-white border-t border-[#e2dfd2] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-[#e2dfd2] shrink-0">
              <img src={selectedGalleryImage} alt="Attachment preview" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-xs font-bold text-black font-sans uppercase">Image attachment ready</p>
              <p className="text-[10px] text-zinc-500 font-sans">Will be sent with message</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedGalleryImage(null)}
            className="p-1 text-zinc-500 hover:text-black hover:bg-[#f7f5ee] rounded-lg cursor-pointer"
            title="Remove attachment"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Active Disappearing / Scheduled Settings Banner */}
      {(disappearingDuration > 0 || scheduledFor !== null) && (
        <div className="px-4 py-2 bg-[#f7f5ee] border-t border-[#e2dfd2] flex items-center justify-between text-xs font-sans gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {disappearingDuration > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 font-bold text-[11px]">
                <Timer className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                <span>
                  Disappears: {
                    disappearingDuration === 10 ? '10 Seconds' :
                    disappearingDuration === 30 ? '30 Seconds' :
                    disappearingDuration === 60 ? '1 Minute' :
                    disappearingDuration === 300 ? '5 Minutes' :
                    disappearingDuration === 3600 ? '1 Hour' :
                    disappearingDuration === 86400 ? '24 Hours' : `${disappearingDuration}s`
                  }
                </span>
                <button
                  onClick={() => setDisappearingDuration(0)}
                  className="ml-1 p-0.5 hover:bg-rose-200 rounded-full cursor-pointer"
                  title="Remove disappearing timer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {scheduledFor !== null && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px]">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                <span>Scheduled for {new Date(scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</span>
                <button
                  onClick={() => setScheduledFor(null)}
                  className="ml-1 p-0.5 hover:bg-amber-200 rounded-full cursor-pointer"
                  title="Remove schedule"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
          <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">Settings applied on send</span>
        </div>
      )}

      {/* Media Image URL Bar */}
      {showMediaInput && (
        <div className="px-4 py-2 bg-white border-t border-[#e2dfd2] flex items-center gap-2">
          <input
            type="url"
            value={mediaUrlInput}
            onChange={(e) => setMediaUrlInput(e.target.value)}
            placeholder="Paste image URL (https://...)"
            className="flex-1 px-3 py-1.5 bg-[#f7f5ee] border border-[#e2dfd2] rounded-lg text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black font-sans"
          />
          <button onClick={() => setShowMediaInput(false)} className="p-1 text-zinc-500 hover:text-black cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hidden File Input for Gallery Selection */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleGallerySelect}
        className="hidden"
      />

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 left-4 z-40">
          <EmojiPicker
            onSelectEmoji={(emoji) => setTextInput((prev) => prev + emoji)}
            onClose={() => setShowEmojiPicker(false)}
          />
        </div>
      )}

      {/* Disappearing Timer Popover Menu */}
      {showTimerMenu && (
        <div className="absolute bottom-16 left-12 z-40 p-3 bg-black text-white border border-zinc-800 rounded-2xl shadow-2xl w-60 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-zinc-800">
            <span className="text-xs font-bold flex items-center gap-1.5 text-rose-400">
              <Timer className="w-4 h-4" />
              <span>Disappearing Message</span>
            </span>
            <button onClick={() => setShowTimerMenu(false)} className="p-0.5 text-zinc-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {[
              { label: 'Off', val: 0 },
              { label: '10 Seconds', val: 10 },
              { label: '30 Seconds', val: 30 },
              { label: '1 Minute', val: 60 },
              { label: '5 Minutes', val: 300 },
              { label: '1 Hour', val: 3600 },
              { label: '24 Hours', val: 86400 }
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => {
                  setDisappearingDuration(opt.val);
                  setShowTimerMenu(false);
                }}
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold text-left transition-all cursor-pointer ${
                  disappearingDuration === opt.val
                    ? 'bg-rose-950 border-rose-500 text-rose-200'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled Message Popover Menu */}
      {showScheduleMenu && (
        <div className="absolute bottom-16 left-20 z-40 p-3 bg-black text-white border border-zinc-800 rounded-2xl shadow-2xl w-64 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-zinc-800">
            <span className="text-xs font-bold flex items-center gap-1.5 text-amber-400">
              <Clock className="w-4 h-4" />
              <span>Schedule Message Send</span>
            </span>
            <button onClick={() => setShowScheduleMenu(false)} className="p-0.5 text-zinc-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-[10px] text-zinc-400 mb-2">Message will be visible to recipient at specified time:</p>

          <div className="grid grid-cols-2 gap-1.5 mb-2.5">
            {[
              { label: '+1 Min', ms: 60 * 1000 },
              { label: '+5 Mins', ms: 5 * 60 * 1000 },
              { label: '+30 Mins', ms: 30 * 60 * 1000 },
              { label: '+1 Hour', ms: 60 * 60 * 1000 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setScheduledFor(Date.now() + preset.ms);
                  setShowScheduleMenu(false);
                }}
                className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-[11px] font-semibold transition-all cursor-pointer text-center"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-zinc-400 block font-mono">Custom Date & Time:</label>
            <input
              type="datetime-local"
              onChange={(e) => {
                if (e.target.value) {
                  const timestamp = new Date(e.target.value).getTime();
                  if (!isNaN(timestamp)) {
                    setScheduledFor(timestamp);
                    setShowScheduleMenu(false);
                  }
                }
              }}
              className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-sans"
            />
          </div>
        </div>
      )}

      {/* Message Input Footer */}
      <form onSubmit={handleSend} className={`p-3 ${template.bgSidebar} border-t ${template.borderMain} flex items-center gap-1.5 sm:gap-2 shrink-0`}>
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={`p-2 rounded-lg ${template.textSecondary} hover:${template.textPrimary} hover:bg-black/5 transition-colors cursor-pointer`}
          title="Add Emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`p-2 rounded-lg ${template.textSecondary} hover:${template.textPrimary} hover:bg-black/5 transition-colors cursor-pointer`}
          title="Upload Image from Gallery"
        >
          <ImageIcon className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => {
            setShowTimerMenu(!showTimerMenu);
            setShowScheduleMenu(false);
          }}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            disappearingDuration > 0
              ? 'bg-rose-100 text-rose-700 border border-rose-300'
              : `${template.textSecondary} hover:${template.textPrimary} hover:bg-black/5`
          }`}
          title="Disappearing Message Timer"
        >
          <Timer className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => {
            setShowScheduleMenu(!showScheduleMenu);
            setShowTimerMenu(false);
          }}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            scheduledFor !== null
              ? 'bg-amber-100 text-amber-800 border border-amber-300'
              : `${template.textSecondary} hover:${template.textPrimary} hover:bg-black/5`
          }`}
          title="Schedule Message Delivery"
        >
          <Clock className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={textInput}
          onChange={handleTypingChange}
          placeholder={
            disappearingDuration > 0 && scheduledFor !== null
              ? 'Disappearing + Scheduled Message...'
              : disappearingDuration > 0
              ? 'Disappearing Message...'
              : scheduledFor !== null
              ? 'Scheduled Message...'
              : 'Type message...'
          }
          className={`flex-1 min-w-0 px-3.5 py-2.5 ${template.bgCard} border ${template.borderMain} rounded-xl text-xs ${template.textPrimary} placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-sans`}
        />

        <button
          type="submit"
          disabled={!textInput.trim() && !mediaUrlInput.trim() && !selectedGalleryImage}
          className={`p-2.5 ${template.activeTabBg} ${template.activeTabText} disabled:opacity-30 rounded-xl font-bold transition-all shadow-xs active:scale-95 cursor-pointer shrink-0`}
          title="Send Message"
        >
          <Send className="w-4 h-4 text-white font-extrabold" />
        </button>
      </form>

      {/* Full Image Preview Lightbox Modal with Top-Right X Exit Button */}
      {previewImageUrl && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewImageUrl(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewImageUrl(null)}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-black/80 text-white border border-zinc-700 hover:bg-black hover:scale-105 transition-all cursor-pointer shadow-xl z-50"
            title="Close Preview (X)"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewImageUrl}
            alt="Full size preview"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl border border-zinc-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

