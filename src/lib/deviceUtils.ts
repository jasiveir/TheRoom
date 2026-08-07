export const APK_RELEASE_URL = 'https://github.com/jasiveir/TheRoom/releases/download/TheRoom/TheRoom.apk';
export const APK_RELEASE_TAG_URL = 'https://github.com/jasiveir/TheRoom/releases/tag/TheRoom';

export function isApkMode(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Explicit search parameters or localStorage override
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.get('mode') === 'app' || searchParams.get('isApk') === 'true') return true;
  if (localStorage.getItem('is_apk_mode') === 'true') return true;

  // 2. Capacitor / Cordova / Native Android Bridges
  const w = window as any;
  if (w.Capacitor?.isNativePlatform?.() === true) return true;
  const platform = w.Capacitor?.getPlatform?.();
  if (platform === 'android' || platform === 'ios') return true;
  if (w.cordova || w.PhoneGap) return true;
  if (w.isNativeApk) return true;
  if (w.AndroidInterface || w.Android) return true;

  // 3. Native App protocol (Capacitor/Cordova local app server)
  const proto = window.location.protocol;
  if (proto === 'capacitor:' || proto === 'file:' || proto === 'ionic:' || proto === 'app:') return true;

  // 4. Standalone WebView UserAgent detection for custom native APK wrappers
  const ua = (navigator.userAgent || navigator.vendor || w.opera || '').toLowerCase();
  if (ua.includes('capacitor') || ua.includes('cordova') || ua.includes('android-apk')) return true;

  return false;
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = (navigator.userAgent || navigator.vendor || (window as any).opera || '').toLowerCase();
  
  // 1. Standard mobile/tablet UA strings
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobi|tablet|silk|kindle/i.test(ua);
  if (isMobileUA) return true;

  // 2. iPadOS desktop mode detection (reports Macintosh UA with touch points)
  if (navigator.maxTouchPoints && navigator.maxTouchPoints > 1 && /macintosh/i.test(ua)) {
    return true;
  }

  // 3. Coarse pointer (touch screen) with mobile/tablet screen dimensions
  if (typeof window.matchMedia === 'function') {
    const isCoarseTouch = window.matchMedia('(pointer: coarse)').matches;
    const isMobileWidth = window.innerWidth <= 1024 || window.innerHeight <= 1024;
    if (isCoarseTouch && isMobileWidth) return true;
  }

  return false;
}

export function isAndroidDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  return /Android/i.test(ua);
}

export function isMobileLockActive(): boolean {
  if (typeof window === 'undefined') return false;
  if (isApkMode()) return false; // Installed APK app NEVER locks
  if (!isMobileDevice()) return false; // Desktop/PC browsers NEVER lock
  if (sessionStorage.getItem('bypass_mobile_lock') === 'true') return false;
  return true;
}

export function setMobileBypass(bypass: boolean = true) {
  if (typeof window === 'undefined') return;
  if (bypass) {
    sessionStorage.setItem('bypass_mobile_lock', 'true');
  } else {
    sessionStorage.removeItem('bypass_mobile_lock');
  }
}

export function clearMobileBypass() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('bypass_mobile_lock');
  window.dispatchEvent(new Event('mobile_lock_reset'));
}

export function setAndroidBypass(bypass: boolean = true) {
  setMobileBypass(bypass);
}

export function isAndroidLockActive(): boolean {
  return isMobileLockActive();
}

export function setApkModeOverride(enabled: boolean) {
  if (typeof window === 'undefined') return;
  if (enabled) {
    localStorage.setItem('is_apk_mode', 'true');
  } else {
    localStorage.removeItem('is_apk_mode');
  }
}

