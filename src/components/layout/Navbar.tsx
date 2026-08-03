import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { useLayoutTemplate } from '../../context/LayoutTemplateContext';
import { isApkMode } from '../../lib/deviceUtils';
import logoImg from '../../assets/TheRoom.jpg';
import { 
  Shield, 
  Bell, 
  Volume2, 
  VolumeX, 
  Sun, 
  Moon, 
  LogOut, 
  User as UserIcon, 
  UserPlus, 
  Menu,
  Terminal,
  Activity,
  Cpu,
  Sparkles,
  QrCode,
  Download
} from 'lucide-react';

interface NavbarProps {
  onOpenAddFriend: () => void;
  onOpenRequests: () => void;
  onOpenQrCode?: () => void;
  onOpenDownloadApk?: () => void;
  onToggleSidebarMobile?: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingRequestsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAddFriend,
  onOpenRequests,
  onOpenQrCode,
  onOpenDownloadApk,
  onToggleSidebarMobile,
  activeTab,
  setActiveTab,
  pendingRequestsCount = 0
}) => {
  const { userProfile, logOut, isAdmin } = useAuth();
  const { unreadCount, soundEnabled, setSoundEnabled } = useNotifications();
  const { darkMode, toggleDarkMode } = useTheme();
  const { template } = useLayoutTemplate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const isApp = isApkMode();

  return (
    <header id="app-header" className={`h-16 ${template.bgNavbar} border-b ${template.borderMain} px-2.5 sm:px-4 flex items-center justify-between sticky top-0 z-30 transition-colors shadow-xs w-full max-w-full`}>
      {/* Left section: Mobile/Tablet menu toggle + Brand Logo */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink">
        {onToggleSidebarMobile && (
          <button
            id="mobile-sidebar-toggle"
            onClick={onToggleSidebarMobile}
            className={`lg:hidden p-1.5 sm:p-2 rounded-lg ${template.textPrimary} hover:bg-white/10 border ${template.borderMain} transition-colors cursor-pointer shrink-0`}
            title="Toggle Menu"
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        <div 
          onClick={() => setActiveTab('chats')} 
          className="flex items-center gap-1.5 sm:gap-2 cursor-pointer select-none group min-w-0 shrink-0"
        >
          <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-xl ${template.bgCard} border ${template.borderMain} flex items-center justify-center font-bold text-base transition-transform group-hover:scale-105 shrink-0 overflow-hidden shadow-xs`}>
            <img src={logoImg} onError={(e) => { e.currentTarget.src = '/logos/logo.jpg'; }} alt="TheRoom Logo" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 min-w-0">
              <h1 className={`font-extrabold ${template.textPrimary} tracking-wider leading-none text-xs sm:text-base md:text-lg uppercase whitespace-nowrap shrink-0`}>
                THEROOM
              </h1>
              {template.id === 'apple-glass' ? (
                <span className="retro-badge-spectrum shrink-0 hidden min-[420px]:inline-block">
                  CHROME VYSE
                </span>
              ) : template.id !== 'classic' && (
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${template.activeTabBg} ${template.activeTabText} shrink-0 hidden min-[420px]:inline-block`}>
                  {template.badge}
                </span>
              )}
            </div>
            <p className={`text-[10px] ${template.textSecondary} font-mono hidden md:flex items-center gap-1 truncate`}>
              <Activity className={`w-3 h-3 ${template.accentText} shrink-0`} />
              <span>SECURE PRIVATE CHAT</span>
            </p>
          </div>
        </div>
      </div>

      {/* Center & Right Actions */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button
          id="friend-requests-nav-btn"

          onClick={onOpenRequests}
          className={`relative p-1.5 sm:p-2 rounded-lg ${template.textPrimary} border ${template.borderMain} ${template.bgCard} hover:opacity-90 transition-all cursor-pointer`}
          title="Friend Requests"
        >
          <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
          {pendingRequestsCount > 0 && (
            <span className={`absolute -top-1 -right-1 min-w-4 sm:min-w-5 h-4 sm:h-5 ${template.activeTabBg} ${template.activeTabText} text-[9px] sm:text-[10px] font-extrabold rounded-full flex items-center justify-center px-0.5 sm:px-1`}>
              {pendingRequestsCount}
            </span>
          )}
        </button>

        <button
          id="notifications-nav-btn"
          onClick={() => setActiveTab('notifications')}
          className={`relative p-1.5 sm:p-2 rounded-lg border transition-all cursor-pointer ${
            activeTab === 'notifications'
              ? `${template.activeTabBg} ${template.activeTabText} border-transparent`
              : `${template.bgCard} ${template.borderMain} ${template.textPrimary} hover:opacity-90`
          }`}
          title="Notifications"
        >
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          {unreadCount > 0 && (
            <span className={`absolute -top-1 -right-1 min-w-4 sm:min-w-5 h-4 sm:h-5 ${template.activeTabBg} ${template.activeTabText} text-[9px] sm:text-[10px] font-extrabold rounded-full flex items-center justify-center px-0.5 sm:px-1`}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        <button
          id="sound-toggle-btn"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-1.5 sm:p-2 rounded-lg ${template.textPrimary} border ${template.borderMain} ${template.bgCard} hover:opacity-90 transition-colors cursor-pointer`}
          title={soundEnabled ? "Audio Active" : "Audio Muted"}
        >
          {soundEnabled ? <Volume2 className={`w-4 h-4 sm:w-5 sm:h-5 ${template.textPrimary}`} /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400" />}
        </button>

        {isAdmin && (
          <button
            id="admin-nav-btn"
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-bold border border-rose-300 text-rose-800 bg-rose-50 hover:bg-rose-100 transition-all cursor-pointer ${
              activeTab === 'admin' ? 'ring-2 ring-rose-600' : ''
            }`}
            title="Admin Console"
          >
            <Shield className="w-4 h-4 text-rose-700" />
            <span className="hidden md:inline uppercase">Admin Portal</span>
          </button>
        )}

        {/* User Profile Menu */}
        <div className="relative">
          <button
            id="user-avatar-btn"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`flex items-center gap-2 p-1 rounded-lg border ${template.borderMain} ${template.bgCard} hover:opacity-90 transition-all`}
          >
            {userProfile?.photoURL ? (
              <img 
                src={userProfile.photoURL} 
                alt={userProfile.fullName} 
                className="w-7 h-7 rounded object-cover border border-[#e2dfd2]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 rounded bg-black text-white font-bold text-xs flex items-center justify-center">
                {userProfile?.fullName?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
          </button>

          {showProfileMenu && (
            <div 
              id="user-profile-dropdown"
              className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-lg border border-[#e2dfd2] py-2 z-50 animate-in fade-in slide-in-from-top-2"
            >
              <div className="px-4 py-2 border-b border-[#e2dfd2]">
                <p className="font-bold text-black text-sm truncate uppercase tracking-wider">
                  {userProfile?.fullName}
                </p>
                <p className="text-xs text-zinc-500 truncate">
                  @{userProfile?.username}
                </p>
                <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono bg-[#f7f5ee] px-2 py-1 rounded text-black border border-[#e2dfd2]">
                  <span className="text-[10px] text-zinc-500 uppercase">CODE:</span>
                  <span className="font-bold tracking-widest">{userProfile?.friendCode}</span>
                </div>
              </div>

              {onOpenQrCode && (
                <button
                  id="menu-qr-code-btn"
                  onClick={() => {
                    onOpenQrCode();
                    setShowProfileMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-bold text-black hover:bg-black/5 flex items-center gap-2 transition-colors uppercase tracking-wider cursor-pointer border-t border-[#e2dfd2]"
                >
                  <QrCode className="w-4 h-4 text-amber-600" />
                  My QR Code
                </button>
              )}

              {!isApp && onOpenDownloadApk && (
                <button
                  id="menu-download-apk-btn"
                  onClick={() => {
                    onOpenDownloadApk();
                    setShowProfileMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-black text-green-700 bg-green-50 hover:bg-green-100 flex items-center gap-2 transition-colors uppercase tracking-wider cursor-pointer border-t border-[#e2dfd2]"
                >
                  <Download className="w-4 h-4 text-green-700" />
                  Download Android APK
                </button>
              )}

              <button
                id="menu-settings-btn"

                onClick={() => {
                  setActiveTab('settings');
                  setShowProfileMenu(false);
                }}
                className="w-full px-4 py-2.5 text-left text-xs font-bold text-black hover:bg-black/5 flex items-center gap-2 transition-colors uppercase tracking-wider cursor-pointer"
              >
                <UserIcon className="w-4 h-4 text-black" />
                Account Settings
              </button>

              <button
                id="menu-logout-btn"
                onClick={logOut}
                className="w-full px-4 py-2.5 text-left text-xs font-bold text-rose-700 hover:bg-rose-50 flex items-center gap-2 transition-colors border-t border-[#e2dfd2] mt-1 uppercase tracking-wider cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-700" />
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

