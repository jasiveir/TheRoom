import React, { useState } from 'react';
import { Message } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Check, CheckCheck, Trash2, Reply, MoreVertical, Timer, Clock } from 'lucide-react';
import { deleteMessageForEveryone, deleteMessageForSelf } from '../../lib/chatService';

interface MessageBubbleProps {
  message: Message;
  chatId: string;
  onReply: (msg: Message) => void;
  isGroup: boolean;
  onImageClick?: (url: string) => void;
  currentTime?: number;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  chatId,
  onReply,
  isGroup,
  onImageClick,
  currentTime
}) => {
  const { userProfile } = useAuth();
  const [showOptions, setShowOptions] = useState(false);

  const isSelf = message.senderId === userProfile?.uid;
  const now = currentTime || Date.now();
  const isScheduled = message.scheduledFor && message.scheduledFor > now;
  const isDisappearing = message.expiresAt && !message.isDeleted;

  const getDeletedExpiresAt = (msg: Message): number => {
    if (msg.deletedExpiresAt) return msg.deletedExpiresAt;
    if (msg.deletedAt) return msg.deletedAt + 30000;
    const createdOrEdited = msg.editedAt?.toMillis ? msg.editedAt.toMillis() : (msg.createdAt?.toMillis ? msg.createdAt.toMillis() : 0);
    if (createdOrEdited > 0) return createdOrEdited + 30000;
    return Date.now() + 30000;
  };

  const delRemainingSec = message.isDeleted ? Math.max(0, Math.ceil((getDeletedExpiresAt(message) - now) / 1000)) : 0;

  const getRemainingTimeStr = (expiresAt: number) => {
    const diffSec = Math.max(0, Math.floor((expiresAt - now) / 1000));
    if (diffSec >= 3600) {
      const h = Math.floor(diffSec / 3600);
      const m = Math.floor((diffSec % 3600) / 60);
      return `${h}h ${m}m`;
    }
    const m = Math.floor(diffSec / 60);
    const s = diffSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };
  
  // Check if message is deleted for self
  if (message.deletedFor && userProfile?.uid && message.deletedFor.includes(userProfile.uid)) {
    return null;
  }

  // Hide deleted for everyone message after 30 seconds expiration
  if (message.isDeleted && delRemainingSec <= 0) {
    return null;
  }

  // Format creation time
  const formatTime = (ts: any) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isReadByOthers = message.readBy?.some((uid) => uid !== userProfile?.uid);

  const handleDeleteEveryone = async () => {
    await deleteMessageForEveryone(chatId, message.id);
  };

  const handleDeleteSelf = async () => {
    if (!userProfile) return;
    await deleteMessageForSelf(chatId, message.id, userProfile.uid);
  };

  return (
    <div className={`flex flex-col my-1.5 relative group ${isSelf ? 'items-end' : 'items-start'}`}>
      {/* Sender Name in group chats */}
      {isGroup && !isSelf && (
        <span className="text-[10px] font-bold text-zinc-600 mb-0.5 ml-2 uppercase tracking-wider">
          {message.senderName}
        </span>
      )}

      <div className="flex items-center gap-1 max-w-[85%] sm:max-w-[75%]">
        {/* Actions Dropdown Button for Outgoing */}
        {isSelf && !message.isDeleted && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-black transition-opacity cursor-pointer"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showOptions && (
              <div className="absolute right-0 bottom-full mb-1 w-44 bg-white rounded-xl shadow-lg border border-[#e2dfd2] py-1 z-30 text-xs text-zinc-800">
                <button
                  onClick={() => {
                    onReply(message);
                    setShowOptions(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-[#f7f5ee] flex items-center gap-2 text-black font-medium cursor-pointer"
                >
                  <Reply className="w-3.5 h-3.5" />
                  Reply
                </button>
                <button
                  onClick={() => {
                    handleDeleteSelf();
                    setShowOptions(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-[#f7f5ee] flex items-center gap-2 text-zinc-700 font-medium cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-zinc-500" />
                  Delete for Me
                </button>
                <button
                  onClick={() => {
                    handleDeleteEveryone();
                    setShowOptions(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-rose-50 flex items-center gap-2 text-rose-600 font-medium cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  Delete Everyone
                </button>
              </div>
            )}
          </div>
        )}

        {/* Message Content Bubble */}
        <div
          className={`p-3 rounded-2xl text-xs relative transition-all border ${
            message.isDeleted
              ? 'bg-[#f7f5ee] text-zinc-400 italic border-[#e2dfd2]'
              : isSelf
              ? 'bg-black text-white border-black rounded-tr-xs shadow-xs font-sans'
              : 'bg-white text-zinc-900 border-[#e2dfd2] rounded-tl-xs shadow-xs font-sans'
          }`}
        >
          {/* Reply Quote Header */}
          {message.replyTo && !message.isDeleted && (
            <div className={`mb-2 p-2 rounded-lg text-[11px] border-l-2 ${
              isSelf
                ? 'bg-zinc-800 border-white text-white'
                : 'bg-[#f7f5ee] border-black text-black'
            }`}>
              <p className="font-bold text-[10px] uppercase tracking-wider">{message.replyTo.senderName}</p>
              <p className="truncate line-clamp-1 opacity-90">{message.replyTo.text}</p>
            </div>
          )}

          {/* Media Image Attachment */}
          {message.mediaUrl && !message.isDeleted && (
            <div 
              onClick={() => onImageClick && onImageClick(message.mediaUrl!)}
              className="mb-2 rounded-xl overflow-hidden max-w-xs border border-zinc-200/40 cursor-pointer hover:opacity-95 transition-opacity group/img relative"
              title="Click for Full Image Preview"
            >
              <img
                src={message.mediaUrl}
                alt="Shared attachment"
                className="w-full h-auto max-h-60 object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-all flex items-center justify-center">
                <span className="opacity-0 group-hover/img:opacity-100 bg-black/80 text-white text-[10px] font-bold font-mono px-2.5 py-1 rounded-full backdrop-blur-xs transition-all shadow-md">
                  🔍 View Full Image
                </span>
              </div>
            </div>
          )}

          {/* Message Text */}
          <p className="whitespace-pre-wrap break-words leading-relaxed font-normal text-[13px]">
            {message.text}
          </p>

          {/* Deleted Expiration Timer Indicator */}
          {message.isDeleted && delRemainingSec > 0 && (
            <div className="mt-1 pt-1 border-t border-zinc-300/40 flex items-center gap-1 text-[10px] text-zinc-500 font-mono font-semibold">
              <Timer className="w-3 h-3 text-rose-500 animate-pulse" />
              <span>Disappears in {delRemainingSec}s</span>
            </div>
          )}

          {/* Scheduled / Disappearing Badges */}
          {(isScheduled || isDisappearing) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/15">
              {isScheduled && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Scheduled: {new Date(message.scheduledFor!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </span>
              )}
              {isDisappearing && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  <Timer className="w-3 h-3 text-rose-400 shrink-0 animate-pulse" />
                  <span>Disappears in {getRemainingTimeStr(message.expiresAt!)}</span>
                </span>
              )}
            </div>
          )}

          {/* Footer Metadata */}
          <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
            isSelf ? 'text-zinc-300' : 'text-zinc-400'
          }`}>
            <span>{formatTime(message.createdAt)}</span>

            {/* Read Receipt ticks for outgoing */}
            {isSelf && !message.isDeleted && (
              <span>
                {isReadByOthers ? (
                  <CheckCheck className="w-3.5 h-3.5 text-white font-extrabold" title="Read" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-zinc-400" title="Delivered" />
                )}
              </span>
            )}
          </div>
        </div>

        {!isSelf && !message.isDeleted && (
          <button
            type="button"
            onClick={() => onReply(message)}
            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-black transition-opacity cursor-pointer"
            title="Reply"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

