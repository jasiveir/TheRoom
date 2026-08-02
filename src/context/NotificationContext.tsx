import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { AppNotification } from '../types';
import { playNotificationSound, playBellSound } from '../lib/audio';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteMultipleNotifications: (notificationIds: string[]) => Promise<void>;
  wipeAllNotifications: () => Promise<void>;
  playChime: () => void;
  playBell: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [nowTime, setNowTime] = useState<number>(Date.now());
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem('privatechat_sound_enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    localStorage.setItem('privatechat_sound_enabled', JSON.stringify(enabled));
  };

  const playChime = () => {
    if (soundEnabled) {
      playNotificationSound();
    }
  };

  const playBell = () => {
    if (soundEnabled) {
      playBellSound();
    }
  };

  // Timer interval to tick every 1 second for 20-second auto disappear
  useEffect(() => {
    const interval = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!userProfile?.uid) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userProfile.uid)
    );

    let isInitialLoad = true;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: AppNotification[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<AppNotification, 'id'>)
      }));

      // Sort by createdAt desc in memory safely
      list.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      // If new unread item added after initial snapshot, check type and play sound
      if (!isInitialLoad && snapshot.docChanges().some(change => change.type === 'added')) {
        const hasNewMessage = snapshot.docChanges().some(c => c.type === 'added' && c.doc.data().type === 'new_message');
        if (hasNewMessage) {
          playBell();
        } else {
          playChime();
        }
      }

      isInitialLoad = false;
      setNotifications(list);
    }, (err) => {
      console.warn('Notifications snapshot warning:', err);
    });

    return () => unsubscribe();
  }, [userProfile?.uid, soundEnabled]);

  // Filter out new_message notifications older than 20 seconds
  const activeNotifications = notifications.filter((n) => {
    if (n.type === 'new_message') {
      const autoHide = (n as any).autoHideExpiresAt;
      const createdMs = n.createdAt?.toMillis ? n.createdAt.toMillis() : (n.createdAt?.toDate ? n.createdAt.toDate().getTime() : 0);
      const expiresAt = autoHide || (createdMs > 0 ? createdMs + 20000 : 0);
      if (expiresAt > 0 && nowTime >= expiresAt) {
        return false;
      }
    }
    return true;
  });

  const unreadCount = activeNotifications.filter((n) => !n.read).length;

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
    } catch (e) {
      console.error('Error marking notification as read:', e);
    }
  };

  const markAllAsRead = async () => {
    if (!notifications.length) return;
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.read).forEach((n) => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (e) {
      console.error('Error marking all notifications as read:', e);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (e) {
      console.error('Error deleting notification:', e);
    }
  };

  const deleteMultipleNotifications = async (notificationIds: string[]) => {
    if (!notificationIds.length) return;
    try {
      const batch = writeBatch(db);
      notificationIds.forEach((id) => {
        batch.delete(doc(db, 'notifications', id));
      });
      await batch.commit();
    } catch (e) {
      console.error('Error deleting multiple notifications:', e);
    }
  };

  const wipeAllNotifications = async () => {
    if (!notifications.length) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        batch.delete(doc(db, 'notifications', n.id));
      });
      await batch.commit();
    } catch (e) {
      console.error('Error wiping all notifications:', e);
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications: activeNotifications,
      unreadCount,
      soundEnabled,
      setSoundEnabled,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      deleteMultipleNotifications,
      wipeAllNotifications,
      playChime,
      playBell
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
