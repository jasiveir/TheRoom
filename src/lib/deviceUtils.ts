export const APK_RELEASE_URL = 'https://github.com/jasiveir/TheRoom/releases/download/TheRoom/TheRoom.apk';
export const APK_RELEASE_TAG_URL = 'https://github.com/jasiveir/TheRoom/releases/tag/TheRoom';

export function isApkMode(): boolean {
  if (typeof window === 'undefined') return false;
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.get('mode') === 'app' || searchParams.get('isApk') === 'true') return true;
  if (localStorage.getItem('is_apk_mode') === 'true') return true;
  if ((window.navigator as any).standalone === true) return true;
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
  if ((window as any).isNativeApk) return true;
  return false;
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobi|Tablet/i.test(ua);
}

export function isAndroidDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  return /Android/i.test(ua);
}

export function isMobileLockActive(): boolean {
  if (typeof window === 'undefined') return false;
  if (isApkMode()) return false; // Native APK app never locks
  if (!isMobileDevice()) return false; // Desktop/PC browsers do not lock and do not show app download
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
