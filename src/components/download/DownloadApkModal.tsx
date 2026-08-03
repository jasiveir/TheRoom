import React, { useState } from 'react';
import { Download, Smartphone, Check, ShieldCheck, X, ExternalLink } from 'lucide-react';
import { isApkMode, isMobileDevice, APK_RELEASE_URL, APK_RELEASE_TAG_URL } from '../../lib/deviceUtils';
import logoImg from '../../assets/TheRoom.jpg';

interface DownloadApkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadApkModal: React.FC<DownloadApkModalProps> = ({ isOpen, onClose }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  // Download section only appears on website when users are on mobile devices and not in APK mode
  if (!isOpen || isApkMode() || !isMobileDevice()) return null;

  const triggerApkDownload = () => {
    setDownloading(true);

    // Open direct GitHub release download URL
    const a = document.createElement('a');
    a.href = APK_RELEASE_URL;
    a.download = 'TheRoom.apk';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      setDownloading(false);
      setDownloaded(true);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-zinc-950 text-white rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-2 border-zinc-800 p-6 relative overflow-hidden font-sans">
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
              <h2 className="text-base font-extrabold text-white">Download TheRoom App</h2>
              <p className="text-xs text-zinc-400">Official Release (TheRoom.apk)</p>
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
              <p className="font-bold text-white">Main Camera QR Friend Scanner</p>
              <p className="text-[11px] text-zinc-400">Scan friends' QR codes instantly using your device main camera.</p>
            </div>
          </div>

          <div className="p-3 bg-zinc-900 border-2 border-zinc-800 rounded-xl flex items-center gap-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-white">Device Ringing & Glitch Ringtone</p>
              <p className="text-[11px] text-zinc-400">Receive audio glitch ringtone alerts when app is closed.</p>
            </div>
          </div>
        </div>

        {/* Download Button */}
        <button
          onClick={triggerApkDownload}
          disabled={downloading}
          className="w-full py-3.5 bg-green-500 hover:bg-green-400 text-black font-black text-xs uppercase tracking-wider rounded-xl border-2 border-black flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all cursor-pointer mb-3"
        >
          {downloading ? (
            <>
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
              <span>Opening Direct APK Download...</span>
            </>
          ) : downloaded ? (
            <>
              <Check className="w-4 h-4 text-black" />
              <span>APK Download Started! Click to Re-download</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4 text-black" />
              <span>Download Official TheRoom.apk</span>
            </>
          )}
        </button>

        {/* Link to GitHub Release Tag */}
        <div className="text-center">
          <a
            href={APK_RELEASE_TAG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-green-400 underline transition-colors"
          >
            <span>View GitHub Release Page (TheRoom Tag)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
