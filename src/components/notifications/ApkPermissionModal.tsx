import React, { useEffect, useState } from 'react';
import { Bell, Volume2, Sparkles, Check, X, ShieldCheck, Radio } from 'lucide-react';
import { playGlitchNotificationSound } from '../../lib/audio';
import { isApkMode } from '../../lib/deviceUtils';

interface ApkPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkPermissionModal: React.FC<ApkPermissionModalProps> = ({ isOpen, onClose }) => {
  const [testedSound, setTestedSound] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setPermissionGranted(true);
      }
    }
  }, []);

  if (!isOpen) return null;

  const handleTestGlitchSound = () => {
    playGlitchNotificationSound();
    setTestedSound(true);
  };

  const handleGrantPermission = async () => {
    playGlitchNotificationSound();

    // 1. Capacitor Local Notifications permission request for Android APK
    if (typeof window !== 'undefined' && (window as any).Capacitor?.Plugins?.LocalNotifications) {
      try {
        await (window as any).Capacitor.Plugins.LocalNotifications.requestPermissions();
      } catch (e) {
        console.warn('Capacitor LocalNotifications request permission error:', e);
      }
    }

    // 2. Standard Web Notification request
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        if (res === 'granted') {
          setPermissionGranted(true);
          localStorage.setItem('apk_notification_permission_granted', 'true');
        }
      } catch (e) {
        console.warn('Notification permission request error:', e);
      }
    } else {
      localStorage.setItem('apk_notification_permission_granted', 'true');
      setPermissionGranted(true);
    }

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-zinc-950 text-white rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-2 border-zinc-800 p-6 relative overflow-hidden">
        {/* Background matrix glow accent */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-green-500/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-zinc-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-black border-2 border-green-500 flex items-center justify-center text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white uppercase tracking-wider">Device Ringing & Alerts</h2>
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase bg-green-500/20 text-green-400 border border-green-500/40 rounded">
                  APK EXCLUSIVE
                </span>
              </div>
              <p className="text-xs text-zinc-400">Receive real-time chat alerts outside the app</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="space-y-3 mb-5">
          <div className="p-3 bg-zinc-900 border-2 border-zinc-800 rounded-xl flex items-start gap-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Bell className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-white mb-0.5">Background Message Notifications</h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Stay updated when friends or group members send encrypted messages while you are outside the app.
              </p>
            </div>
          </div>

          <div className="p-3 bg-zinc-900 border-2 border-zinc-800 rounded-xl flex items-start gap-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Volume2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-xs font-bold text-white mb-0.5">Glitch Ringtone Alert Sound</h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed mb-2">
                Distinctive cyberpunk glitch sound plays when incoming messages arrive.
              </p>
              <button
                onClick={handleTestGlitchSound}
                className="px-2.5 py-1 bg-black hover:bg-zinc-800 text-green-400 rounded-lg text-xs font-mono font-bold border border-green-500/50 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Test Glitch Ringtone</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleGrantPermission}
          className="w-full py-3 bg-green-500 hover:bg-green-400 text-black font-black text-xs uppercase tracking-wider rounded-xl border-2 border-black flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all cursor-pointer"
        >
          {permissionGranted ? (
            <>
              <Check className="w-4 h-4 text-black" />
              <span>Permission Active & Enabled!</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 text-black" />
              <span>Allow Device Ringing & Notifications</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
