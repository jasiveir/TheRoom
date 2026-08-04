import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, RefreshCw, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { playNotificationSound } from '../../lib/audio';

interface CameraQRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedCode: string) => void;
}

export const CameraQRScannerModal: React.FC<CameraQRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'qr-camera-stream-reader';

  const stopScanner = async () => {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
        html5QrcodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping QR scanner:', err);
      }
      html5QrcodeRef.current = null;
    }
    setIsScanning(false);
  };

  const startScanner = async (cameraId?: string) => {
    setError(null);
    await stopScanner();

    try {
      // Force trigger native system camera permission request prompt
      if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
        try {
          const testStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } }
          });
          // Immediately release tracks so Html5Qrcode can bind the camera stream
          testStream.getTracks().forEach(track => track.stop());
        } catch (mediaErr: any) {
          console.warn('Native getUserMedia request returned error:', mediaErr);
        }
      }

      const qrScanner = new Html5Qrcode(readerElementId);
      html5QrcodeRef.current = qrScanner;

      // Always default and lock to device main back camera
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        // Find main rear/environment camera device if available
        const mainBackCam = devices.find(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('rear') || 
          d.label.toLowerCase().includes('environment') || 
          d.label.toLowerCase().includes('0')
        ) || devices[devices.length - 1]; // fallback to last device in array (usually main camera on Android)

        const targetCamId = mainBackCam.id;

        await qrScanner.start(
          targetCamId,
          {
            fps: 15,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0,
            facingMode: 'environment'
          },
          (decodedText) => {
            playNotificationSound();
            let cleanCode = decodedText.trim();
            // Handle URL links containing ?code= or raw code
            if (cleanCode.includes('code=')) {
              try {
                const url = new URL(cleanCode);
                cleanCode = url.searchParams.get('code') || cleanCode;
              } catch (e) {
                // Ignore URL parse error
              }
            }
            stopScanner();
            onScanSuccess(cleanCode.toUpperCase());
            onClose();
          },
          (errorMessage) => {
            // Ignore frame scan failures
          }
        );
        setIsScanning(true);
      } else {
        setError('No camera detected. Please grant camera permission in phone settings and retry.');
      }
    } catch (err: any) {
      console.error('Camera QR scanner error:', err);
      setError(
        err?.message || 'Could not access device camera. Please grant camera permissions in your device settings.'
      );
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Delay slightly to let modal DOM mount before initializing scanner
      const timer = setTimeout(() => {
        startScanner();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-sm bg-zinc-950 text-white rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-2 border-zinc-800 p-5 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-zinc-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-black border-2 border-zinc-700 flex items-center justify-center text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Camera className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Camera QR Scanner</h2>
              <p className="text-xs text-zinc-400">Scan friend's QR code to add automatically</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Feed Container */}
        <div className="relative w-full aspect-square bg-black rounded-xl overflow-hidden border-2 border-zinc-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
          <div id={readerElementId} className="w-full h-full object-cover"></div>

          {/* Scanner Animated Overlay */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-56 h-56 border-2 border-dashed border-green-400/80 rounded-2xl relative shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-green-400 shadow-[0_0_10px_#22c55e] animate-pulse"></div>
                <div className="absolute bottom-2 left-0 right-0 text-center text-[10px] font-mono font-bold text-green-400 bg-black/70 py-0.5 px-2 rounded-full mx-auto w-max">
                  ALIGN QR CODE HERE
                </div>
              </div>
            </div>
          )}

          {!isScanning && !error && (
            <div className="absolute inset-0 bg-zinc-900/90 flex flex-col items-center justify-center p-4 text-center">
              <Camera className="w-8 h-8 text-zinc-500 mb-2 animate-bounce" />
              <p className="text-xs text-zinc-400 font-bold">Initializing camera stream...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 bg-zinc-950/95 flex flex-col items-center justify-center p-4 text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
              <p className="text-xs text-red-300 font-medium mb-3">{error}</p>
              <button
                onClick={() => startScanner(selectedCameraId)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold border border-zinc-700 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Camera</span>
              </button>
            </div>
          )}
        </div>

        {/* Instructions footer */}
        <div className="mt-4 p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-[11px] text-zinc-400 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-green-400 shrink-0" />
          <span>Point device main camera at a friend's QR code to search automatically.</span>
        </div>
      </div>
    </div>
  );
};
