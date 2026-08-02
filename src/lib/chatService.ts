import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  getDoc,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import { Chat, Message, UserProfile } from '../types';
import { sanitizePhotoURL } from './imageUtils';
import { playSendMessageSound } from './audio';


export async function getOrCreatePrivateChat(user1: UserProfile, user2: UserProfile): Promise<string> {
  const chatsRef = collection(db, 'chats');
  const q = query(
    chatsRef, 
    where('type', '==', 'private'), 
    where('members', 'array-contains', user1.uid)
  );

  const snapshot = await getDocs(q);
  let existingChatId: string | null = null;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.members.includes(user2.uid)) {
      existingChatId = docSnap.id;
    }
  });

  if (existingChatId) {
    return existingChatId;
  }

  // Create new private chat
  const photo1 = await sanitizePhotoURL(user1.photoURL);
  const photo2 = await sanitizePhotoURL(user2.photoURL);

  const newChatData: Omit<Chat, 'id'> = {
    type: 'private',
    members: [user1.uid, user2.uid],
    memberDetails: {
      [user1.uid]: {
        uid: user1.uid,
        fullName: user1.fullName,
        username: user1.username,
        photoURL: photo1
      },
      [user2.uid]: {
        uid: user2.uid,
        fullName: user2.fullName,
        username: user2.username,
        photoURL: photo2
      }
    },
    unreadCounts: {
      [user1.uid]: 0,
      [user2.uid]: 0
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, 'chats'), newChatData);
  return docRef.id;
}

export async function createGroupChat(
  creator: UserProfile, 
  selectedFriends: UserProfile[], 
  groupName: string, 
  photoURL?: string,
  description?: string
): Promise<string> {
  const members = [creator.uid, ...selectedFriends.map(f => f.uid)];
  const memberDetails: Record<string, any> = {
    [creator.uid]: {
      uid: creator.uid,
      fullName: creator.fullName,
      username: creator.username,
      photoURL: creator.photoURL || ''
    }
  };

  const unreadCounts: Record<string, number> = {
    [creator.uid]: 0
  };

  selectedFriends.forEach(f => {
    memberDetails[f.uid] = {
      uid: f.uid,
      fullName: f.fullName,
      username: f.username,
      photoURL: f.photoURL || ''
    };
    unreadCounts[f.uid] = 0;
  });

  const groupData: Omit<Chat, 'id'> = {
    type: 'group',
    name: groupName,
    photoURL: photoURL || '',
    description: description || 'Private group chat on TheRoom',
    ownerId: creator.uid,
    members,
    memberDetails,
    unreadCounts,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, 'chats'), groupData);
  return docRef.id;
}

export async function sendMessage(
  chatId: string, 
  sender: UserProfile, 
  text: string, 
  mediaUrl?: string, 
  replyTo?: Message['replyTo'],
  disappearingDuration?: number,
  scheduledFor?: number
): Promise<string> {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const now = Date.now();
  
  let expiresAt: number | null = null;
  if (disappearingDuration && disappearingDuration > 0) {
    if (scheduledFor && scheduledFor > now) {
      expiresAt = scheduledFor + (disappearingDuration * 1000);
    } else {
      expiresAt = now + (disappearingDuration * 1000);
    }
  }

  const msgData = {
    chatId: chatId || '',
    senderId: sender.uid,
    senderName: sender.fullName || sender.username || 'User',
    senderPhoto: sender.photoURL || '',
    text: (text || '').trim(),
    mediaUrl: mediaUrl || '',
    mediaType: mediaUrl ? 'image' : null,
    replyTo: replyTo ? {
      id: replyTo.id || '',
      text: replyTo.text || '',
      senderName: replyTo.senderName || ''
    } : null,
    deliveredTo: [sender.uid],
    readBy: [sender.uid],
    createdAt: serverTimestamp(),
    isDeleted: false,
    deleteType: null,
    deletedFor: [],
    ...(disappearingDuration ? { disappearingDuration } : {}),
    ...(expiresAt ? { expiresAt } : {}),
    ...(scheduledFor ? { scheduledFor } : {})
  };

  const docRef = await addDoc(messagesRef, msgData);

  // Play send sound
  playSendMessageSound();

  // Update chat metadata & unread counts
  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    
    if (chatSnap.exists()) {
      const chat = chatSnap.data() as Chat;
      const currentUnreads = chat.unreadCounts || {};
      const updatedUnreads: Record<string, number> = { ...currentUnreads };

      if (Array.isArray(chat.members)) {
        const notifExpiresAt = Date.now() + 20000;
        for (const mId of chat.members) {
          if (mId && mId !== sender.uid) {
            updatedUnreads[mId] = (updatedUnreads[mId] || 0) + 1;
            addDoc(collection(db, 'notifications'), {
              userId: mId,
              type: 'new_message',
              title: `Signal from ${sender.fullName || sender.username || 'User'}`,
              body: (text || '').trim() || (mediaUrl ? '📷 Sent a photo' : 'New message received'),
              read: false,
              createdAt: serverTimestamp(),
              autoHideExpiresAt: notifExpiresAt,
              chatId: chatId
            }).catch((err) => console.warn('Notice creating message notification:', err));
          }
        }
      }

      await setDoc(chatRef, {
        lastMessage: (text || '').trim() || (mediaUrl ? '📷 Photo' : ''),
        lastMessageSenderId: sender.uid,
        lastMessageTime: serverTimestamp(),
        unreadCounts: updatedUnreads,
        updatedAt: serverTimestamp()
      }, { merge: true }).catch((err) => console.warn('Notice updating chat lastMessage:', err));
    } else {
      await setDoc(chatRef, {
        id: chatId,
        type: 'private',
        members: [sender.uid],
        lastMessage: (text || '').trim() || (mediaUrl ? '📷 Photo' : ''),
        lastMessageSenderId: sender.uid,
        lastMessageTime: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true }).catch((err) => console.warn('Notice recreating chat doc:', err));
    }
  } catch (err) {
    console.warn('Notice in chat metadata update:', err);
  }

  return docRef.id;
}

