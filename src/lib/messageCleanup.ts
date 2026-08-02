import { collection, query, where, getDocs, writeBatch, Timestamp, doc, setDoc, onSnapshot, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Message } from '../types';

export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface SystemSettings {
  scheduledMessageWipeAt?: number | null;
  lastWipedAt?: number | null;
  scheduledBy?: string | null;
}

export function isMessageExpired(message: Message): boolean {
  if (!message.createdAt) return false;
  const createdMs = message.createdAt.toMillis
    ? message.createdAt.toMillis()
    : new Date(message.createdAt).getTime();
  
  if (isNaN(createdMs)) return false;
  return Date.now() - createdMs > SEVEN_DAYS_MS;
}

export function filterValidMessages(messages: Message[]): Message[] {
  return messages.filter((msg) => !isMessageExpired(msg));
}

/**
 * Safely purges messages older than 7 days from Firestore for a given chat.
 */
export async function purgeExpiredMessagesForChat(chatId: string): Promise<number> {
  try {
    const cutoffDate = new Date(Date.now() - SEVEN_DAYS_MS);
    const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, where('createdAt', '<=', cutoffTimestamp));
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return 0;

    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => {
      batch.delete(doc(db, 'chats', chatId, 'messages', d.id));
    });

    await batch.commit();
    return snapshot.size;
  } catch (error) {
    console.warn(`Message cleanup error for chat ${chatId}:`, error);
    return 0;
  }
}

/**
 * ADMIN ONLY: Immediately wipes ALL chat and message history for every registered user.
 * Preserves user accounts, profiles, friend lists, and chat groups/rooms intact.
 */
export async function wipeAllChatMessages(): Promise<{ deletedMessagesCount: number; chatsResetCount: number }> {
  try {
    const chatsSnap = await getDocs(collection(db, 'chats'));
    let totalMessagesDeleted = 0;
    let chatsReset = 0;

    for (const chatDoc of chatsSnap.docs) {
      const chatId = chatDoc.id;
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const messagesSnap = await getDocs(messagesRef);

      if (!messagesSnap.empty) {
        // Chunk batch deletes (Firestore max 500 operations per batch)
        const docs = messagesSnap.docs;
        for (let i = 0; i < docs.length; i += 450) {
          const chunk = docs.slice(i, i + 450);
          const batch = writeBatch(db);
          chunk.forEach((mDoc) => {
            batch.delete(doc(db, 'chats', chatId, 'messages', mDoc.id));
          });
          await batch.commit();
        }
        totalMessagesDeleted += messagesSnap.size;
      }

      // Reset last message metadata on the chat room
      const chatRef = doc(db, 'chats', chatId);
      await setDoc(chatRef, {
        lastMessage: '',
        lastMessageSenderId: '',
        lastMessageTime: null,
        unreadCounts: {}
      }, { merge: true });

      chatsReset++;
    }

    // Update system record with last wiped timestamp and reset scheduled wipe
    await setDoc(doc(db, 'system', 'settings'), {
      lastWipedAt: Date.now(),
      scheduledMessageWipeAt: null,
      scheduledBy: null,
      updatedAt: serverTimestamp()
    }, { merge: true });

    return { deletedMessagesCount: totalMessagesDeleted, chatsResetCount: chatsReset };
  } catch (error) {
    console.error('Error executing global message wipe:', error);
    throw error;
  }
}

/**
 * ADMIN ONLY: Schedule a future message wipe at a specific date & time (timestamp in MS).
 */
export async function scheduleMessageWipe(scheduledTimestampMs: number, adminEmail?: string): Promise<void> {
  await setDoc(doc(db, 'system', 'settings'), {
    scheduledMessageWipeAt: scheduledTimestampMs,
    scheduledBy: adminEmail || 'Admin',
    updatedAt: serverTimestamp()
  }, { merge: true });
}

/**
 * ADMIN ONLY: Cancel any active scheduled message wipe.
 */
export async function cancelScheduledMessageWipe(): Promise<void> {
  await setDoc(doc(db, 'system', 'settings'), {
    scheduledMessageWipeAt: null,
    scheduledBy: null,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

/**
 * Subscribe to real-time system settings and automatically execute scheduled wipes if due.
 */
export function subscribeSystemSettings(onChange: (settings: SystemSettings) => void) {
  const sysRef = doc(db, 'system', 'settings');
  return onSnapshot(sysRef, async (snapshot) => {
    if (!snapshot.exists()) {
      onChange({});
      return;
    }

    const data = snapshot.data() as SystemSettings;
    onChange(data);

    // If a scheduled wipe time has arrived, execute the wipe automatically
    if (data.scheduledMessageWipeAt && Date.now() >= data.scheduledMessageWipeAt) {
      console.log('Scheduled chat message wipe time arrived! Executing global wipe now...');
      try {
        await wipeAllChatMessages();
      } catch (err) {
        console.error('Failed auto scheduled wipe:', err);
      }
    }
  }, (err) => {
    console.warn('System settings snapshot listener warning:', err);
  });
}

