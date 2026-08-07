import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { VoiceCallModal, ActiveVoiceCall } from '../components/voice/VoiceCallModal';
import { GroupVoiceCallModal } from '../components/voice/GroupVoiceCallModal';
import { IncomingGroupCallModal } from '../components/voice/IncomingGroupCallModal';
import { triggerOSCallNotification } from './NotificationContext';
import { startCallRingtone, stopCallRingtone } from '../lib/audio';

export interface ActiveGroupCall {
  chatId: string;
  groupName: string;
  groupPhoto?: string;
  members?: string[];
  startedByName?: string;
}

interface VoiceCallContextType {
  activeCall: ActiveVoiceCall | null;
  activeGroupCall: ActiveGroupCall | null;
  startVoiceCall: (targetUserId: string, targetUserName: string, targetUserAvatar?: string, chatId?: string) => Promise<void>;
  joinGroupVoiceCall: (chatId: string, groupName: string, groupPhoto?: string, members?: string[]) => void;
  endActiveCall: () => void;
  leaveGroupVoiceCall: () => void;
}

const VoiceCallContext = createContext<VoiceCallContextType>({
  activeCall: null,
  activeGroupCall: null,
  startVoiceCall: async () => {},
  joinGroupVoiceCall: () => {},
  endActiveCall: () => {},
  leaveGroupVoiceCall: () => {}
});

export const VoiceCallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile } = useAuth();
  const [activeCall, setActiveCall] = useState<ActiveVoiceCall | null>(null);
  const [activeGroupCall, setActiveGroupCall] = useState<ActiveGroupCall | null>(null);
  
  // Track active incoming group calls across user's groups
  const [incomingGroupCalls, setIncomingGroupCalls] = useState<ActiveGroupCall[]>([]);
  const [ignoredGroupCalls, setIgnoredGroupCalls] = useState<string[]>([]);

  // Listen for incoming 1-on-1 voice calls in real time
  useEffect(() => {
    if (!userProfile?.uid) return;

    const q = query(
      collection(db, 'calls'),
      where('receiverId', '==', userProfile.uid),
      where('status', '==', 'calling')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const data = docSnap.data();
        const callerName = data.callerName || 'Friend';

        setActiveCall({
          id: docSnap.id,
          callerId: data.callerId,
          callerName,
          callerAvatar: data.callerAvatar || '',
          receiverId: data.receiverId,
          receiverName: data.receiverName || userProfile.displayName || 'Me',
          receiverAvatar: data.receiverAvatar || userProfile.photoURL || '',
          chatId: data.chatId || '',
          status: 'calling',
          createdAtMs: data.createdAtMs || Date.now()
        });

        // Trigger OS Call Drawer Notification & Ringtone if received from someone else
        if (data.callerId !== userProfile.uid) {
          triggerOSCallNotification(callerName);
          startCallRingtone();
        }
      } else {
        stopCallRingtone();
      }
    });

    return () => {
      unsub();
      stopCallRingtone();
    };
  }, [userProfile?.uid]);

  // Listen for active group calls in groups the user belongs to
  useEffect(() => {
    if (!userProfile?.uid) return;

    const q = query(
      collection(db, 'groupCalls'),
      where('status', '==', 'active'),
      where('members', 'array-contains', userProfile.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const activeList: ActiveGroupCall[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Ignore if user was the caller who started it less than 5s ago or if already in call
        activeList.push({
          chatId: docSnap.id,
          groupName: data.groupName || 'Group Chat',
          groupPhoto: data.groupPhoto || '',
          members: data.members || [],
          startedByName: data.startedByName || ''
        });
      });
      setIncomingGroupCalls(activeList);
    }, (err) => {
      console.warn('Group calls snapshot listener notice:', err);
    });

    return () => unsub();
  }, [userProfile?.uid]);

  const startVoiceCall = async (
    targetUserId: string,
    targetUserName: string,
    targetUserAvatar?: string,
    chatId?: string
  ) => {
    if (!userProfile?.uid || !targetUserId) return;

    try {
      const docRef = await addDoc(collection(db, 'calls'), {
        callerId: userProfile.uid,
        callerName: userProfile.displayName || userProfile.email?.split('@')[0] || 'User',
        callerAvatar: userProfile.photoURL || '',
        receiverId: targetUserId,
        receiverName: targetUserName,
        receiverAvatar: targetUserAvatar || '',
        chatId: chatId || '',
        status: 'calling',
        type: 'voice',
        createdAt: serverTimestamp(),
        createdAtMs: Date.now()
      });

      setActiveCall({
        id: docRef.id,
        callerId: userProfile.uid,
        callerName: userProfile.displayName || userProfile.email?.split('@')[0] || 'User',
        callerAvatar: userProfile.photoURL || '',
        receiverId: targetUserId,
        receiverName: targetUserName,
        receiverAvatar: targetUserAvatar || '',
        chatId: chatId || '',
        status: 'calling',
        createdAtMs: Date.now()
      });
    } catch (e) {
      console.error('Error starting voice call:', e);
    }
  };

  const joinGroupVoiceCall = (chatId: string, groupName: string, groupPhoto?: string, members?: string[]) => {
    setActiveGroupCall({ chatId, groupName, groupPhoto, members });
  };

  const endActiveCall = () => {
    setActiveCall(null);
  };

  const leaveGroupVoiceCall = () => {
    setActiveGroupCall(null);
  };

  // Determine if there is an unhandled incoming group call popup to show
  const pendingIncomingGroupCall = incomingGroupCalls.find(
    (call) => call.chatId !== activeGroupCall?.chatId && !ignoredGroupCalls.includes(call.chatId)
  );

  return (
    <VoiceCallContext.Provider
      value={{
        activeCall,
        activeGroupCall,
        startVoiceCall,
        joinGroupVoiceCall,
        endActiveCall,
        leaveGroupVoiceCall
      }}
    >
      {children}
      {activeCall && (
        <VoiceCallModal
          call={activeCall}
          onEndCall={endActiveCall}
        />
      )}
      {activeGroupCall && (
        <GroupVoiceCallModal
          chatId={activeGroupCall.chatId}
          groupName={activeGroupCall.groupName}
          groupPhoto={activeGroupCall.groupPhoto}
          members={activeGroupCall.members}
          onClose={leaveGroupVoiceCall}
        />
      )}
      {pendingIncomingGroupCall && !activeGroupCall && (
        <IncomingGroupCallModal
          groupName={pendingIncomingGroupCall.groupName}
          groupPhoto={pendingIncomingGroupCall.groupPhoto}
          startedByName={pendingIncomingGroupCall.startedByName}
          onJoin={() => {
            joinGroupVoiceCall(
              pendingIncomingGroupCall.chatId,
              pendingIncomingGroupCall.groupName,
              pendingIncomingGroupCall.groupPhoto,
              pendingIncomingGroupCall.members
            );
          }}
          onDecline={() => {
            setIgnoredGroupCalls((prev) => [...prev, pendingIncomingGroupCall.chatId]);
          }}
        />
      )}
    </VoiceCallContext.Provider>
  );
};

export const useVoiceCall = () => useContext(VoiceCallContext);


