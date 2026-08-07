import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { AppNotification } from '../types';
import { playNotificationSound, playBellSound } from '../lib/audio';

export const triggerOSNotification = (title: string, body: string) => {
  try {
    const cleanTitle = title || 'TheRoom Signal';
    const cleanBody = body || 'New encrypted message received';

    // 1. Capacitor LocalNotifications (Android APK Native System Drawer)
    if (typeof window !== 'undefined' && (window as any).Capacitor?.Plugins?.LocalNotifications) {
      const LocalNotifications = (window as any).Capacitor.Plugins.LocalNotifications;
      if (LocalNotifications.createChannel) {
        LocalNotifications.createChannel({
          id: 'theroom_messages',
          name: 'TheRoom Messages',
          description: 'Encrypted message alerts',
          importance: 5,
          visibility: 1,
          vibration: true,
          sound: 'glitch_alert.wav'
        }).catch(() => {});
      }

      LocalNotifications.checkPermissions().then((res: any) => {
        if (res?.display !== 'granted') {
          return LocalNotifications.requestPermissions();
        }
        return res;
      }).then(() => {
        LocalNotifications.schedule({
          notifications: [{
            title: cleanTitle,
            body: cleanBody,
            id: Math.floor(Math.random() * 1000000),
            schedule: { at: new Date(Date.now() + 100) },
            channelId: 'theroom_messages',
            actionTypeId: 'OPEN_APP'
          }]
        }).catch((err: any) => console.warn('Capacitor LocalNotification schedule error:', err));
      }).catch(() => {});
    }

    // 2. Service Worker Notification (Android OS Notification Drawer & OS Desktop Notifications)
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        if (reg && typeof reg.showNotification === 'function') {
          reg.showNotification(cleanTitle, {
            body: cleanBody,
            icon: '/logos/icon-192.png',
            badge: '/logos/icon-192.png',
            vibrate: [200, 100, 200],
            tag: 'theroom-msg-' + Date.now(),
            renotify: true,
            data: { url: '/' }
          } as any).catch((err) => console.warn('SW showNotification error:', err));
        }
      }).catch(() => {});

      // Backup: PostMessage to Service Worker controller
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title: cleanTitle,
          body: cleanBody,
          icon: '/logos/icon-192.png',
          badge: '/logos/icon-192.png',
          tag: 'theroom-msg-' + Date.now()
        });
      }
    }

    // 3. Fallback Standard Web Notification API
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(cleanTitle, {
          body: cleanBody,
          icon: '/logos/icon-192.png',
          badge: '/logos/icon-192.png',
          tag: 'theroom-notif-' + Date.now(),
          silent: false
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (e) {
        // Ignored if browser requires Service Worker (Android Chrome)
      }
    }
  } catch (err) {
    console.warn('Notice in triggerOSNotification:', err);
  }
};

export const triggerOSCallNotification = (callerName: string) => {
  try {
    const name = callerName || 'Someone';
    const title = '📞 INCOMING VOICE CALL';
    const body = `${name} is calling you on TheRoom! Tap to view full screen UI.`;

    // 1. Capacitor Native Android Calls High Priority Channel
    if (typeof window !== 'undefined' && (window as any).Capacitor?.Plugins?.LocalNotifications) {
      const LN = (window as any).Capacitor.Plugins.LocalNotifications;
      if (LN.createChannel) {
        LN.createChannel({
          id: 'theroom_calls',
          name: 'TheRoom Incoming Calls',
          description: 'High priority incoming call alerts and full screen UI',
          importance: 5,
          visibility: 1,
          vibration: true,
          sound: 'call_ringtone.mp3'
        }).catch(() => {});
      }

      LN.checkPermissions().then((res: any) => {
        if (res?.display !== 'granted') {
          return LN.requestPermissions();
        }
        return res;
      }).then(() => {
        LN.schedule({
          notifications: [{
            title,
            body,
            id: 999999,
            schedule: { at: new Date(Date.now() + 50) },
            channelId: 'theroom_calls',
            actionTypeId: 'ANSWER_CALL',
            extra: { fullScreen: true }
          }]
        }).catch((err: any) => console.warn('Capacitor Call Notification error:', err));
      }).catch(() => {});
    }

    // 2. Service Worker High Priority Call Banner
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        if (reg && typeof reg.showNotification === 'function') {
          reg.showNotification(title, {
            body,
            icon: '/logos/icon-192.png',
            badge: '/logos/icon-192.png',
            vibrate: [500, 250, 500, 250, 500, 250, 500],
            tag: 'theroom-call-active',
            renotify: true,
            requireInteraction: true,
            data: { url: '/' }
          } as any).catch((err) => console.warn('SW Call showNotification error:', err));
        }
      }).catch(() => {});

      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_CALL_NOTIFICATION',
          callerName: name
        });
      }
    }
  } catch (err) {
    console.warn('Notice in triggerOSCallNotification:', err);
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

  // Register ServiceWorker for Android OS System Drawer & Web Notifications + Capacitor Native Channels
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('Service Worker registered for OS System Notifications:', reg.scope);
      }).catch((err) => {
        console.warn('Service Worker registration notice:', err);
      });
    }

    if (typeof window !== 'undefined') {
      // 1. Capacitor Native Android Permissions & Channel Setup
      if ((window as any).Capacitor?.Plugins?.LocalNotifications) {
        const LN = (window as any).Capacitor.Plugins.LocalNotifications;
        LN.checkPermissions().then((res: any) => {
          if (res?.display !== 'granted') {
            LN.requestPermissions().catch(() => {});
          }
        }).catch(() => {
          LN.requestPermissions().catch(() => {});
        });

        if (LN.createChannel) {
          LN.createChannel({
            id: 'theroom_messages',
            name: 'TheRoom Messages',
            description: 'Encrypted message alerts',
            importance: 5,
            visibility: 1,
            vibration: true,
            sound: 'glitch_alert.wav'
          }).catch(() => {});
        }
      }

      // 2. Browser & Android WebView Notification Permission Request on Touch
      if ('Notification' in window && Notification.permission === 'default') {
        const askPermission = () => {
          Notification.requestPermission().catch(() => {});
          window.removeEventListener('click', askPermission);
          window.removeEventListener('touchstart', askPermission);
        };
        window.addEventListener('click', askPermission, { once: true });
        window.addEventListener('touchstart', askPermission, { once: true });
      }
    }
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
