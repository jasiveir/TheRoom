import React, { useState, useEffect, useRef } from 'react';
import { PhoneOff, Mic, MicOff, Volume2, VolumeX, Users, Activity, Shield, Minimize2, Maximize2 } from 'lucide-react';
import { doc, onSnapshot, updateDoc, setDoc, deleteDoc, collection, addDoc, getDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';

export interface GroupCallParticipant {
  uid: string;
  name: string;
  avatar?: string;
  joinedAt: number;
  isMuted?: boolean;
}

interface GroupVoiceCallModalProps {
  chatId: string;
  groupName: string;
  groupPhoto?: string;
  members?: string[];
  onClose: () => void;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302', 'stun:stun3.l.google.com:19302', 'stun:stun4.l.google.com:19302'] }
  ]
};

export const GroupVoiceCallModal: React.FC<GroupVoiceCallModalProps> = ({
  chatId,
  groupName,
  groupPhoto,
  members,
  onClose
}) => {
  const { userProfile } = useAuth();
  const [participants, setParticipants] = useState<GroupCallParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [durationSec, setDurationSec] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const candidateQueuesRef = useRef<Map<string, any[]>>(new Map());

  // Call duration counter
  useEffect(() => {
    const timer = setInterval(() => {
      setDurationSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format timer
  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. Initialize local microphone audio stream & join Firestore participant list
  useEffect(() => {
    if (!userProfile?.uid || !chatId) return;

    let isMounted = true;

    const setupLocalMediaAndJoin = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        setLocalStream(stream);

        // Register in group call participants collection
        const myParticipantRef = doc(db, 'groupCalls', chatId, 'participants', userProfile.uid);
        await setDoc(myParticipantRef, {
          uid: userProfile.uid,
          name: userProfile.displayName || userProfile.email?.split('@')[0] || 'User',
          avatar: userProfile.photoURL || '',
          joinedAt: Date.now(),
          isMuted: false
        });

        // Ensure root group call doc has members & active state
        let groupMembersList = members;
        if (!groupMembersList || groupMembersList.length === 0) {
          const chatSnap = await getDoc(doc(db, 'chats', chatId)).catch(() => null);
          if (chatSnap && chatSnap.exists()) {
            groupMembersList = chatSnap.data().members || [];
          }
        }

        await setDoc(doc(db, 'groupCalls', chatId), {
          id: chatId,
          groupName,
          groupPhoto: groupPhoto || '',
          members: groupMembersList || [userProfile.uid],
          startedByUid: userProfile.uid,
          startedByName: userProfile.displayName || userProfile.email?.split('@')[0] || 'User',
          status: 'active',
          updatedAt: serverTimestamp()
        }, { merge: true });

      } catch (err) {
        console.error('Failed to access microphone for group voice call:', err);
      }
    };

    setupLocalMediaAndJoin();

    return () => {
      isMounted = false;
    };
  }, [chatId, userProfile?.uid]);

  // 2. Listen to active participants in real-time
  useEffect(() => {
    if (!chatId) return;

    const participantsCol = collection(db, 'groupCalls', chatId, 'participants');
    const unsub = onSnapshot(participantsCol, (snapshot) => {
      const list: GroupCallParticipant[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as GroupCallParticipant);
      });
      setParticipants(list);
    });

    return () => unsub();
  }, [chatId]);

  // Candidate Queue helper methods
  const addCandidateOrQueue = (otherUid: string, pc: RTCPeerConnection, candidateData: any) => {
    if (pc.remoteDescription && pc.remoteDescription.type) {
      pc.addIceCandidate(new RTCIceCandidate(candidateData)).catch((e) => console.warn('ICE Candidate add info:', e));
    } else {
      if (!candidateQueuesRef.current.has(otherUid)) {
        candidateQueuesRef.current.set(otherUid, []);
      }
      candidateQueuesRef.current.get(otherUid)!.push(candidateData);
    }
  };

  const flushCandidateQueue = (otherUid: string, pc: RTCPeerConnection) => {
    const queue = candidateQueuesRef.current.get(otherUid) || [];
    while (queue.length > 0) {
      const cand = queue.shift();
      if (cand) {
        pc.addIceCandidate(new RTCIceCandidate(cand)).catch((e) => console.warn('Queued Candidate add info:', e));
      }
    }
  };

  // 3. Establish WebRTC Mesh peer connections with each other active participant
  useEffect(() => {
    if (!userProfile?.uid || !chatId || !localStream) return;

    const myUid = userProfile.uid;
    const currentPCs = peerConnectionsRef.current;

    participants.forEach((other) => {
      if (other.uid === myUid) return;

      const otherUid = other.uid;
      const pairKey = [myUid, otherUid].sort().join('_');
      const isOfferer = myUid < otherUid;

      if (!currentPCs.has(otherUid)) {
        // Create new PeerConnection
        const pc = new RTCPeerConnection(ICE_SERVERS);
        currentPCs.set(otherUid, pc);

        // Add local stream audio tracks
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });

        // Handle incoming remote stream tracks
        pc.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            const stream = event.streams[0];
            setRemoteStreams((prev) => {
              const next = new Map(prev);
              next.set(otherUid, stream);
              return next;
            });
          }
        };

        // ICE candidate handling
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const candCol = collection(db, 'groupCalls', chatId, 'signaling', pairKey, `candidates_${myUid}`);
            addDoc(candCol, event.candidate.toJSON()).catch((e) => console.warn('Error saving ICE candidate:', e));
          }
        };

        const signalDocRef = doc(db, 'groupCalls', chatId, 'signaling', pairKey);

        if (isOfferer) {
          // Offerer creates Offer
          pc.createOffer()
            .then((offer) => pc.setLocalDescription(offer))
            .then(() => {
              return setDoc(signalDocRef, {
                offerer: myUid,
                answerer: otherUid,
                offer: { type: pc.localDescription?.type, sdp: pc.localDescription?.sdp }
              }, { merge: true });
            })
            .catch((e) => console.error('Offerer SDP error:', e));

          // Listen for Answer
          onSnapshot(signalDocRef, (snap) => {
            const data = snap.data();
            if (data?.answer && !pc.currentRemoteDescription) {
              pc.setRemoteDescription(new RTCSessionDescription(data.answer))
                .then(() => flushCandidateQueue(otherUid, pc))
                .catch((e) => console.warn('Set answer err:', e));
            }
          });

          // Listen for Answerer's Candidates
          const candColOther = collection(db, 'groupCalls', chatId, 'signaling', pairKey, `candidates_${otherUid}`);
          onSnapshot(candColOther, (snap) => {
            snap.docChanges().forEach((change) => {
              if (change.type === 'added') {
                addCandidateOrQueue(otherUid, pc, change.doc.data());
              }
            });
          });

        } else {
          // Answerer listens for Offer
          onSnapshot(signalDocRef, async (snap) => {
            const data = snap.data();
            if (data?.offer && !pc.currentRemoteDescription) {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                flushCandidateQueue(otherUid, pc);
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await updateDoc(signalDocRef, {
                  answer: { type: pc.localDescription?.type, sdp: pc.localDescription?.sdp }
                });
              } catch (e) {
                console.warn('Answerer SDP error:', e);
              }
            }
          });

          // Listen for Offerer's Candidates
          const candColOther = collection(db, 'groupCalls', chatId, 'signaling', pairKey, `candidates_${otherUid}`);
          onSnapshot(candColOther, (snap) => {
            snap.docChanges().forEach((change) => {
              if (change.type === 'added') {
                addCandidateOrQueue(otherUid, pc, change.doc.data());
              }
            });
          });
        }
      }
    });

  }, [participants, chatId, userProfile?.uid, localStream]);

  // Toggle local mute
  const handleToggleMute = async () => {
    if (localStream) {
      const nextMute = !isMuted;
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !nextMute;
      });
      setIsMuted(nextMute);

      if (userProfile?.uid && chatId) {
        const myParticipantRef = doc(db, 'groupCalls', chatId, 'participants', userProfile.uid);
        await updateDoc(myParticipantRef, { isMuted: nextMute }).catch(() => {});
      }
    }
  };

  // Toggle speaker outputs
  const handleToggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
  };

  // Handle Android System Back gesture & Browser Back button to MINIMIZE group call
  useEffect(() => {
    if (isMinimized) return;

    try {
      window.history.pushState({ groupCallModalActive: true }, '');
    } catch (_) {}

    const handlePopState = () => {
      setIsMinimized(true);
    };

    const handleNativeBackButton = (e: any) => {
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

  // Leave Group Voice Call cleanly
  const handleLeaveCall = async () => {
    // 1. Close all WebRTC connections
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    candidateQueuesRef.current.clear();

    // 2. Clear remote streams
    setRemoteStreams(new Map());

    // 3. Stop local mic tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    // 4. Remove from Firestore and check remaining participants
    if (userProfile?.uid && chatId) {
      await deleteDoc(doc(db, 'groupCalls', chatId, 'participants', userProfile.uid)).catch(() => {});

      const remainingSnap = await getDocs(collection(db, 'groupCalls', chatId, 'participants')).catch(() => null);
      if (!remainingSnap || remainingSnap.empty) {
        // Last member left: mark group call session as ended so popups & banners hide
        await updateDoc(doc(db, 'groupCalls', chatId), {
          status: 'ended',
          endedAt: serverTimestamp()
        }).catch(() => {});
      }
    }

    onClose();
  };

  if (isMinimized) {
    return (
      <>
        {/* Render hidden audio streams for remote group participants */}
        {Array.from(remoteStreams.entries()).map(([peerUid, stream]) => (
          <audio
            key={peerUid}
            ref={(el) => {
              if (el) {
                if (el.srcObject !== stream) {
                  el.srcObject = stream;
                }
                if (el.paused) {
                  el.play().catch((e) => console.warn('Remote stream play info:', e));
                }
              }
            }}
            autoPlay
            playsInline
            muted={!isSpeakerOn}
          />
        ))}

        <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[200] bg-zinc-950/95 border-2 border-emerald-500/80 shadow-[0_8px_30px_rgb(0,0,0,0.8)] rounded-2xl p-3 flex items-center gap-3 text-white backdrop-blur-md font-sans animate-in slide-in-from-bottom-5 duration-200">
          <div className="relative cursor-pointer flex items-center gap-2.5" onClick={() => setIsMinimized(false)}>
            {groupPhoto ? (
              <img src={groupPhoto} alt={groupName} className="w-10 h-10 rounded-xl object-cover border border-zinc-700" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center border border-emerald-500">
                <Users className="w-5 h-5" />
              </div>
            )}
            <span className="absolute bottom-0 left-7 w-3 h-3 bg-emerald-500 border-2 border-zinc-950 rounded-full animate-pulse" />
          </div>

          <div className="flex flex-col cursor-pointer min-w-[100px]" onClick={() => setIsMinimized(false)}>
            <span className="text-xs font-bold text-white max-w-[120px] truncate">{groupName}</span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">
              {participants.length} in call • {formatTimer(durationSec)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 pl-1.5 border-l border-zinc-800">
            <button
              type="button"
              onClick={handleToggleMute}
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                isMuted ? 'bg-rose-950/80 border-rose-500 text-rose-400' : 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleLeaveCall}
              className="p-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white transition-all cursor-pointer shadow-md active:scale-95"
              title="Leave Group Call"
            >
              <PhoneOff className="w-4 h-4" />
            </button>

            <button
              type="button"
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
    <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-300">
      
      {/* Hidden DOM Audio elements for all remote group call participants */}
      {Array.from(remoteStreams.entries()).map(([otherUid, stream]) => (
        <audio
          key={otherUid}
          ref={(el) => {
            if (el) {
              if (el.srcObject !== stream) {
                el.srcObject = stream;
              }
              if (el.paused) {
                el.play().catch((e) => console.warn('Remote stream play info:', e));
              }
            }
          }}
          autoPlay
          playsInline
          muted={!isSpeakerOn}
        />
      ))}

      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white">
        
        {/* Header */}
        <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Group Voice Call
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-full text-[11px] text-zinc-200 font-bold transition-all cursor-pointer active:scale-95"
              title="Minimize Group Call to Dashboard"
            >
              <Minimize2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Minimize</span>
            </button>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {formatTimer(durationSec)}
            </div>
          </div>
        </div>

        {/* Group Details & Status */}
        <div className="p-6 text-center bg-gradient-to-b from-zinc-950/40 to-zinc-900/60 flex flex-col items-center">
          <div className="relative mb-3">
            {groupPhoto ? (
              <img src={groupPhoto} alt={groupName} className="w-16 h-16 rounded-2xl object-cover border-2 border-zinc-700 shadow-lg" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white font-bold text-xl flex items-center justify-center border-2 border-emerald-500 shadow-lg">
                <Users className="w-8 h-8" />
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 text-black rounded-full shadow-md">
              <Activity className="w-3.5 h-3.5" />
            </span>
          </div>

          <h2 className="text-base font-bold text-white uppercase tracking-wider truncate max-w-xs">
            {groupName}
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1 font-sans">
            <span>{participants.length} Participant{participants.length !== 1 ? 's' : ''} in Call</span>
          </p>
        </div>

        {/* Participants Grid */}
        <div className="p-4 max-h-56 overflow-y-auto border-t border-b border-zinc-800/60 bg-zinc-950/40 custom-scrollbar">
          <div className="grid grid-cols-2 gap-2.5">
            {participants.map((p) => {
              const isSelf = p.uid === userProfile?.uid;
              return (
                <div
                  key={p.uid}
                  className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                    isSelf
                      ? 'bg-zinc-800/80 border-emerald-500/40 text-white'
                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-300'
                  }`}
                >
                  <div className="relative shrink-0">
                    {p.avatar ? (
                      <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-lg object-cover border border-zinc-700" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-zinc-700 text-white font-bold text-xs flex items-center justify-center border border-zinc-600">
                        {p.name[0]?.toUpperCase()}
                      </div>
                    )}
                    {!p.isMuted && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-zinc-900 animate-pulse" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">
                      {p.name} {isSelf && '(You)'}
                    </p>
                    <p className="text-[10px] text-zinc-400 truncate">
                      {p.isMuted ? 'Muted' : 'Speaking'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Call Controls Bar */}
        <div className="p-6 bg-zinc-950/80 flex items-center justify-center gap-6">
          {/* Mute Toggle */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              isMuted
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/30'
                : 'bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* Leave Call */}
          <button
            type="button"
            onClick={handleLeaveCall}
            className="p-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-lg hover:shadow-rose-600/30 active:scale-95 cursor-pointer flex items-center gap-2 px-6"
            title="Leave Group Voice Call"
          >
            <PhoneOff className="w-6 h-6" />
            <span className="text-xs font-bold uppercase tracking-wider">Leave Call</span>
          </button>

          {/* Speaker Toggle */}
          <button
            type="button"
            onClick={handleToggleSpeaker}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              !isSpeakerOn
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30'
                : 'bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700'
            }`}
            title={isSpeakerOn ? 'Mute Audio' : 'Unmute Audio'}
          >
            {!isSpeakerOn ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>
        </div>

      </div>
    </div>
  );
};

