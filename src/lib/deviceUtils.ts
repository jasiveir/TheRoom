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

export function isAndroidDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  return /Android/i.test(ua);
}

export function isAndroidLockActive(): boolean {
  if (typeof window === 'undefined') return false;
  if (isApkMode()) return false; // Native APK mode never locks
  if (!isAndroidDevice()) return false;
  if (sessionStorage.getItem('bypass_android_lock') === 'true') return false;
  return true;
}

export function setAndroidBypass(bypass: boolean = true) {
  if (typeof window === 'undefined') return;
  if (bypass) {
    sessionStorage.setItem('bypass_android_lock', 'true');
  } else {
    sessionStorage.removeItem('bypass_android_lock');
  }
}

export function setApkModeOverride(enabled: boolean) {
  if (typeof window === 'undefined') return;
  if (enabled) {
    localStorage.setItem('is_apk_mode', 'true');
  } else {
    localStorage.removeItem('is_apk_mode');
  }
}
