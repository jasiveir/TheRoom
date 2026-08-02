import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, Chat } from '../../types';
import { Search, MessageSquare, UserX, Users, Hash, Clock } from 'lucide-react';
import { getOrCreatePrivateChat } from '../../lib/chatService';

interface FriendListProps {
  onStartChatWithFriend: (chat: Chat) => void;
  onOpenUnfriend: (friend: UserProfile) => void;
  onOpenProfile: (friend: UserProfile) => void;
}

export const FriendList: React.FC<FriendListProps> = ({
  onStartChatWithFriend,
  onOpenUnfriend,
  onOpenProfile
}) => {
  const { userProfile } = useAuth();
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-heal check for accepted friend requests missing friendship records
  useEffect(() => {
    if (!userProfile?.uid) return;

    const healAcceptedRequests = async () => {
      try {
        const reqsRef = collection(db, 'friendRequests');
        const qSender = query(reqsRef, where('senderId', '==', userProfile.uid), where('status', '==', 'accepted'));
        const qReceiver = query(reqsRef, where('receiverId', '==', userProfile.uid), where('status', '==', 'accepted'));

        const [snapSender, snapReceiver] = await Promise.all([
          getDocs(qSender).catch(() => null),
          getDocs(qReceiver).catch(() => null)
        ]);

        const allDocs = [
          ...(snapSender?.docs || []),
          ...(snapReceiver?.docs || [])
        ];

        for (const reqDoc of allDocs) {
          const data = reqDoc.data();
          const senderId = data.senderId || data.senderProfile?.uid;
          const receiverId = data.receiverId || data.receiverProfile?.uid;
          if (senderId && receiverId) {
            const friendshipId = [senderId, receiverId].sort().join('_');
            const friendshipRef = doc(db, 'friendships', friendshipId);
            const fSnap = await getDoc(friendshipRef);
            if (!fSnap.exists()) {
              console.log('Auto-healing missing friendship doc:', friendshipId);
              await setDoc(friendshipRef, {
                id: friendshipId,
                users: [senderId, receiverId],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              }, { merge: true });
            }
          }
        }
      } catch (err) {
        console.warn('Friendship auto-heal notice:', err);
      }
    };

    healAcceptedRequests();
  }, [userProfile?.uid]);

  useEffect(() => {
    if (!userProfile?.uid) return;

    setLoading(true);
    // Listen to user's friendships
    const q = query(
      collection(db, 'friendships'),
      where('users', 'array-contains', userProfile.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const friendUids: string[] = [];
      snapshot.docs.forEach((docSnap) => {
        const uArray = docSnap.data().users as string[];
        if (Array.isArray(uArray)) {
          const other = uArray.find((id) => id !== userProfile.uid);
          if (other) friendUids.push(other);
        }
      });

      if (friendUids.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }

      // Fetch profiles safely
      const list: UserProfile[] = [];
      for (const fUid of friendUids) {
        try {
          const uDoc = await getDoc(doc(db, 'users', fUid));
          if (uDoc.exists()) {
            list.push({ uid: uDoc.id, ...uDoc.data() } as UserProfile);
          } else {
            // Fallback query by uid field
            const qUser = query(collection(db, 'users'), where('uid', '==', fUid));
            const uSnap = await getDocs(qUser);
            if (!uSnap.empty) {
              list.push({ uid: uSnap.docs[0].id, ...uSnap.docs[0].data() } as UserProfile);
            }
          }
        } catch (err) {
          console.warn(`Error fetching friend profile ${fUid}:`, err);
        }
      }

      // Default alphabetical sort safely
      list.sort((a, b) => (a.fullName || a.username || '').localeCompare(b.fullName || b.username || ''));
      setFriends(list);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching friend list:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile?.uid]);

  /**
   * STRICT RULE:
   * Username search filters ONLY the existing Friend List.
   */
  const filteredFriends = searchQuery.trim()
    ? friends.filter((f) => 
        (f.username || '').toLowerCase().includes(searchQuery.toLowerCase().trim()) || 
        (f.fullName || '').toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : friends;

  const handleStartChat = async (friend: UserProfile) => {
    if (!userProfile) return;
    try {
      const chatId = await getOrCreatePrivateChat(userProfile, friend);
      const chatSnap = await getDoc(doc(db, 'chats', chatId));
      if (chatSnap.exists()) {
        const fullChat = { id: chatSnap.id, ...chatSnap.data() } as Chat;
        onStartChatWithFriend(fullChat);
      }
    } catch (e) {
      console.error('Error starting chat:', e);
    }
  };

  const formatLastSeen = (ts: any) => {
    if (!ts) return 'Unknown';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-black p-4 sm:p-6 overflow-y-auto">
      {/* Header & Search */}
      <div className="mb-6 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-white" />
            <span>My Friends List</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real friends connected via unique Friend Codes
          </p>
        </div>

        {/* Username Search Filter WITHIN Friend List */}
        <div className="relative max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your friends by username..."
            className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-white shadow-xs"
          />
          <Search className="w-4 h-4 text-white absolute left-3 top-3 pointer-events-none" />
        </div>
      </div>

      {/* Friends Grid / List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <span className="animate-spin rounded-full h-8 w-8 border-3 border-white border-t-transparent" />
        </div>
      ) : filteredFriends.length === 0 ? (
        <div className="text-center py-12 px-4 bg-zinc-900 rounded-2xl border border-zinc-800">
          <Users className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="font-bold text-white text-sm">
            {searchQuery ? 'No matching friends found' : 'Your Friend List is empty'}
          </h3>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1">
            {searchQuery
              ? 'Try searching with a different username keyword from your friend list.'
              : 'Add friends by exchanging unique Friend Codes in person or through trusted messaging.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredFriends.map((friend) => (
            <div
              key={friend.uid}
              className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xs hover:border-zinc-600 transition-all flex flex-col justify-between space-y-3"
            >
              <div 
                onClick={() => onOpenProfile(friend)}
                className="flex items-start gap-3 cursor-pointer"
              >
                <div className="relative shrink-0">
                  {friend.photoURL ? (
                    <img
                      src={friend.photoURL}
                      alt={friend.fullName || friend.username || 'User'}
                      className="w-12 h-12 rounded-full object-cover border border-zinc-700"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-white text-black font-bold text-lg flex items-center justify-center">
                      {(friend.fullName?.[0] || friend.username?.[0] || 'U').toUpperCase()}
                    </div>
                  )}
                  <span
                    className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-zinc-900 ${
                      friend.status === 'online' ? 'bg-white ring-1 ring-zinc-500' : 'bg-zinc-600'
                    }`}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-white text-sm truncate">
                    {friend.fullName || friend.username}
                  </h3>
                  <p className="text-xs text-zinc-400 truncate">
                    @{friend.username}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-300 font-mono mt-1">
                    <Hash className="w-3 h-3 text-zinc-500" />
                    <span>{friend.friendCode}</span>
                  </div>
                </div>
              </div>

              {/* Status / Last Seen */}
              <div className="text-[11px] text-zinc-500 flex items-center gap-1 border-t border-zinc-800/80 pt-2">
                <Clock className="w-3 h-3 text-zinc-500" />
                <span>
                  {friend.status === 'online' ? 'Active now' : `Last seen ${formatLastSeen(friend.lastSeen)}`}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => handleStartChat(friend)}
                  className="flex-1 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Message</span>
                </button>

                <button
                  onClick={() => onOpenUnfriend(friend)}
                  className="p-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white rounded-xl transition-colors border border-zinc-700"
                  title="Unfriend User"
                >
                  <UserX className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
