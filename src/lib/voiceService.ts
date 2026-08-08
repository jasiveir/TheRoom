import { registerPlugin } from '@capacitor/core';

interface VoiceForegroundServicePlugin {
  startService(options?: { title?: string; content?: string; startTime?: number }): Promise<void>;
  stopService(): Promise<void>;
  addListener(
    eventName: 'endCallRequested',
    listenerFunc: () => void
  ): Promise<{ remove: () => void }>;
}

const VoiceForegroundService = registerPlugin<VoiceForegroundServicePlugin>('VoiceForegroundService');

export const startVoiceForegroundService = async (title?: string, content?: string, startTime?: number) => {
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    try {
      await VoiceForegroundService.startService({
        title: title || 'TheRoom Voice Call',
        content: content || 'Call active - Microphone enabled in background',
        startTime: startTime || Date.now(),
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

export const onEndCallRequested = (callback: () => void) => {
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    try {
      const listener = VoiceForegroundService.addListener('endCallRequested', () => {
        console.log('Native "End Call" notification action triggered');
        callback();
      });
      return listener;
    } catch (e) {
      console.warn('Error adding endCallRequested listener:', e);
    }
  }
  return Promise.resolve({ remove: () => {} });
};
