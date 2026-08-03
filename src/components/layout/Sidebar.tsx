import React from 'react';
import { MessageSquare, Users, Bell, Settings, Shield, PlusCircle, UserPlus, Terminal, QrCode, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useLayoutTemplate } from '../../context/LayoutTemplateContext';
import { isApkMode } from '../../lib/deviceUtils';
import logoImg from '../../assets/TheRoom.jpg';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingRequestsCount: number;
  onOpenAddFriend: () => void;
  onOpenCreateGroup: () => void;
  onOpenQrCode?: () => void;
  onOpenDownloadApk?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingRequestsCount,
  onOpenAddFriend,
  onOpenCreateGroup,
  onOpenQrCode,
  onOpenDownloadApk
}) => {
  const { isAdmin } = useAuth();
  const { unreadCount } = useNotifications();
  const { template } = useLayoutTemplate();
  const isApp = isApkMode();


  const navItems = [
    {
      id: 'chats',
      label: 'CHATS // FEED',
      icon: MessageSquare,
      badge: 0
    },
    {
      id: 'friends',
      label: 'NODES // FRIENDS',
      icon: Users,
      badge: pendingRequestsCount
    },
    {
      id: 'notifications',
      label: 'SIGNAL LOGS',
      icon: Bell,
      badge: unreadCount
    },
    {
      id: 'settings',
      label: 'TERMINAL CONFIG',
      icon: Settings,
      badge: 0
    },
  ];

  if (isAdmin) {
    navItems.push({
      id: 'admin',
      label: 'ADMIN CONSOLE',
      icon: Shield,
      badge: 0
    });
  }

  return (
    <aside id="app-sidebar" className={`w-full md:w-64 ${template.bgSidebar} border-r ${template.borderMain} flex flex-col justify-between transition-colors shrink-0 h-full`}>
      <div className="p-3.5 space-y-4">
        {/* Quick Actions Header Badge */}
        {template.id === 'apple-glass' && (
          <div className="flex items-center justify-between px-1 text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
            <span>[ QUICK ACTIONS ]</span>
            <span className="w-2 h-2 rounded-full animate-spectrum-bg shrink-0" />
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            id="sidebar-add-friend-btn"
            onClick={onOpenAddFriend}
            className={`flex items-center justify-center gap-1.5 p-2.5 ${template.bgCard} ${template.textPrimary} hover:opacity-90 rounded-xl text-xs font-bold transition-all border ${template.borderMain} ${template.cardGlow} active:scale-95 uppercase tracking-wider cursor-pointer ${
              template.id === 'apple-glass' ? 'hover:animate-spectrum-border' : ''
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Friend</span>
          </button>

          <button
            id="sidebar-create-group-btn"
            onClick={onOpenCreateGroup}
            className={`flex items-center justify-center gap-1.5 p-2.5 ${template.bgCard} ${template.textPrimary} hover:opacity-90 rounded-xl text-xs font-bold transition-all border ${template.borderMain} ${template.cardGlow} active:scale-95 uppercase tracking-wider cursor-pointer ${
              template.id === 'apple-glass' ? 'hover:animate-spectrum-border' : ''
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Group</span>
          </button>

          {onOpenQrCode && (
            <button
              id="sidebar-qr-code-btn"
              onClick={onOpenQrCode}
              className={`col-span-1 flex items-center justify-center gap-1.5 p-2 bg-zinc-900 text-amber-400 hover:opacity-90 rounded-xl text-xs font-bold transition-all border border-zinc-800 active:scale-95 uppercase tracking-wider cursor-pointer`}
            >
              <QrCode className="w-3.5 h-3.5 text-amber-400" />
              <span>My QR</span>
            </button>
          )}

          {!isApp && onOpenDownloadApk && (
            <button
              id="sidebar-download-apk-btn"
              onClick={onOpenDownloadApk}
              className={`col-span-1 flex items-center justify-center gap-1.5 p-2 bg-green-500 text-black hover:bg-green-400 rounded-xl text-xs font-black transition-all border-2 border-black active:scale-95 uppercase tracking-wider cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}
            >
              <Download className="w-3.5 h-3.5 text-black" />
              <span>Get APK</span>
            </button>
          )}
        </div>


        {/* Navigation Section Header Badge */}
        {template.id === 'apple-glass' && (
          <div className="flex items-center justify-between px-1 pt-2 text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
            <span>[ NAVIGATION PANELS ]</span>
            <span className="text-[9px] animate-spectrum-text font-black">● LIVE</span>
          </div>
        )}

        {/* Navigation list */}
        <nav className="space-y-1.5 pt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider border cursor-pointer ${
                  isActive
                    ? `${template.activeTabBg} ${template.activeTabText} ${template.id === 'apple-glass' ? 'animate-spectrum-border border-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.9)]' : 'border-transparent'} ${template.cardGlow}`
                    : `${template.bgCard} ${template.borderMain} hover:border-zinc-500 ${template.textSecondary} hover:${template.textPrimary}`
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? template.activeTabText : template.textSecondary}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge > 0 && (
                  <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                    isActive
                      ? 'bg-black text-white'
                      : `${template.activeTabBg} ${template.activeTabText}`
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className={`p-3.5 border-t ${template.borderMain} text-[10px] ${template.textSecondary} text-center font-mono flex items-center justify-center gap-1.5`}>
        <img src={logoImg} onError={(e) => { e.currentTarget.src = '/logos/logo.jpg'; }} alt="TheRoom" className="w-3.5 h-3.5 rounded object-cover" />
        <span className={template.id === 'apple-glass' ? 'animate-spectrum-text font-bold' : ''}>
          THEROOM // {template.badge}
        </span>
      </div>
    </aside>
  );
};

