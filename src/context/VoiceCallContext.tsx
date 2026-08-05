import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { VoiceCallModal, ActiveVoiceCall } from '../components/voice/VoiceCallModal';

interface VoiceCallContextType {
  activeCall: ActiveVoiceCall | null;
  startVoiceCall: (targetUserId: string, targetUserName: string, targetUserAvatar?: string, chatId?: string) => Promise<void>;
  endActiveCall: () => void;
}

const VoiceCallContext = createContext<VoiceCallContextType>({
  activeCall: null,
  startVoiceCall: async () => {},
  endActiveCall: () => {}
});

export const VoiceCallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile } = useAuth();
  const [activeCall, setActiveCall] = useState<ActiveVoiceCall | null>(null);

  // Listen for incoming voice calls in real time
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
        setActiveCall({
          id: docSnap.id,
          callerId: data.callerId,
          callerName: data.callerName || 'Friend',
          callerAvatar: data.callerAvatar || '',
          receiverId: data.receiverId,
          receiverName: data.receiverName || userProfile.displayName || 'Me',
          receiverAvatar: data.receiverAvatar || userProfile.photoURL || '',
          chatId: data.chatId || '',
          status: 'calling',
          createdAtMs: data.createdAtMs || Date.now()
        });
      }
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

  const endActiveCall = () => {
    setActiveCall(null);
  };

  return (
    <VoiceCallContext.Provider value={{ activeCall, startVoiceCall, endActiveCall }}>
      {children}
      {activeCall && (
        <VoiceCallModal
          call={activeCall}
          onEndCall={endActiveCall}
        />
      )}
    </VoiceCallContext.Provider>
  );
};

export const useVoiceCall = () => useContext(VoiceCallContext);
