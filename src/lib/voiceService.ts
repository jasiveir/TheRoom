import { registerPlugin } from '@capacitor/core';

interface VoiceForegroundServicePlugin {
  startService(options?: { title?: string; content?: string }): Promise<void>;
  stopService(): Promise<void>;
}

const VoiceForegroundService = registerPlugin<VoiceForegroundServicePlugin>('VoiceForegroundService');

export const startVoiceForegroundService = async (title?: string, content?: string) => {
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    try {
      await VoiceForegroundService.startService({
        title: title || 'TheRoom Voice Call',
        content: content || 'Call active - Microphone enabled in background'
      });
      console.log('Voice Foreground Service started');
    } catch (e) {
      console.warn('Voice Foreground Service start error:', e);
    }
  }
};

export const stopVoiceForegroundService = async () => {
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    try {
      await VoiceForegroundService.stopService();
      console.log('Voice Foreground Service stopped');
    } catch (e) {
      console.warn('Voice Foreground Service stop error:', e);
    }
  }
};
