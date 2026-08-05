import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useMatrixTransition } from '../../context/MatrixTransitionContext';
import { useLayoutTemplate } from '../../context/LayoutTemplateContext';
import { getOrCreatePrivateChat } from '../../lib/chatService';
import { isAndroidLockActive, isApkMode } from '../../lib/deviceUtils';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { AddFriendModal } from '../friends/AddFriendModal';
import { FriendRequestsModal } from '../friends/FriendRequestsModal';
import { UnfriendModal } from '../friends/UnfriendModal';
import { CreateGroupModal } from '../chat/CreateGroupModal';
import { FriendProfileModal } from '../friends/FriendProfileModal';
import { GroupDetailsModal } from '../chat/GroupDetailsModal';
import { UserQRCodeModal } from '../qr/UserQRCodeModal';
import { DownloadApkModal } from '../download/DownloadApkModal';
import { ApkPermissionModal } from '../notifications/ApkPermissionModal';
import { AndroidPushNotificationBanner } from '../notifications/AndroidPushNotificationBanner';
import { AndroidLockOverlay } from './AndroidLockOverlay';
import { ChatsList } from '../chat/ChatsList';
import { ChatView } from '../chat/ChatView';
import { FriendList } from '../friends/FriendList';
import { NotificationsPage } from '../../pages/NotificationsPage';
import { SettingsPage } from '../../pages/SettingsPage';
import { AdminDashboard } from '../../pages/AdminDashboard';
import { ResetKeyRequestPanel } from '../../pages/ResetKeyRequestPanel';
import { Chat, UserProfile } from '../../types';
import { MessageSquare } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { userProfile } = useAuth();
  const { triggerMatrixTransition } = useMatrixTransition();
  const { template } = useLayoutTemplate();
  const [activeTab, setActiveTab] = useState<string>('chats');
  const [activeChat, setActiveChat] = useState<Chat | null>(null);

  // Modals state
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showUserQr, setShowUserQr] = useState(false);
  const [showDownloadApk, setShowDownloadApk] = useState(false);
  const [showApkPermissions, setShowApkPermissions] = useState(false);
  const [androidLocked, setAndroidLocked] = useState(false);

  const [unfriendTarget, setUnfriendTarget] = useState<UserProfile | null>(null);
  const [profileTarget, setProfileTarget] = useState<UserProfile | null>(null);
  const [groupDetailsTarget, setGroupDetailsTarget] = useState<Chat | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Check Android Lock & APK Notification permissions on mount
  useEffect(() => {
    if (isAndroidLockActive()) {
      setAndroidLocked(true);
    }

    if (isApkMode()) {
      const alreadyPrompted = localStorage.getItem('apk_notification_permission_granted');
      if (!alreadyPrompted) {
        setShowApkPermissions(true);
      }
    }
  }, []);

  // Pending friend requests count
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);


  useEffect(() => {
    if (!userProfile?.uid) return;

    const q = query(
      collection(db, 'friendRequests'),
      where('receiverId', '==', userProfile.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setPendingRequestsCount(snap.size);
    });

    return () => unsubscribe();
  }, [userProfile?.uid]);

  const handleTabChange = (newTab: string) => {
    if (newTab === activeTab) return;
    triggerMatrixTransition(() => {
      setActiveTab(newTab);
    }, 700, false);
  };

  const handleSelectChat = (chat: Chat | null) => {
    setActiveChat(chat);
    setActiveTab('chats');
  };

  const handleOpenAddFriend = () => {
    setShowAddFriend(true);
  };

  const handleOpenRequests = () => {
    setShowRequests(true);
  };

  const handleOpenCreateGroup = () => {
    setShowCreateGroup(true);
  };

  return (
    <div className={`h-dvh w-full ${template.bgMain} flex flex-col overflow-hidden ${template.textPrimary} font-sans transition-colors relative`}>
      {/* Ambient Spectrum Light Glows for Chrome Vyse / Ambient Themes */}
      {(template.isGlass || template.id === 'apple-glass') && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {/* Top Left Bright Emerald Green & Lime Circle (matching top logo circle) */}
          <div className="absolute -top-32 -left-20 w-[650px] h-[650px] bg-emerald-400/25 rounded-full blur-[100px] animate-spectrum-glow" />
          {/* Top Center-Right Vivid Orange & Crimson Glow */}
          <div className="absolute -top-20 right-1/4 w-[700px] h-[700px] bg-gradient-to-br from-orange-400/30 via-rose-500/20 to-transparent rounded-full blur-[110px] animate-spectrum-glow" />
          {/* Right Center Electric Blue Glow */}
          <div className="absolute top-1/3 -right-20 w-[600px] h-[600px] bg-blue-500/25 rounded-full blur-[100px] animate-spectrum-glow" />
          {/* Bottom Right Warm Amber / Yellow Glow */}
          <div className="absolute -bottom-20 right-10 w-[650px] h-[650px] bg-amber-400/25 rounded-full blur-[110px] animate-spectrum-glow" />
          {/* Bottom Left Hot Pink & Fuchsia Glow */}
          <div className="absolute -bottom-32 left-10 w-[700px] h-[700px] bg-pink-500/30 rounded-full blur-[110px] animate-spectrum-glow" />
          {/* Center Rich Purple Accent (logo central shape) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] animate-spectrum-glow" />
        </div>
      )}

      {/* Android Device Lock Overlay */}
      {androidLocked && (
        <AndroidLockOverlay
          onBypass={() => setAndroidLocked(false)}
          onDownloadApk={() => setShowDownloadApk(true)}
        />
      )}

      {/* Navbar */}
      <Navbar
        onOpenAddFriend={handleOpenAddFriend}
        onOpenRequests={handleOpenRequests}
        onOpenQrCode={() => setShowUserQr(true)}
        onOpenDownloadApk={() => setShowDownloadApk(true)}
        onToggleSidebarMobile={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        pendingRequestsCount={pendingRequestsCount}
      />

      {/* Main Workspace Body */}
      <div className={`flex-1 flex overflow-hidden relative ${template.bgMain}`}>
        {/* Responsive Sidebar (Drawer on mobile/tablet < lg, sticky on lg+) */}
        <aside className={`
          fixed lg:relative inset-y-0 left-0 z-40 lg:z-auto w-64 transform transition-transform duration-200 ease-in-out lg:translate-x-0 h-full shrink-0
          ${mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        `}>
          <Sidebar
            activeTab={activeTab}
            setActiveTab={(tab) => {
              handleTabChange(tab);
              setMobileSidebarOpen(false);
            }}
            pendingRequestsCount={pendingRequestsCount}
            onOpenAddFriend={() => {
              handleOpenAddFriend();
              setMobileSidebarOpen(false);
            }}
            onOpenCreateGroup={() => {
              handleOpenCreateGroup();
              setMobileSidebarOpen(false);
            }}
            onOpenQrCode={() => {
              setShowUserQr(true);
              setMobileSidebarOpen(false);
            }}
            onOpenDownloadApk={() => {
              setShowDownloadApk(true);
              setMobileSidebarOpen(false);
            }}
          />
        </aside>


        {/* Mobile/Tablet backdrop for drawer */}
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 lg:hidden"
          />
        )}

        {/* Main Content Area */}
        <main className={`flex-1 flex overflow-hidden min-w-0 ${template.bgMain}`}>
          {activeTab === 'chats' && (
            <div className={`flex-1 flex h-full overflow-hidden w-full ${template.bgMain}`}>
              {/* Chats List Column */}
              <div className={`h-full w-full lg:w-80 border-r ${template.borderMain} shrink-0 ${activeChat ? 'hidden lg:block' : 'block'}`}>
                <ChatsList
                  activeChatId={activeChat?.id || null}
                  onSelectChat={handleSelectChat}
                  onOpenCreateGroup={() => setShowCreateGroup(true)}
                  onOpenAddFriend={() => setShowAddFriend(true)}
                />
              </div>

              {/* Chat Conversation Column */}
              <div className={`flex-1 h-full min-w-0 ${template.bgMain} ${!activeChat ? 'hidden lg:flex' : 'flex'}`}>
                {activeChat ? (
                  <ChatView
                    chat={activeChat}
                    onBackMobile={() => setActiveChat(null)}
                    onCloseChat={() => setActiveChat(null)}
                    onOpenGroupDetails={(chat) => setGroupDetailsTarget(chat)}
                    onOpenFriendProfile={(user) => setProfileTarget(user)}
                    onOpenUnfriendModal={(user) => setUnfriendTarget(user)}
                  />
                ) : (
                  <div className={`flex-1 flex flex-col items-center justify-center p-6 text-center ${template.textSecondary} space-y-3 ${template.bgMain}`}>
                    <div className={`w-16 h-16 rounded-3xl ${template.bgCard} border ${template.borderMain} ${template.textPrimary} flex items-center justify-center ${template.cardGlow}`}>
                      <MessageSquare className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className={`font-bold ${template.textPrimary} text-sm uppercase tracking-wider flex items-center justify-center gap-1.5`}>
                        <span>{template.symbol}</span>
                        <span>Select a Conversation</span>
                      </h3>
                      <p className={`text-xs ${template.textSecondary} mt-1 max-w-xs`}>
                        Choose an active chat from the sidebar or start a new conversation with a friend.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'friends' && (
            <FriendList
              onStartChatWithFriend={(chat) => {
                setActiveChat(chat);
                setActiveTab('chats');
              }}
              onOpenUnfriend={(friend) => setUnfriendTarget(friend)}
              onOpenProfile={(friend) => setProfileTarget(friend)}
            />
          )}

          {activeTab === 'notifications' && <NotificationsPage onOpenRequests={handleOpenRequests} />}
          {activeTab === 'reset-key' && <ResetKeyRequestPanel />}
          {activeTab === 'settings' && <SettingsPage />}
          {activeTab === 'admin' && <AdminDashboard />}
        </main>
      </div>

      {/* Global Modals */}
      <AddFriendModal
        isOpen={showAddFriend}
        onClose={() => setShowAddFriend(false)}
      />

      <FriendRequestsModal
        isOpen={showRequests}
        onClose={() => setShowRequests(false)}
      />

      <UnfriendModal
        isOpen={!!unfriendTarget}
        friend={unfriendTarget}
        onClose={() => setUnfriendTarget(null)}
        onSuccess={() => {
          if (activeChat && activeChat.type === 'private' && unfriendTarget) {
            if (activeChat.members.includes(unfriendTarget.uid)) {
              setActiveChat(null);
            }
          }
        }}
      />

      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onGroupCreated={(groupId) => {
          setShowCreateGroup(false);
          setActiveTab('chats');
        }}
      />

      <FriendProfileModal
        isOpen={!!profileTarget}
        friend={profileTarget}
        onClose={() => setProfileTarget(null)}
        onStartChat={async (friend) => {
          if (!userProfile) return;
          try {
            const chatId = await getOrCreatePrivateChat(userProfile, friend);
            const chatSnap = await getDoc(doc(db, 'chats', chatId));
            if (chatSnap.exists()) {
              setActiveChat({ id: chatSnap.id, ...chatSnap.data() } as Chat);
              setActiveTab('chats');
            }
          } catch (e) {
            console.error('Error starting chat from profile modal:', e);
          }
        }}
        onOpenUnfriend={(friend) => {
          setProfileTarget(null);
          setUnfriendTarget(friend);
        }}
        isFriend={true}
      />

      <GroupDetailsModal
        isOpen={!!groupDetailsTarget}
        chat={groupDetailsTarget}
        onClose={() => setGroupDetailsTarget(null)}
      />

      <UserQRCodeModal
        isOpen={showUserQr}
        onClose={() => setShowUserQr(false)}
      />

      <DownloadApkModal
        isOpen={showDownloadApk}
        onClose={() => setShowDownloadApk(false)}
      />

      <ApkPermissionModal
        isOpen={showApkPermissions}
        onClose={() => setShowApkPermissions(false)}
      />

      <AndroidPushNotificationBanner
        onNavigateToChat={(chatId) => {
          setActiveTab('chats');
        }}
      />
    </div>
  );
};

