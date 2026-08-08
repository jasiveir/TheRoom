import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Shield, Activity, User, Minimize2, Maximize2 } from 'lucide-react';
import { doc, onSnapshot, updateDoc, collection, addDoc, getDoc } from 'firebase/firestore';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { App } from '@capacitor/app';
import { startVoiceForegroundService, stopVoiceForegroundService, onEndCallRequested } from '../../lib/voiceService';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { playGlitchNotificationSound, stopCallRingtone } from '../../lib/audio';

export interface ActiveVoiceCall {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar?: string;
  chatId?: string;
  status: 'calling' | 'accepted' | 'declined' | 'ended';
  createdAtMs: number;
}

interface VoiceCallModalProps {
  call: ActiveVoiceCall;
  onEndCall: () => void;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
  ]
};

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({ call, onEndCall }) => {
  const { userProfile } = useAuth();
  const isCaller = userProfile?.uid === call.callerId;
  const otherPersonName = isCaller ? call.receiverName : call.callerName;
  const otherPersonAvatar = isCaller ? call.receiverAvatar : call.callerAvatar;

  const [callStatus, setCallStatus] = useState<'calling' | 'accepted' | 'declined' | 'ended'>(call.status);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [durationSec, setDurationSec] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const ringingIntervalRef = useRef<any>(null);
  const candidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const isPeerConnectionInitialized = useRef<boolean>(false);

  // Helper to add candidate or queue it until remote description is set
  const processCandidate = (candidateData: RTCIceCandidateInit) => {
    const pc = pcRef.current;
    if (pc && pc.remoteDescription && pc.remoteDescription.type) {
      pc.addIceCandidate(new RTCIceCandidate(candidateData)).catch((e) => console.warn('ICE candidate add notice:', e));
    } else {
      candidateQueueRef.current.push(candidateData);
    }
  };

  const flushCandidateQueue = () => {
    const pc = pcRef.current;
    if (pc && pc.remoteDescription && pc.remoteDescription.type) {
      while (candidateQueueRef.current.length > 0) {
        const candidate = candidateQueueRef.current.shift();
        if (candidate) {
          pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((e) => console.warn('Queued ICE candidate add notice:', e));
        }
      }
    }
  };

  // Synchronize Firestore call status changes & remote SDP answers in real-time
  useEffect(() => {
    if (!call.id) return;

    const unsub = onSnapshot(doc(db, 'calls', call.id), async (snap) => {
      if (!snap.exists()) {
        handleEndCall();
        return;
      }
      const data = snap.data();
      if (data?.status) {
        setCallStatus(data.status);
        if (data.status === 'declined' || data.status === 'ended') {
          setTimeout(() => {
            handleEndCall();
          }, 1200);
        }
      }

      // If caller, listen for receiver's answer SDP
      if (isCaller && data?.answer && pcRef.current && !pcRef.current.currentRemoteDescription) {
        try {
          const rtcAnswer = new RTCSessionDescription(data.answer);
          await pcRef.current.setRemoteDescription(rtcAnswer);
          flushCandidateQueue();
        } catch (err) {
          console.error('Error setting remote answer description:', err);
        }
      }
    });

    return () => unsub();
  }, [call.id, isCaller]);

  // Setup WebRTC connection for CALLER
  useEffect(() => {
    if (!isCaller || isPeerConnectionInitialized.current) return;
    isPeerConnectionInitialized.current = true;

    const initCallerWebRTC = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        // Add local mic audio tracks
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // On receiving remote audio stream
        pc.ontrack = (event) => {
          if (remoteAudioRef.current && event.streams[0]) {
            remoteAudioRef.current.srcObject = event.streams[0];
            remoteAudioRef.current.play().catch((e) => console.warn('Remote audio play notice:', e));
          }
        };

        // On generating local ICE candidate
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            addDoc(collection(db, 'calls', call.id, 'callerCandidates'), event.candidate.toJSON()).catch((e) =>
              console.warn('Error saving caller ICE candidate:', e)
            );
          }
        };

        // Create and set SDP offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await updateDoc(doc(db, 'calls', call.id), {
          offer: { type: offer.type, sdp: offer.sdp }
        });

        // Listen for receiver's ICE candidates
        onSnapshot(collection(db, 'calls', call.id, 'receiverCandidates'), (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const candidateData = change.doc.data() as RTCIceCandidateInit;
              processCandidate(candidateData);
            }
          });
        });
      } catch (err) {
        console.error('Failed to setup caller WebRTC audio:', err);
      }
    };

    initCallerWebRTC();
  }, [isCaller, call.id]);

  // Handle Accepting call for RECEIVER
  const handleAcceptCall = async () => {
    setCallStatus('accepted');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      // Add local mic audio tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // On receiving remote audio stream
      pc.ontrack = (event) => {
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch((e) => console.warn('Remote audio play notice:', e));
        }
      };

      // On generating local ICE candidate
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(collection(db, 'calls', call.id, 'receiverCandidates'), event.candidate.toJSON()).catch((e) =>
            console.warn('Error saving receiver ICE candidate:', e)
          );
        }
      };

      // Fetch call doc to get caller's SDP offer
      const callSnap = await getDoc(doc(db, 'calls', call.id));
      const callData = callSnap.data();

      if (callData?.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
        flushCandidateQueue();

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await updateDoc(doc(db, 'calls', call.id), {
          status: 'accepted',
          answer: { type: answer.type, sdp: answer.sdp }
        });
      }

      // Listen for caller's ICE candidates
      onSnapshot(collection(db, 'calls', call.id, 'callerCandidates'), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const candidateData = change.doc.data() as RTCIceCandidateInit;
            processCandidate(candidateData);
          }
        });
      });
    } catch (err) {
      console.error('Error establishing receiver WebRTC audio connection:', err);
    }
  };

  // Ringing audio pulse
  useEffect(() => {
    if (callStatus === 'calling') {
      playGlitchNotificationSound();
      ringingIntervalRef.current = setInterval(() => {
        playGlitchNotificationSound();
      }, 3500);
    } else {
      if (ringingIntervalRef.current) clearInterval(ringingIntervalRef.current);
    }

    return () => {
      if (ringingIntervalRef.current) clearInterval(ringingIntervalRef.current);
    };
  }, [callStatus]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const callStartTimeRef = useRef<number | null>(null);

  // Keep microphone, CPU, and native Android Foreground Service awake during an active call
  useEffect(() => {
    const startTime = callStartTimeRef.current || Date.now();
    if (!callStartTimeRef.current && callStatus === 'accepted') {
      callStartTimeRef.current = startTime;
    }

    const keepScreenAwake = async () => {
      try {
        await KeepAwake.keepAwake();
        await startVoiceForegroundService(
          'TheRoom — Voice Call',
          `Call active with ${otherPersonName}`,
          callStartTimeRef.current || Date.now()
        );
      } catch (e) {
        console.log('KeepAwake / Foreground service error:', e);
      }
    };

    keepScreenAwake();

    // Listen for native "End Call" notification action press
    let nativeEndSub: any = null;
    onEndCallRequested(() => {
      console.log('User pressed End Call in notification shade');
      handleDeclineCall();
    }).then((sub) => {
      nativeEndSub = sub;
    });

    // Create a background Web Audio API keep-alive node to keep audio processing thread running
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.0001; // silent keep-alive
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
      }
    } catch (e) {
      console.warn('AudioContext keep-alive notice:', e);
    }

    // Listen for app minimize / background event to activate background audio keep-alive
    let appListener: Promise<any> | null = null;
    try {
      appListener = App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          console.log('App moved to background, voice call background audio active');
          if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume().catch(() => {});
          }
          if (remoteAudioRef.current) {
            remoteAudioRef.current.play().catch(() => {});
          }
          if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((track) => {
              if (!isMuted) track.enabled = true;
            });
          }
        }
      });
    } catch (e) {
      console.warn('App state listener notice:', e);
    }

    return () => {
      KeepAwake.allowSleep().catch(() => {});
      stopVoiceForegroundService().catch(() => {});
      if (nativeEndSub) {
        nativeEndSub.remove?.();
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
      if (appListener) {
        appListener.then((l: any) => l?.remove?.()).catch(() => {});
      }
    };
  }, [otherPersonName, isMuted, callStatus]);

  // Call duration timer when accepted - calculated accurately using callStartTimeRef timestamp
  useEffect(() => {
    let timer: any;
    if (callStatus === 'accepted') {
      if (!callStartTimeRef.current) {
        callStartTimeRef.current = Date.now();
      }

      const updateDuration = () => {
        if (callStartTimeRef.current) {
          const elapsed = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
          setDurationSec(elapsed > 0 ? elapsed : 0);
        }
      };

      updateDuration();
      timer = setInterval(updateDuration, 1000);

      // Re-evaluate immediately when returning to foreground from background/lockscreen
      let appListener: Promise<any> | null = null;
      try {
        appListener = App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            updateDuration();
          }
        });
      } catch (_) {}

      // Register MediaSession for Android system background audio keep-alive
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: `Encrypted Voice Call with ${otherPersonName}`,
            artist: 'TheRoom Signal',
            album: 'Ongoing Active Call',
            artwork: [{ src: '/logos/icon-192.png', sizes: '192x192', type: 'image/png' }]
          });
          navigator.mediaSession.setActionHandler('hangup' as any, () => handleDeclineCall());
        } catch (e) {
          console.warn('MediaSession setup:', e);
        }
      }

      return () => {
        if (timer) clearInterval(timer);
        if (appListener) {
          appListener.then((l: any) => l?.remove?.()).catch(() => {});
        }
        if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
          try {
            navigator.mediaSession.metadata = null;
          } catch (_) {}
        }
      };
    }
  }, [callStatus, otherPersonName]);

  const handleDeclineCall = async () => {
    setCallStatus('declined');
    try {
      await updateDoc(doc(db, 'calls', call.id), {
        status: 'declined'
      });
    } catch (e) {
      console.error('Error declining call:', e);
    }
    handleEndCall();
  };

  const handleEndCall = () => {
    stopCallRingtone();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (pcRef.current) {
      pcRef.current.close();
    }
    if (ringingIntervalRef.current) clearInterval(ringingIntervalRef.current);
    onEndCall();
  };

  // Handle Android System Back gesture & Browser Back button to MINIMIZE call
  useEffect(() => {
    if (isMinimized) return;

    // Push state to browser history so back gesture triggers popstate
    try {
      window.history.pushState({ callModalActive: true }, '');
    } catch (_) {}

    const handlePopState = () => {
      // Intercept back gesture/button and minimize call instead of closing/navigating
      setIsMinimized(true);
    };

    const handleNativeBackButton = (e: any) => {
      // Handle native Android hardware/gesture back button (Cordova/Capacitor)
      if (e?.preventDefault) e.preventDefault();
      setIsMinimized(true);
    };

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('backbutton', handleNativeBackButton);

    let capListener: any = null;
    const CapApp = (window as any).Capacitor?.Plugins?.App;
    if (CapApp && typeof CapApp.addListener === 'function') {
      CapApp.addListener('backButton', () => {
        setIsMinimized(true);
      }).then((listener: any) => {
        capListener = listener;
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('backbutton', handleNativeBackButton);
      if (capListener && typeof capListener.remove === 'function') {
        capListener.remove();
      }
    };
  }, [isMinimized]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted; // toggle boolean
        setIsMuted(!isMuted);
      }
    }
  };

  const toggleSpeaker = () => {
    const nextSpeakerState = !isSpeakerOn;
    setIsSpeakerOn(nextSpeakerState);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !nextSpeakerState;
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Minimized Widget View
  if (isMinimized) {
    return (
      <>
        {/* Hidden audio element for WebRTC remote audio playback */}
        <audio ref={remoteAudioRef} autoPlay playsInline />

        <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[200] bg-zinc-950/95 border-2 border-emerald-500/80 shadow-[0_8px_30px_rgb(0,0,0,0.8)] rounded-2xl p-3 flex items-center gap-3 text-white backdrop-blur-md font-sans animate-in slide-in-from-bottom-5 duration-200">
          <div className="relative cursor-pointer flex items-center gap-2.5" onClick={() => setIsMinimized(false)}>
            {otherPersonAvatar ? (
              <img src={otherPersonAvatar} alt={otherPersonName} className="w-10 h-10 rounded-full object-cover border border-zinc-700" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-white">
                {otherPersonName?.[0]?.toUpperCase() || <User className="w-5 h-5 text-zinc-400" />}
              </div>
            )}
            <span className="absolute bottom-0 left-7 w-3 h-3 bg-emerald-500 border-2 border-zinc-950 rounded-full animate-pulse" />
          </div>

          <div className="flex flex-col cursor-pointer min-w-[90px]" onClick={() => setIsMinimized(false)}>
            <span className="text-xs font-bold text-white max-w-[120px] truncate">{otherPersonName}</span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">
              {callStatus === 'accepted' ? formatTimer(durationSec) : 'Calling...'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 pl-1.5 border-l border-zinc-800">
            <button
              onClick={toggleMute}
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                isMuted ? 'bg-rose-950/80 border-rose-500 text-rose-400' : 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              onClick={handleDeclineCall}
              className="p-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white transition-all cursor-pointer shadow-md active:scale-95"
              title="End Call"
            >
              <PhoneOff className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsMinimized(false)}
              className="p-2 rounded-full bg-zinc-800 border border-zinc-700 text-emerald-400 hover:bg-zinc-700 transition-all cursor-pointer"
              title="Expand Full Screen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-between p-6 sm:p-10 font-sans select-none text-white animate-in fade-in duration-300">
      {/* Hidden audio element for WebRTC remote audio playback */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Top Header info */}
      <div className="w-full max-w-sm flex items-center justify-between text-xs text-zinc-400 font-mono border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="text-zinc-300 font-bold uppercase tracking-wider">Encrypted Call</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-full text-[11px] text-zinc-200 font-bold transition-all cursor-pointer active:scale-95"
            title="Minimize Call to Dashboard"
          >
            <Minimize2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Minimize</span>
          </button>
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-full text-[10px] text-emerald-400 font-bold">
            <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>P2P</span>
          </div>
        </div>
      </div>

      {/* Center Profile & Status Visualizer */}
      <div className="flex flex-col items-center space-y-6 my-auto text-center">
        <div className="relative">
          {/* Animated pulse rings during call */}
          {(callStatus === 'calling' || callStatus === 'accepted') && (
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping duration-1000 scale-125 pointer-events-none" />
          )}

          {otherPersonAvatar ? (
            <img
              src={otherPersonAvatar}
              alt={otherPersonName}
              className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover border-4 border-zinc-800 shadow-[0_0_40px_rgba(16,185,129,0.2)] relative z-10"
            />
          ) : (
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-zinc-900 border-4 border-zinc-800 flex items-center justify-center text-3xl font-bold text-white shadow-[0_0_40px_rgba(16,185,129,0.2)] relative z-10">
              {otherPersonName?.[0]?.toUpperCase() || <User className="w-12 h-12 text-zinc-500" />}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">{otherPersonName}</h2>

          <div className="text-sm font-mono font-bold tracking-widest text-emerald-400">
            {callStatus === 'calling' && (isCaller ? 'OUTGOING VOICE CALL...' : 'INCOMING VOICE CALL...')}
            {callStatus === 'accepted' && `ACTIVE CALL • ${formatTimer(durationSec)}`}
            {callStatus === 'declined' && <span className="text-rose-400">CALL DECLINED</span>}
            {callStatus === 'ended' && <span className="text-zinc-500">CALL ENDED</span>}
          </div>
        </div>
      </div>

      {/* Bottom Control Actions */}
      <div className="w-full max-w-sm space-y-6">
        {/* If incoming call and not accepted yet */}
        {!isCaller && callStatus === 'calling' ? (
          <div className="flex items-center justify-around gap-6">
            {/* Decline Button */}
            <button
              onClick={handleDeclineCall}
              className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
              title="Decline Call"
            >
              <PhoneOff className="w-7 h-7" />
            </button>

            {/* Accept Button */}
            <button
              onClick={handleAcceptCall}
              className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer animate-bounce"
              title="Accept Voice Call"
            >
              <Phone className="w-7 h-7 fill-current" />
            </button>
          </div>
        ) : (
          /* Active Call Controls (Mute, Speaker, End) */
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-center gap-6">
              {/* Mute Mic button */}
              <button
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                  isMuted
                    ? 'bg-rose-950 border-rose-500 text-rose-400'
                    : 'bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800'
                }`}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              {/* End Call Button */}
              <button
                onClick={handleDeclineCall}
                className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-xl transition-transform active:scale-95 cursor-pointer"
                title="End Call"
              >
                <PhoneOff className="w-7 h-7" />
              </button>

              {/* Speaker button */}
              <button
                onClick={toggleSpeaker}
                className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                  !isSpeakerOn
                    ? 'bg-amber-950 border-amber-500 text-amber-400'
                    : 'bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800'
                }`}
                title={isSpeakerOn ? 'Mute Speaker' : 'Enable Speaker'}
              >
                {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
              </button>
            </div>
          </div>
        )}

        <div className="text-center text-[11px] text-zinc-500 font-mono">
          End-to-End Encrypted Voice Signal Channel
        </div>
      </div>
    </div>
  );
};

