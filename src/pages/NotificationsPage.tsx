import React, { useState, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { useLayoutTemplate } from '../context/LayoutTemplateContext';
import { 
  Bell, 
  CheckCheck, 
  UserPlus, 
  MessageSquare, 
  ShieldAlert, 
  Check, 
  Trash2, 
  CheckSquare, 
  Square, 
  AlertTriangle,
  Timer
} from 'lucide-react';

interface NotificationsPageProps {
  onOpenRequests?: () => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onOpenRequests }) => {
  const { template } = useLayoutTemplate();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    deleteMultipleNotifications, 
    wipeAllNotifications 
  } = useNotifications();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState<boolean>(false);
  const [nowTime, setNowTime] = useState<number>(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getRemainingSec = (n: any) => {
    if (n.type !== 'new_message') return 0;
    const autoHide = n.autoHideExpiresAt;
    const createdMs = n.createdAt?.toMillis ? n.createdAt.toMillis() : (n.createdAt?.toDate ? n.createdAt.toDate().getTime() : 0);
    const expiresAt = autoHide || (createdMs > 0 ? createdMs + 20000 : 0);
    return expiresAt > 0 ? Math.max(0, Math.ceil((expiresAt - nowTime) / 1000)) : 0;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return <UserPlus className="w-4 h-4 text-white" />;
      case 'request_accepted':
        return <Check className="w-4 h-4 text-white" />;
      case 'new_message':
        return <MessageSquare className="w-4 h-4 text-white" />;
      case 'account_status':
        return <ShieldAlert className="w-4 h-4 text-white" />;
      default:
        return <Bell className="w-4 h-4 text-white" />;
    }
  };

  const formatDate = (ts: any) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === notifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map((n) => n.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    await deleteMultipleNotifications(selectedIds);
    setSelectedIds([]);
  };

  const handleWipeAll = async () => {
    if (!notifications.length) return;
    await wipeAllNotifications();
    setSelectedIds([]);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-black text-white p-4 sm:p-6 overflow-y-auto font-sans transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b-2 border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2 tracking-wide">
              <Bell className="w-5 h-5 text-white" />
              <span>Notifications</span>
            </h2>
            {template.id === 'apple-glass' && (
              <span className="retro-badge-spectrum ml-2">
                SIGNAL LOGS
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Stay updated with friend requests and chat activity
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-3 py-1.5 bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border-2 border-zinc-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
              title="Mark all notifications as read"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mark Read</span>
            </button>
          )}

          {notifications.length > 0 && (
            <>
              <button
                onClick={() => {
                  setSelectMode(!selectMode);
                  if (selectMode) setSelectedIds([]);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border-2 border-zinc-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer ${
                  selectMode 
                    ? 'bg-white text-black border-black font-extrabold' 
                    : 'bg-zinc-900 text-zinc-300 hover:text-white'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>{selectMode ? 'Done Selecting' : 'Select'}</span>
              </button>

              <button
                onClick={handleWipeAll}
                className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border-2 border-rose-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                title="Wipe all notifications"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Wipe All</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Select Control Toolbar */}
      {selectMode && notifications.length > 0 && (
        <div className="mb-4 p-3 bg-zinc-900 rounded-xl border-2 border-zinc-800 flex items-center justify-between text-xs text-zinc-300 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer font-medium"
          >
            {selectedIds.length === notifications.length ? (
              <CheckSquare className="w-4 h-4 text-white" />
            ) : (
              <Square className="w-4 h-4 text-zinc-500" />
            )}
            <span>
              {selectedIds.length === notifications.length ? 'Deselect All' : 'Select All'} ({selectedIds.length}/{notifications.length})
            </span>
          </button>

          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg flex items-center gap-1.5 transition-all text-xs cursor-pointer border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}
        </div>
      )}

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="text-center py-16 px-4 bg-zinc-900 rounded-2xl border-2 border-zinc-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <Bell className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
          <h3 className="font-bold text-white text-sm">No notifications yet</h3>
          <p className="text-xs text-zinc-400 mt-1">
            Activity alerts like friend requests and group updates will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-w-2xl">
          {notifications.map((n) => {
            const isSelected = selectedIds.includes(n.id);
            return (
              <div
                key={n.id}
                onClick={() => {
                  if (selectMode) {
                    toggleSelect(n.id);
                  } else if (!n.read) {
                    markAsRead(n.id);
                  }
                }}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 relative group bg-zinc-900 border-zinc-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                  template.id === 'apple-glass' ? 'hover:animate-spectrum-border' : 'hover:border-zinc-500'
                } ${
                  isSelected
                    ? 'ring-2 ring-orange-500 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                    : n.read
                    ? 'opacity-80 hover:opacity-100'
                    : 'bg-zinc-900/90'
                }`}
              >
                {/* Select Checkbox */}
                {selectMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(n.id);
                    }}
                    className="mt-1 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-white" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-500" />
                    )}
                  </button>
                )}

                <div className="w-9 h-9 rounded-xl bg-black text-white border-2 border-zinc-700 flex items-center justify-center shrink-0 mt-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  {getIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-xs text-white truncate">
                      {n.title}
                    </h4>
                    <span className="text-[10px] text-zinc-400 shrink-0">
                      {formatDate(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">
                    {n.body}
                  </p>

                  {n.type === 'new_message' && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-amber-400 font-mono font-bold bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-800/80 w-fit">
                      <Timer className="w-3 h-3 text-amber-400 animate-pulse" />
                      <span>Signal log auto-clears in {getRemainingSec(n)}s</span>
                    </div>
                  )}

                  {n.type === 'friend_request' && onOpenRequests && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!n.read) markAsRead(n.id);
                        onOpenRequests();
                      }}
                      className={`mt-2 px-2.5 py-1 ${
                        template.id === 'apple-glass'
                          ? 'animate-spectrum-bg hover:opacity-90 font-black text-black'
                          : 'bg-white hover:bg-zinc-200 text-black font-extrabold'
                      } text-[11px] rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1 transition-all cursor-pointer`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>View Friend Requests</span>
                    </button>
                  )}
                </div>

                {/* Right controls: unread indicator + single delete button */}
                <div className="flex items-center gap-2 shrink-0 mt-0.5">
                  {!n.read && !selectMode && (
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        template.id === 'apple-glass' ? 'animate-spectrum-bg' : 'bg-orange-500'
                      }`}
                      title="Unread"
                    />
                  )}

                  {!selectMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(n.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-all cursor-pointer"
                      title="Delete Notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