export async function markChatAsRead(chatId: string, userId: string): Promise<void> {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    
    if (chatSnap.exists()) {
      const chat = chatSnap.data() as Chat;
      const currentUnreads = chat.unreadCounts || {};
      
      if (currentUnreads[userId] && currentUnreads[userId] > 0) {
        await setDoc(chatRef, {
          [`unreadCounts.${userId}`]: 0
        }, { merge: true }).catch(() => {});
      }
    }
  } catch (e) {
    console.warn('Notice in markChatAsRead:', e);
  }
}

export async function markMessageRead(chatId: string, messageId: string, userId: string): Promise<void> {
  try {
    const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
    await updateDoc(msgRef, {
      readBy: arrayUnion(userId),
      deliveredTo: arrayUnion(userId)
    }).catch(() => {});
  } catch (e) {
    console.warn('Notice in markMessageRead:', e);
  }
}

export async function setTypingState(chatId: string, userId: string, isTyping: boolean): Promise<void> {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await setDoc(chatRef, {
      [`typing.${userId}`]: isTyping
    }, { merge: true }).catch(() => {});
  } catch (e) {
    console.warn('Notice in setTypingState:', e);
  }
}

export async function deleteMessageForEveryone(chatId: string, messageId: string): Promise<void> {
  try {
    const now = Date.now();
    const deletedExpiresAt = now + 30000; // 30 seconds expiration

    const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
    await updateDoc(msgRef, {
      text: 'This message was deleted',
      isDeleted: true,
      deleteType: 'forEveryone',
      mediaUrl: '',
      deletedAt: now,
      deletedExpiresAt: deletedExpiresAt,
      editedAt: serverTimestamp()
    }).catch(() => {});

    // Update parent chat doc so active conversation list reflects the deletion and timer
    const chatRef = doc(db, 'chats', chatId);
    await setDoc(chatRef, {
      lastMessage: 'This message was deleted',
      lastMessageDeletedAt: now,
      lastMessageDeletedExpiresAt: deletedExpiresAt,
      unreadCounts: {},
      updatedAt: serverTimestamp()
    }, { merge: true }).catch(() => {});
  } catch (e) {
    console.warn('Notice in deleteMessageForEveryone:', e);
  }
}

export async function deleteMessageForSelf(chatId: string, messageId: string, userId: string): Promise<void> {
  try {
    const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
    await updateDoc(msgRef, {
      deletedFor: arrayUnion(userId)
    }).catch(() => {});
  } catch (e) {
    console.warn('Notice in deleteMessageForSelf:', e);
  }
}

export async function togglePinMessage(chatId: string, messageId: string, isPinned: boolean): Promise<void> {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      pinnedMessageIds: isPinned ? arrayUnion(messageId) : arrayRemove(messageId)
    }).catch(() => {});
  } catch (e) {
    console.warn('Notice in togglePinMessage:', e);
  }
}

export async function leaveGroupChat(chatId: string, userId: string): Promise<void> {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      members: arrayRemove(userId)
    }).catch(() => {});
  } catch (e) {
    console.warn('Notice in leaveGroupChat:', e);
  }
}

export async function removeGroupMember(chatId: string, memberId: string): Promise<void> {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      members: arrayRemove(memberId)
    }).catch(() => {});
  } catch (e) {
    console.warn('Notice in removeGroupMember:', e);
  }
}

export async function transferGroupOwnership(chatId: string, newOwnerId: string): Promise<void> {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      ownerId: newOwnerId
    }).catch(() => {});
  } catch (e) {
    console.warn('Notice in transferGroupOwnership:', e);
  }
}

/**
  * Completely deletes a chat and its messages by ID.
  */
export async function deleteChatById(chatId: string): Promise<void> {
  if (!chatId) return;
  try {
    const msgRef = collection(db, 'chats', chatId, 'messages');
    const msgSnap = await getDocs(msgRef);
    for (const mDoc of msgSnap.docs) {
      await deleteDoc(doc(db, 'chats', chatId, 'messages', mDoc.id)).catch(() => {});
    }
    await deleteDoc(doc(db, 'chats', chatId)).catch(() => {});
  } catch (err) {
    console.warn('Error deleting chat by ID:', err);
  }
}

/**
  * Completely deletes any direct/private chat and message subcollections between two users when unfriended.
  */
export async function deletePrivateChatBetweenUsers(uid1: string, uid2: string): Promise<void> {
  if (!uid1 || !uid2) return;
  try {
    const chatsRef = collection(db, 'chats');
    const q1 = query(chatsRef, where('type', '==', 'private'), where('members', 'array-contains', uid1));
    const snap1 = await getDocs(q1);
    
    for (const d of snap1.docs) {
      const data = d.data();
      if (Array.isArray(data.members) && data.members.includes(uid2)) {
        const chatId = d.id;
        // Delete all messages in the chat subcollection
        try {
          const msgRef = collection(db, 'chats', chatId, 'messages');
          const msgSnap = await getDocs(msgRef);
          for (const mDoc of msgSnap.docs) {
            await deleteDoc(doc(db, 'chats', chatId, 'messages', mDoc.id)).catch(() => {});
          }
        } catch (err) {
          console.warn('Error deleting messages subcollection:', err);
        }

        // Delete the main chat document
        await deleteDoc(doc(db, 'chats', chatId)).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('Error deleting private chat between users on unfriend:', err);
  }
}

