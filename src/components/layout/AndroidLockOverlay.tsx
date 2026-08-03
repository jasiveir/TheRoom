import React, { useState } from 'react';
import { Smartphone, Download, Monitor, CheckCircle2, ExternalLink } from 'lucide-react';
import { setMobileBypass, APK_RELEASE_URL, APK_RELEASE_TAG_URL } from '../../lib/deviceUtils';
import logoImg from '../../assets/TheRoom.jpg';

interface AndroidLockOverlayProps {
  onBypass: () => void;
  onDownloadApk: () => void;
}

export const AndroidLockOverlay: React.FC<AndroidLockOverlayProps> = ({
  onBypass,
  onDownloadApk
}) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    
    // Direct link to GitHub release download
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
    }, 1500);
  };

  const handleBypass = () => {
    setMobileBypass(true);
    onBypass();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-center p-6 overflow-y-auto font-sans">
      {/* Background Matrix Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-green-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-zinc-950 border-2 border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center relative z-10 my-auto">
        {/* App Logo */}
        <div className="w-20 h-20 rounded-2xl bg-black border-2 border-green-500 flex items-center justify-center mx-auto mb-4 overflow-hidden shadow-[0_0_20px_rgba(34,197,94,0.3)]">
          <img
            src={logoImg}
            onError={(e) => { e.currentTarget.src = '/logos/logo.jpg'; }}
            alt="TheRoom Logo"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Title */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full text-green-400 text-xs font-mono font-bold uppercase tracking-wider mb-3">
          <Smartphone className="w-3.5 h-3.5" />
          <span>Mobile Device Detected</span>
        </div>

        <h1 className="text-2xl font-black text-white uppercase tracking-wider mb-2">
          Download TheRoom App
        </h1>

        <p className="text-xs text-zinc-400 leading-relaxed mb-6">
          To access high-speed real-time messaging, main camera QR code friend scanner, and background glitch ringtone notifications on mobile, please download and install the official app.
        </p>

        {/* Feature Checklist */}
        <div className="bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-4 text-left space-y-2.5 mb-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-2.5 text-xs text-zinc-300">
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
            <span>Main Camera QR Code Friend Scanning</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-zinc-300">
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
            <span>Glitch Ringtone Alerts & Background Push</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-zinc-300">
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
            <span>Persistent Automatic Login Session</span>
          </div>
        </div>

        {/* Download APK Primary Action */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full py-3.5 px-4 bg-green-500 hover:bg-green-400 text-black font-black text-xs uppercase tracking-wider rounded-xl border-2 border-black flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all cursor-pointer mb-3"
        >
          {downloading ? (
            <>
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
              <span>Starting APK Download...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4 text-black" />
              <span>Download Official TheRoom.apk</span>
            </>
          )}
        </button>

        {/* Link to GitHub Release */}
        <div className="mb-4">
          <a
            href={APK_RELEASE_TAG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-green-400 underline transition-colors"
          >
            <span>View GitHub Release Page</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Bypass / Desktop Mode Secondary Action */}
        <button
          onClick={handleBypass}
          className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold text-xs rounded-xl border-2 border-zinc-800 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        >
          <Monitor className="w-4 h-4 text-zinc-400" />
          <span>Continue in Browser (Desktop Site)</span>
        </button>
      </div>
    </div>
  );
};
