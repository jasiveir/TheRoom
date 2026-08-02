import React from 'react';
import { MessageSquare, Users, Bell, Settings, Shield, PlusCircle, UserPlus, Terminal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingRequestsCount: number;
  onOpenAddFriend: () => void;
  onOpenCreateGroup: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingRequestsCount,
  onOpenAddFriend,
  onOpenCreateGroup
}) => {
  const { isAdmin } = useAuth();
  const { unreadCount } = useNotifications();

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
    <aside id="app-sidebar" className="w-full md:w-64 bg-[#fbfaf6] border-r border-[#e2dfd2] flex flex-col justify-between transition-colors shrink-0 h-full">
      <div className="p-3.5 space-y-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            id="sidebar-add-friend-btn"
            onClick={onOpenAddFriend}
            className="flex items-center justify-center gap-1.5 p-2.5 bg-white text-black hover:bg-black hover:text-white rounded-xl text-xs font-bold transition-all border border-[#e2dfd2] shadow-xs active:scale-95 uppercase tracking-wider cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Friend</span>
          </button>

          <button
            id="sidebar-create-group-btn"
            onClick={onOpenCreateGroup}
            className="flex items-center justify-center gap-1.5 p-2.5 bg-white text-black hover:bg-black hover:text-white rounded-xl text-xs font-bold transition-all border border-[#e2dfd2] shadow-xs active:scale-95 uppercase tracking-wider cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Group</span>
          </button>
        </div>

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
                    ? 'bg-black border-black text-white'
                    : 'bg-white border-[#e2dfd2] text-zinc-700 hover:bg-black/5 hover:text-black'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-600'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge > 0 && (
                  <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                    isActive
                      ? 'bg-white text-black'
                      : 'bg-black text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-3.5 border-t border-[#e2dfd2] text-[10px] text-zinc-500 text-center font-mono flex items-center justify-center gap-1.5">
        <img src="/logos/TheRoom.jpg" alt="TheRoom" className="w-3.5 h-3.5 rounded object-cover" />
        <span>THEROOM // SECURE</span>
      </div>
    </aside>
  );
};

