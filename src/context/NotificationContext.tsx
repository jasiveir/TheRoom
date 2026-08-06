import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { AppNotification } from '../types';
import { playNotificationSound, playBellSound } from '../lib/audio';

export const triggerOSNotification = (title: string, body: string) => {
  try {
    // 1. Capacitor LocalNotifications (Android Native System Notification Drawer / APK)
    if (typeof window !== 'undefined' && (window as any).Capacitor?.Plugins?.LocalNotifications) {
      const LocalNotifications = (window as any).Capacitor.Plugins.LocalNotifications;
      LocalNotifications.requestPermissions().then(() => {
        LocalNotifications.schedule({
          notifications: [{
            title: title || 'TheRoom Signal',
            body: body || 'New encrypted message received',
            id: Math.floor(Math.random() * 1000000),
            schedule: { at: new Date(Date.now() + 100) },
            sound: 'glitch_alert.wav',
            smallIcon: 'ic_stat_icon_config_sample',
            actionTypeId: 'OPEN_APP'
          }]
        }).catch((err: any) => console.warn('Capacitor LocalNotification schedule error:', err));
      }).catch(() => {});
    }

    // 2. Standard Web Notification API (Browser / OS System Notifications)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        const notif = new Notification(title || 'TheRoom', {
          body: body || 'New message received',
          icon: '/logos/icon-192.png',
          badge: '/logos/icon-192.png',
          tag: 'theroom-notif-' + Date.now(),
          silent: false
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') {
            const notif = new Notification(title || 'TheRoom', {
              body: body || 'New message received',
              icon: '/logos/icon-192.png',
              badge: '/logos/icon-192.png',
              tag: 'theroom-notif-' + Date.now(),
              silent: false
            });
            notif.onclick = () => {
              window.focus();
              notif.close();
            };
          }
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('Notice in triggerOSNotification:', err);
  }
};

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

      // If new unread item added after initial snapshot, trigger sounds & OS background notifications
      if (!isInitialLoad) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const notifTitle = data.title || 'TheRoom Signal';
            const notifBody = data.body || 'New message received';

            if (data.type === 'new_message') {
              playBell();
            } else {
              playChime();
            }

            // Dispatch OS level notification preview
            triggerOSNotification(notifTitle, notifBody);
          }
        });
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
