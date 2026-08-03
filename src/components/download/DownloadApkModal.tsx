import React, { useState } from 'react';
import { Download, Smartphone, Check, ShieldCheck, X, Sparkles, AlertCircle } from 'lucide-react';
import { isApkMode } from '../../lib/deviceUtils';
import logoImg from '../../assets/TheRoom.jpg';

interface DownloadApkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadApkModal: React.FC<DownloadApkModalProps> = ({ isOpen, onClose }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  // If inside APK mode, download section does not render (per requirements)
  if (!isOpen || isApkMode()) return null;

  const triggerApkDownload = () => {
    setDownloading(true);

    // Create virtual APK file blob download
    const apkContent = `TheRoom Android APK Package Version 1.2.0\nPackage: com.theroom.app\nBuild: Standalone Client Native Bundle\nInstalled Features: Camera QR Scanner, Glitch Ringtone Alerts, Auto-Login Session.`;
    const blob = new Blob([apkContent], { type: 'application/vnd.android.package-archive' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'TheRoom-v1.2.0.apk';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setTimeout(() => {
      setDownloading(false);
      setDownloaded(true);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-zinc-950 text-white rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-2 border-zinc-800 p-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-zinc-800 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black border-2 border-green-500 flex items-center justify-center overflow-hidden shadow-[0_0_12px_rgba(34,197,94,0.3)]">
              <img
                src={logoImg}
                onError={(e) => { e.currentTarget.src = '/logos/logo.jpg'; }}
                alt="TheRoom Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Download Android App</h2>
              <p className="text-xs text-zinc-400">Official Standalone APK (v1.2.0)</p>
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
        <div className="space-y-2.5 mb-5 text-xs">
          <div className="p-3 bg-zinc-900 border-2 border-zinc-800 rounded-xl flex items-center gap-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Smartphone className="w-5 h-5 text-green-400 shrink-0" />
            <div>
              <p className="font-bold text-white">Camera QR Friend Scanner</p>
              <p className="text-[11px] text-zinc-400">Scan friends' QR codes directly to add them in seconds.</p>
            </div>
          </div>

          <div className="p-3 bg-zinc-900 border-2 border-zinc-800 rounded-xl flex items-center gap-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-white">Device Ringing & Glitch Alerts</p>
              <p className="text-[11px] text-zinc-400">Receive audio alerts when closed or in background.</p>
            </div>
          </div>
        </div>

        {/* Installation Instructions */}
        <div className="mb-5 p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl text-[11px] text-zinc-400 space-y-1">
          <p className="font-bold text-zinc-300">How to install:</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Download the <b>TheRoom-v1.2.0.apk</b> file above.</li>
            <li>Tap on the file and enable "Install from unknown sources" if prompted.</li>
            <li>Launch the app to enjoy persistent login & native camera scanning!</li>
          </ol>
        </div>

        {/* Download Button */}
        <button
          onClick={triggerApkDownload}
          disabled={downloading}
          className="w-full py-3 bg-green-500 hover:bg-green-400 text-black font-black text-xs uppercase tracking-wider rounded-xl border-2 border-black flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all cursor-pointer"
        >
          {downloading ? (
            <>
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
              <span>Starting APK Download...</span>
            </>
          ) : downloaded ? (
            <>
              <Check className="w-4 h-4 text-black" />
              <span>APK Downloaded! Click to re-download</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4 text-black" />
              <span>Download Official APK File</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
