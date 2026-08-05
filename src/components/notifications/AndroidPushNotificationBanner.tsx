import React, { useState, useEffect } from 'react';
import { MessageSquare, ChevronDown, Check, Send, X } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface ActiveAndroidBannerNotif {
  id: string;
  senderName: string;
  senderId?: string;
  senderAvatar?: string;
  chatId?: string;
  body: string;
  timestampMs: number;
}

interface AndroidPushNotificationBannerProps {
  onNavigateToChat?: (chatId: string) => void;
}

export const AndroidPushNotificationBanner: React.FC<AndroidPushNotificationBannerProps> = ({ onNavigateToChat }) => {
  const { notifications, markAsRead } = useNotifications();
  const { userProfile } = useAuth();
  
  const [activeBanner, setActiveBanner] = useState<ActiveAndroidBannerNotif | null>(null);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Watch for incoming new_message notifications
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    const latestUnreadMsg = notifications.find((n) => n.type === 'new_message' && !n.read);
    if (latestUnreadMsg) {
      const senderName = latestUnreadMsg.title || 'Friend';
      const body = latestUnreadMsg.body || 'Sent an encrypted message';
      
      // Extract chatId / sender info from payload if present
      const chatId = (latestUnreadMsg as any).chatId || (latestUnreadMsg as any).senderId || '';
      const senderAvatar = (latestUnreadMsg as any).senderAvatar || '';

      setActiveBanner({
        id: latestUnreadMsg.id,
        senderName,
        senderId: (latestUnreadMsg as any).senderId,
        senderAvatar,
        chatId,
        body,
        timestampMs: Date.now()
      });

      // Auto dismiss banner after 12 seconds
      const timer = setTimeout(() => {
        setActiveBanner(null);
        setIsReplying(false);
      }, 12000);

      return () => clearTimeout(timer);
    }
  }, [notifications]);

  if (!activeBanner) return null;

  const initialLetter = activeBanner.senderName.charAt(0).toUpperCase() || 'U';

  const handleDismiss = () => {
    markAsRead(activeBanner.id);
    setActiveBanner(null);
    setIsReplying(false);
  };

  const handleSendQuickReply = async (quickMessage: string) => {
    if (!quickMessage.trim() || !activeBanner.chatId || !userProfile?.uid) {
      handleDismiss();
      return;
    }

    setIsSendingReply(true);
    try {
      await addDoc(collection(db, 'messages'), {
        chatId: activeBanner.chatId,
        senderId: userProfile.uid,
        senderEmail: userProfile.email || '',
        senderDisplayName: userProfile.displayName || userProfile.email?.split('@')[0] || 'User',
        senderAvatarUrl: userProfile.photoURL || '',
        text: quickMessage.trim(),
        createdAt: serverTimestamp(),
        createdAtMs: Date.now(),
        readBy: [userProfile.uid]
      });

      markAsRead(activeBanner.id);
      setActiveBanner(null);
      setIsReplying(false);
      setReplyText('');
    } catch (err) {
      console.error('Error sending Android quick reply:', err);
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] w-[94%] max-w-sm sm:max-w-md animate-in slide-in-from-top duration-300 font-sans">
      <div className="bg-[#f2f1f6] text-zinc-900 border border-zinc-300 shadow-[0_16px_36px_rgba(0,0,0,0.35)] rounded-[26px] p-3.5 space-y-2.5 relative backdrop-blur-xl select-none">
        {/* Top App Header bar */}
        <div className="flex items-center justify-between text-xs text-zinc-600 px-1">
          <div className="flex items-center gap-1.5 font-medium">
            <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white">
              <MessageSquare className="w-2.5 h-2.5" />
            </div>
            <span className="font-semibold text-[13px] text-zinc-800">Messages</span>
            <span className="text-zinc-400">•</span>
            <span className="text-zinc-500 text-[11px]">now</span>
          </div>

          <div className="flex items-center gap-2 text-zinc-500">
            <ChevronDown className="w-4 h-4" />
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-zinc-200 rounded-full transition-colors cursor-pointer"
              title="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sender Info Row */}
        <div className="flex items-start gap-3 px-1">
          {/* Avatar circle */}
          <div className="relative shrink-0">
            {activeBanner.senderAvatar ? (
              <img
                src={activeBanner.senderAvatar}
                alt={activeBanner.senderName}
                className="w-11 h-11 rounded-full object-cover shadow-sm border border-white"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-lg shadow-sm border border-white">
                {initialLetter}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-indigo-600 rounded-full border-2 border-[#f2f1f6] flex items-center justify-center">
              <MessageSquare className="w-2 h-2 text-white" />
            </div>
          </div>

          {/* Name & Snippet */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-bold text-zinc-900 truncate">{activeBanner.senderName}</h4>
              <span className="text-[11px] text-zinc-500 font-medium">• now</span>
            </div>
            <p className="text-xs text-zinc-700 leading-snug line-clamp-2 font-normal mt-0.5">
              {activeBanner.body}
            </p>
          </div>
        </div>

        {/* Quick Suggestion Chips (as seen in Android 14/15 reference photo) */}
        {!isReplying && (
          <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-0.5 no-scrollbar px-1">
            <button
              onClick={() => handleSendQuickReply('Whenever you want')}
              className="px-3.5 py-1.5 bg-white hover:bg-zinc-100 text-zinc-800 text-[11px] font-medium border border-zinc-300 rounded-xl shadow-2xs whitespace-nowrap transition-colors cursor-pointer"
            >
              Whenever you want
            </button>
            <button
              onClick={() => handleSendQuickReply("I don't know")}
              className="px-3.5 py-1.5 bg-white hover:bg-zinc-100 text-zinc-800 text-[11px] font-medium border border-zinc-300 rounded-xl shadow-2xs whitespace-nowrap transition-colors cursor-pointer"
            >
              I don't know
            </button>
            <button
              onClick={() => handleSendQuickReply('Any time')}
              className="px-3.5 py-1.5 bg-white hover:bg-zinc-100 text-zinc-800 text-[11px] font-medium border border-zinc-300 rounded-xl shadow-2xs whitespace-nowrap transition-colors cursor-pointer"
            >
              Any time
            </button>
          </div>
        )}

        {/* Inline Quick Reply Input mode */}
        {isReplying && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuickReply(replyText);
            }}
            className="flex items-center gap-2 pt-1 px-1"
          >
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Reply to ${activeBanner.senderName}...`}
              autoFocus
              className="flex-1 px-3 py-1.5 bg-white border border-zinc-300 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
            />
            <button
              type="submit"
              disabled={isSendingReply || !replyText.trim()}
              className="p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl shadow-2xs cursor-pointer transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Bottom Actions Row: Mark as read | Reply */}
        <div className="flex items-center justify-end gap-5 pt-1 pr-2 border-t border-zinc-200/80 text-[13px] font-semibold text-[#6b352b] font-sans">
          <button
            onClick={handleDismiss}
            className="hover:underline cursor-pointer transition-colors"
          >
            Mark as read
          </button>
          <button
            onClick={() => {
              if (activeBanner.chatId && onNavigateToChat) {
                markAsRead(activeBanner.id);
                onNavigateToChat(activeBanner.chatId);
                setActiveBanner(null);
              } else {
                setIsReplying(!isReplying);
              }
            }}
            className="hover:underline cursor-pointer transition-colors text-[#5c2b22] font-bold"
          >
            {isReplying ? 'Cancel' : 'Reply'}
          </button>
        </div>
      </div>
    </div>
  );
};
