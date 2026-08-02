import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useMatrixTransition } from '../../context/MatrixTransitionContext';
import { getOrCreatePrivateChat } from '../../lib/chatService';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { AddFriendModal } from '../friends/AddFriendModal';
import { FriendRequestsModal } from '../friends/FriendRequestsModal';
import { UnfriendModal } from '../friends/UnfriendModal';
import { CreateGroupModal } from '../chat/CreateGroupModal';
import { FriendProfileModal } from '../friends/FriendProfileModal';
import { GroupDetailsModal } from '../chat/GroupDetailsModal';
import { ChatsList } from '../chat/ChatsList';
import { ChatView } from '../chat/ChatView';
import { FriendList } from '../friends/FriendList';
import { NotificationsPage } from '../../pages/NotificationsPage';
import { SettingsPage } from '../../pages/SettingsPage';
import { AdminDashboard } from '../../pages/AdminDashboard';
import { Chat, UserProfile } from '../../types';
import { MessageSquare } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { userProfile } = useAuth();
  const { triggerMatrixTransition } = useMatrixTransition();
  const [activeTab, setActiveTab] = useState<string>('chats');
  const [activeChat, setActiveChat] = useState<Chat | null>(null);

  // Modals state
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [unfriendTarget, setUnfriendTarget] = useState<UserProfile | null>(null);
  const [profileTarget, setProfileTarget] = useState<UserProfile | null>(null);
  const [groupDetailsTarget, setGroupDetailsTarget] = useState<Chat | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
    });
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
    <div className="h-dvh w-full bg-[#fbfaf6] flex flex-col overflow-hidden text-black font-sans transition-colors">
      {/* Navbar */}
      <Navbar
        onOpenAddFriend={handleOpenAddFriend}
        onOpenRequests={handleOpenRequests}
        onToggleSidebarMobile={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        pendingRequestsCount={pendingRequestsCount}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative bg-[#fbfaf6]">
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
        <main className="flex-1 flex overflow-hidden min-w-0 bg-[#fbfaf6]">
          {activeTab === 'chats' && (
            <div className="flex-1 flex h-full overflow-hidden w-full bg-[#fbfaf6]">
              {/* Chats List Column */}
              <div className={`h-full w-full lg:w-80 border-r border-[#e2dfd2] shrink-0 ${activeChat ? 'hidden lg:block' : 'block'}`}>
                <ChatsList
                  activeChatId={activeChat?.id || null}
                  onSelectChat={handleSelectChat}
                  onOpenCreateGroup={() => setShowCreateGroup(true)}
                  onOpenAddFriend={() => setShowAddFriend(true)}
                />
              </div>

              {/* Chat Conversation Column */}
              <div className={`flex-1 h-full min-w-0 bg-[#fbfaf6] ${!activeChat ? 'hidden lg:flex' : 'flex'}`}>
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
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-600 space-y-3 bg-[#fbfaf6]">
                    <div className="w-16 h-16 rounded-3xl bg-white border border-[#e2dfd2] text-black flex items-center justify-center shadow-xs">
                      <MessageSquare className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-bold text-black text-sm uppercase tracking-wider">Select a Conversation</h3>
                      <p className="text-xs text-zinc-500 mt-1 max-w-xs">
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
    </div>
  );
};
