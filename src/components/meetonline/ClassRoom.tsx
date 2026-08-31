import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Device } from 'mediasoup-client';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, LogOut, 
  MessageSquare, FileText, Users, Radio, CircleDot, UserX, VolumeX, FileUp, Pin,
  Tv2, Settings, Copy, Check, X, BookOpen, Wifi, WifiOff, Hand, Smile,
  LayoutGrid, Maximize2, PanelRightClose, PanelRightOpen, Eye, FlipHorizontal, HelpCircle
} from 'lucide-react';
import ChatPanel from './ChatPanel';
import NotesPanel from './NotesPanel';
import FilesPanel from './FilesPanel';

// Tooltip wrapper
function Tip({ label, children, position = 'top' }: { label: string; children: React.ReactNode; position?: 'top' | 'bottom' }) {
  const isBottom = position === 'bottom';
  return (
    <div className="relative group/tip flex flex-col items-center">
      {children}
      <div className={`pointer-events-none absolute ${isBottom ? 'top-full mt-2' : 'bottom-full mb-2'} left-1/2 -translate-x-1/2 z-50 opacity-0 group-hover/tip:opacity-100 transition-all duration-150 ${isBottom ? '-translate-y-1 group-hover/tip:translate-y-0' : 'translate-y-1 group-hover/tip:translate-y-0'}`}>
        <div className="px-2.5 py-1.5 rounded-lg bg-[#1a1f2e] border border-white/10 text-[11px] font-semibold text-white whitespace-nowrap shadow-xl">
          {label}
          <div className={`absolute ${isBottom ? 'bottom-full left-1/2 -translate-x-1/2 border-b-[#1a1f2e]' : 'top-full left-1/2 -translate-x-1/2 border-t-[#1a1f2e]'} w-0 h-0 border-l-4 border-r-4 border-l-transparent border-r-transparent ${isBottom ? 'border-b-4' : 'border-t-4'}`} />
        </div>
      </div>
    </div>
  );
}

const REACTIONS = ['👍', '❤️', '😂', '😮', '🎉', '🙌', '🔥', '✏️'];

interface ClassRoomProps {
  user: { username: string; role: string; className?: string };
  token: string;
  roomCode: string;
  roomType: 'meeting' | 'live_class';
  mobile?: string;
  className?: string; // batch/class name from outside
  onLeave: () => void;
}

interface Peer {
  peerId: string;
  username: string;
  role: string;
  mobile?: string;
  isMuted?: boolean;
  isCamOff?: boolean;
  isSpeaking?: boolean;
}

interface RemoteStream {
  peerId: string;
  username: string;
  role: string;
  stream: MediaStream;
  isScreen?: boolean;
}

// Role display labels
const getRoleLabel = (role: string) => {
  if (role === 'teacher') return 'Teacher';
  if (role === 'super_admin' || role === 'admin') return 'Admin';
  if (role === 'student') return 'Student';
  return role;
};

const getRoleBadgeStyle = (role: string) => {
  if (role === 'teacher') return 'bg-violet-500/80 text-white';
  if (role === 'super_admin' || role === 'admin') return 'bg-amber-500/80 text-white';
  return 'bg-sky-500/60 text-white';
};

const getAvatarGradient = (role: string) => {
  if (role === 'teacher') return 'from-violet-600 to-purple-700';
  if (role === 'super_admin' || role === 'admin') return 'from-amber-500 to-orange-600';
  return 'from-sky-500 to-blue-600';
};

export default function ClassRoom({ user, token, roomCode: propRoomCode, roomType, mobile, className: batchName, onLeave }: ClassRoomProps) {
  const roomCode = propRoomCode?.toUpperCase();
  const [micEnabled, setMicEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [pinnedPeerId, setPinnedPeerId] = useState<string | null>(null);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [activeSidebar, setActiveSidebar] = useState<'chat' | 'notes' | 'participants' | 'files' | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const peersRef = useRef<Peer[]>([]);
  const [showObsModal, setShowObsModal] = useState(false);
  const [obsCopied, setObsCopied] = useState(false);
  const [connected, setConnected] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<Date | null>(null);
  const [handRaised, setHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());
  const [showReactions, setShowReactions] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<{id: number; emoji: string; x: number}[]>([]);
  const reactionIdRef = useRef(0);
  const [audioAutoplayBlocked, setAudioAutoplayBlocked] = useState(false);
  // Theme
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('cr-theme') === 'dark') {
      setIsDark(true);
    }
  }, []);
  const toggleTheme = () => setIsDark(prev => { const next = !prev; if (typeof window !== 'undefined') localStorage.setItem('cr-theme', next ? 'dark' : 'light'); return next; });
  // Spotlight: teacher/admin watches a specific peer; students watch teacher by default
  const isHost = user.role === 'teacher' || user.role === 'admin' || user.role === 'super_admin';
  const [spotlightId, setSpotlightId] = useState<string | null>(isHost ? 'local' : null);
  const [showStrip, setShowStrip] = useState(true);
  const [isMirrored, setIsMirrored] = useState(false);
  const elapsedTimerRef = useRef<any>(null);

  useEffect(() => {
    peersRef.current = peers;
  }, [peers]);

  const socketRef = useRef<Socket | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<any>(null);
  const recvTransportRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioProducerRef = useRef<any>(null);
  const videoProducerRef = useRef<any>(null);
  const screenProducerRef = useRef<any>(null);
  const consumersMap = useRef<Map<string, any>>(new Map());
  const pendingProducersRef = useRef<Array<{ producerId: string; peerId: string; kind: string; isScreen: boolean }>>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioIntervalRef = useRef<any>(null);
  const localScreenStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const socket = io('/', { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-room', { roomCode, username: user.username, role: user.role, mobile, roomType }, async (response: any) => {
        if (response.error) {
          alert(`Failed to join classroom: ${response.error}`);
          onLeave();
          return;
        }
        peersRef.current = response.peers || [];
        setPeers(response.peers || []);
        setCommentsEnabled(response.commentsEnabled !== false);
        startTimeRef.current = new Date();
        elapsedTimerRef.current = setInterval(() => {
          if (startTimeRef.current) {
            setElapsed(Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000));
          }
        }, 1000);
        await initMediasoup(response.rtpCapabilities);
      });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('peer-joined', ({ peerId, username, role }) => {
      setPeers(prev => {
        const next = [...prev.filter(p => p.peerId !== peerId), { peerId, username, role }];
        peersRef.current = next;
        return next;
      });
    });

    socket.on('peer-left', ({ peerId }) => {
      setPeers(prev => {
        const next = prev.filter(p => p.peerId !== peerId);
        peersRef.current = next;
        return next;
      });
      setRemoteStreams(prev => prev.filter(s => s.peerId !== peerId));
    });

    socket.on('new-producer', async ({ producerId, peerId, kind, appData }) => {
      await consumeProducer(producerId, peerId, kind, appData?.label === 'screen');
    });

    socket.on('screen-share-stopped', ({ peerId }: { peerId: string }) => {
      setRemoteStreams(prev => prev.filter(s => !(s.peerId === peerId && s.isScreen)));
    });

    socket.on('producer-closed', ({ producerId, peerId }: { producerId: string; peerId: string }) => {
      setRemoteStreams(prev => prev.filter(s => !(s.peerId === peerId && s.isScreen)));
    });

    socket.on('peer-mute-toggled', ({ peerId, kind, muted }) => {
      setPeers(prev => prev.map(p => {
        if (p.peerId === peerId) {
          return kind === 'audio' ? { ...p, isMuted: muted } : { ...p, isCamOff: muted };
        }
        return p;
      }));
    });

    socket.on('peer-speaking', ({ peerId, speaking }) => {
      setPeers(prev => prev.map(p => p.peerId === peerId ? { ...p, isSpeaking: speaking } : p));
    });

    socket.on('host-instruct-mute', () => toggleMic(false));
    socket.on('host-instruct-remove', () => {
      alert('You have been removed from the classroom by the host.');
      handleLeave();
    });
    socket.on('comments-toggled', ({ enabled }) => setCommentsEnabled(enabled));
    socket.on('hand-raised', ({ peerId, raised }: { peerId: string; raised: boolean }) => {
      setRaisedHands(prev => {
        const next = new Set(prev);
        if (raised) {
          next.add(peerId);
          // Play a soft notification sound
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
            gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.4);
            setTimeout(() => ctx.close(), 500);
          } catch (e) {}
        } else {
          next.delete(peerId);
        }
        return next;
      });
    });
    socket.on('reaction', ({ emoji }: { emoji: string }) => {
      addFloatingReaction(emoji);
    });

    socket.on('recording-started', () => { setIsRecording(true); setRecordingUrl(null); });
    socket.on('recording-stopped', ({ downloadUrl }) => { setIsRecording(false); setRecordingUrl(downloadUrl); });

    const unlockAudioOnUserInteraction = () => {
      document.querySelectorAll('audio, video').forEach((el: any) => {
        if (el.srcObject) {
          el.play().catch(() => {});
        }
      });
      setAudioAutoplayBlocked(false);
    };

    window.addEventListener('click', unlockAudioOnUserInteraction);
    window.addEventListener('touchstart', unlockAudioOnUserInteraction);

    return () => {
      window.removeEventListener('click', unlockAudioOnUserInteraction);
      window.removeEventListener('touchstart', unlockAudioOnUserInteraction);
      cleanup();
    };
  }, [roomCode]);

  const addFloatingReaction = (emoji: string) => {
    const id = ++reactionIdRef.current;
    const x = 20 + Math.random() * 60;
    setFloatingReactions(prev => [...prev, { id, emoji, x }]);
    setTimeout(() => setFloatingReactions(prev => prev.filter(r => r.id !== id)), 3000);
  };

  const sendReaction = (emoji: string) => {
    socketRef.current?.emit('reaction', { roomCode, emoji });
    addFloatingReaction(emoji);
    setShowReactions(false);
  };

  const toggleHandRaise = () => {
    const next = !handRaised;
    setHandRaised(next);
    socketRef.current?.emit('hand-raise', { roomCode, raised: next });
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  const startSpeakerDetection = (stream: MediaStream) => {
    try {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let speakingDebounce = 0;
      let lastSpeakingState = false;
      audioIntervalRef.current = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const average = sum / bufferLength;
        const isCurrentlySpeaking = average > 25;
        if (isCurrentlySpeaking) {
          speakingDebounce = 5;
          if (!lastSpeakingState) { lastSpeakingState = true; setIsLocalSpeaking(true); socketRef.current?.emit('speaking', { roomCode, speaking: true }); }
        } else {
          if (speakingDebounce > 0) { speakingDebounce--; }
          else { if (lastSpeakingState) { lastSpeakingState = false; setIsLocalSpeaking(false); socketRef.current?.emit('speaking', { roomCode, speaking: false }); } }
        }
      }, 150);
    } catch (err) { console.warn('Speaker detection error:', err); }
  };

  const initMediasoup = async (rtpCapabilities: any) => {
    try {
      const device = new Device();
      await device.load({ routerRtpCapabilities: rtpCapabilities });
      deviceRef.current = device;
      await createSendTransport();
      await createRecvTransport();
      setMicEnabled(false);
      setVideoEnabled(false);

      // Flush any queued producers that arrived during transport initialization
      const queued = [...pendingProducersRef.current];
      pendingProducersRef.current = [];
      for (const prod of queued) {
        await consumeProducer(prod.producerId, prod.peerId, prod.kind, prod.isScreen);
      }

      socketRef.current?.emit('get-producers', { roomCode }, async (producersList: any[]) => {
        for (const prod of producersList) {
          await consumeProducer(prod.producerId, prod.peerId, prod.kind, prod.appData?.label === 'screen');
        }
      });
    } catch (err) { console.error('Error initializing mediasoup:', err); }
  };

  const DEFAULT_ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ];

  const createSendTransport = async () => {
    return new Promise<void>((resolve, reject) => {
      socketRef.current?.emit('create-transport', { roomCode, direction: 'send' }, async (params: any) => {
        if (params.error) { reject(params.error); return; }
        const transportParams = {
          ...params,
          iceServers: params.iceServers && params.iceServers.length > 0 ? params.iceServers : DEFAULT_ICE_SERVERS
        };
        const transport = deviceRef.current!.createSendTransport(transportParams);
        sendTransportRef.current = transport;
        transport.on('connect', ({ dtlsParameters }, callback, errback) => {
          socketRef.current?.emit('connect-transport', { roomCode, transportId: transport.id, dtlsParameters }, (res: any) => {
            if (res.error) errback(res.error); else callback();
          });
        });
        transport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
          socketRef.current?.emit('produce', { roomCode, transportId: transport.id, kind, rtpParameters, appData }, (res: any) => {
            if (res.error) errback(res.error); else callback({ id: res.id });
          });
        });
        resolve();
      });
    });
  };

  const createRecvTransport = async () => {
    return new Promise<void>((resolve, reject) => {
      socketRef.current?.emit('create-transport', { roomCode, direction: 'recv' }, async (params: any) => {
        if (params.error) { reject(params.error); return; }
        const transportParams = {
          ...params,
          iceServers: params.iceServers && params.iceServers.length > 0 ? params.iceServers : DEFAULT_ICE_SERVERS
        };
        const transport = deviceRef.current!.createRecvTransport(transportParams);
        recvTransportRef.current = transport;
        transport.on('connect', ({ dtlsParameters }, callback, errback) => {
          socketRef.current?.emit('connect-transport', { roomCode, transportId: transport.id, dtlsParameters }, (res: any) => {
            if (res.error) errback(res.error); else callback();
          });
        });
        resolve();
      });
    });
  };

  const consumeProducer = async (producerId: string, peerId: string, kind: string, isScreen: boolean) => {
    if (!recvTransportRef.current) {
      console.log('recvTransport not ready yet, queuing producer:', producerId);
      pendingProducersRef.current.push({ producerId, peerId, kind, isScreen });
      return;
    }
    socketRef.current?.emit('consume', {
      roomCode, transportId: recvTransportRef.current.id, producerId, rtpCapabilities: deviceRef.current!.rtpCapabilities
    }, async (params: any) => {
      if (params.error) { console.error('Consume error:', params.error); return; }
      try {
        const consumer = await recvTransportRef.current.consume(params);
        consumersMap.current.set(consumer.id, consumer);
        socketRef.current?.emit('resume-consumer', { roomCode, consumerId: consumer.id }, () => {});
        const track = consumer.track;
        const info = peersRef.current.find(p => p.peerId === peerId) || { username: 'Teacher', role: 'teacher' };
        setRemoteStreams(prev => {
          const existingIdx = prev.findIndex(s => s.peerId === peerId && s.isScreen === isScreen);
          if (existingIdx !== -1) {
            const oldItem = prev[existingIdx];
            const otherTracks = oldItem.stream.getTracks().filter(t => t.kind !== track.kind);
            const newStream = new MediaStream([...otherTracks, track]);
            const updated = [...prev];
            updated[existingIdx] = { ...oldItem, stream: newStream };
            return updated;
          } else {
            return [...prev, { peerId, username: info.username, role: info.role, stream: new MediaStream([track]), isScreen }];
          }
        });
        consumer.on('transportclose', () => removeConsumer(consumer.id, peerId, isScreen));
        consumer.on('producerclose', () => removeConsumer(consumer.id, peerId, isScreen));
      } catch (err) { console.error('Error consuming producer:', err); }
    });
  };

  const removeConsumer = (consumerId: string, peerId: string, isScreen: boolean) => {
    const consumer = consumersMap.current.get(consumerId);
    if (consumer) {
      consumer.close();
      consumersMap.current.delete(consumerId);
      const track = consumer.track;
      setRemoteStreams(prev => {
        const existingIdx = prev.findIndex(s => s.peerId === peerId && s.isScreen === isScreen);
        if (existingIdx === -1) return prev;
        const oldItem = prev[existingIdx];
        const stream = oldItem.stream;
        stream.removeTrack(track);
        track.stop();
        if (stream.getTracks().length === 0) return prev.filter((_, idx) => idx !== existingIdx);
        const newStream = new MediaStream(stream.getTracks());
        const updated = [...prev];
        updated[existingIdx] = { ...oldItem, stream: newStream };
        return updated;
      });
    }
  };

  const toggleMic = async (forceState?: boolean) => {
    if (roomType === 'live_class' && user.role === 'student') return;
    const nextState = forceState !== undefined ? forceState : !micEnabled;
    if (nextState) {
      try {
        if (audioProducerRef.current) {
          audioProducerRef.current.resume();
        } else {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const track = stream.getAudioTracks()[0];
          if (localStreamRef.current) localStreamRef.current.getAudioTracks().forEach(t => t.stop());
          const videoTracks = localStreamRef.current ? localStreamRef.current.getVideoTracks() : [];
          localStreamRef.current = new MediaStream([track, ...videoTracks]);
          startSpeakerDetection(localStreamRef.current);
          if (sendTransportRef.current && deviceRef.current?.canProduce('audio')) {
            audioProducerRef.current = await sendTransportRef.current.produce({ track, appData: { label: 'audio' } });
          }
        }
        setMicEnabled(true);
        socketRef.current?.emit('mute-toggle', { roomCode, kind: 'audio', muted: false });
      } catch (err) { console.error('Error starting mic:', err); }
    } else {
      if (audioProducerRef.current) {
        const prodId = audioProducerRef.current.id;
        audioProducerRef.current.track.stop();
        audioProducerRef.current.close();
        audioProducerRef.current = null;
        socketRef.current?.emit('close-producer', { roomCode, producerId: prodId });
      }
      if (localStreamRef.current) localStreamRef.current.getAudioTracks().forEach(t => t.stop());
      const videoTracks = localStreamRef.current ? localStreamRef.current.getVideoTracks() : [];
      localStreamRef.current = new MediaStream([...videoTracks]);
      setIsLocalSpeaking(false);
      socketRef.current?.emit('speaking', { roomCode, speaking: false });
      setMicEnabled(false);
      socketRef.current?.emit('mute-toggle', { roomCode, kind: 'audio', muted: true });
    }
  };

  const toggleCam = async () => {
    if (roomType === 'live_class' && user.role === 'student') return;
    const nextState = !videoEnabled;
    if (nextState) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, frameRate: 30 } });
        const track = stream.getVideoTracks()[0];
        if (localStreamRef.current) localStreamRef.current.getVideoTracks().forEach(t => t.stop());
        const audioTracks = localStreamRef.current ? localStreamRef.current.getAudioTracks() : [];
        localStreamRef.current = new MediaStream([track, ...audioTracks]);
        if (sendTransportRef.current && deviceRef.current?.canProduce('video')) {
          videoProducerRef.current = await sendTransportRef.current.produce({ track, appData: { label: 'video' } });
        }
        setVideoEnabled(true);
        socketRef.current?.emit('mute-toggle', { roomCode, kind: 'video', muted: false });
      } catch (err) { console.error('Error starting video:', err); }
    } else {
      if (videoProducerRef.current) {
        const prodId = videoProducerRef.current.id;
        videoProducerRef.current.track.stop();
        videoProducerRef.current.close();
        videoProducerRef.current = null;
        socketRef.current?.emit('close-producer', { roomCode, producerId: prodId });
      }
      if (localStreamRef.current) localStreamRef.current.getVideoTracks().forEach(t => t.stop());
      const audioTracks = localStreamRef.current ? localStreamRef.current.getAudioTracks() : [];
      localStreamRef.current = new MediaStream([...audioTracks]);
      setVideoEnabled(false);
      socketRef.current?.emit('mute-toggle', { roomCode, kind: 'video', muted: true });
    }
  };

  const toggleScreenShare = async () => {
    if (roomType === 'live_class' && user.role === 'student') return;
    try {
      if (!screenShareEnabled) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        localScreenStreamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        screenProducerRef.current = await sendTransportRef.current.produce({ track, appData: { label: 'screen' } });
        setScreenShareEnabled(true);
        track.onended = () => stopScreenShare();
      } else {
        stopScreenShare();
      }
    } catch (err) { console.error('Screen sharing error:', err); }
  };

  const stopScreenShare = () => {
    if (screenProducerRef.current) {
      const prodId = screenProducerRef.current.id;
      if (screenProducerRef.current.track) screenProducerRef.current.track.stop();
      socketRef.current?.emit('screen-share-stopped', { roomCode });
      socketRef.current?.emit('close-producer', { roomCode, producerId: prodId });
      screenProducerRef.current.close();
      screenProducerRef.current = null;
    } else {
      socketRef.current?.emit('screen-share-stopped', { roomCode });
    }
    if (localScreenStreamRef.current) { localScreenStreamRef.current.getTracks().forEach(t => t.stop()); localScreenStreamRef.current = null; }
    setScreenShareEnabled(false);
  };

  const hostMutePeer = (peerId: string) => { socketRef.current?.emit('host-mute-peer', { roomCode, peerId }); };
  const hostRemovePeer = (peerId: string) => {
    if (confirm('Remove this participant?')) socketRef.current?.emit('host-remove-peer', { roomCode, peerId });
  };

  const toggleRecording = () => {
    if (isRecording) {
      socketRef.current?.emit('stop-recording', { roomCode }, (res: any) => { if (res.error) alert(res.error); });
    } else {
      socketRef.current?.emit('start-recording', { roomCode }, (res: any) => { if (res.error) alert(res.error); });
    }
  };

  const handleLeave = () => { cleanup(); onLeave(); };

  const cleanup = () => {
    stopScreenShare();
    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
    if (audioProducerRef.current) audioProducerRef.current.close();
    if (videoProducerRef.current) videoProducerRef.current.close();
    consumersMap.current.forEach(c => c.close());
    consumersMap.current.clear();
    if (sendTransportRef.current) sendTransportRef.current.close();
    if (recvTransportRef.current) recvTransportRef.current.close();
    if (socketRef.current) socketRef.current.disconnect();
  };

  const getGridCols = (count: number) => {
    if (count <= 1) return 'grid-cols-1';
    if (count <= 2) return 'grid-cols-1 md:grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    return 'grid-cols-2 lg:grid-cols-3';
  };

  const isHostRole = (role?: string) => {
    if (!role) return false;
    const r = role.toLowerCase();
    return r === 'teacher' || r === 'admin' || r === 'super_admin' || r === 'skd-teacher' || r === 'instructor' || r === 'host';
  };

  // Build tiles
  const participantsMap = new Map<string, any>();
  peers.forEach(p => {
    const remoteStream = remoteStreams.find(s => s.peerId === p.peerId && !s.isScreen);
    const hasLiveVideoTrack = remoteStream?.stream ? remoteStream.stream.getVideoTracks().some(t => t.readyState === 'live') : false;
    const isCamOff = p.isCamOff === true && !hasLiveVideoTrack;
    participantsMap.set(p.peerId, {
      peerId: p.peerId,
      username: p.username,
      role: p.role,
      isMuted: p.isMuted ?? false,
      isCamOff,
      isSpeaking: p.isSpeaking ?? false,
      stream: remoteStream?.stream,
      isLocal: false,
      isScreen: false
    });
  });

  // Include any remote streams that arrived before peer list state updated
  remoteStreams.filter(s => !s.isScreen).forEach(s => {
    if (!participantsMap.has(s.peerId)) {
      const hasLiveVideoTrack = s.stream ? s.stream.getVideoTracks().some(t => t.readyState === 'live') : false;
      participantsMap.set(s.peerId, {
        peerId: s.peerId,
        username: s.username || 'Teacher',
        role: s.role || 'teacher',
        isMuted: false,
        isCamOff: !hasLiveVideoTrack,
        isSpeaking: false,
        stream: s.stream,
        isLocal: false,
        isScreen: false
      });
    }
  });

  const participants = [
    { peerId: 'local', username: user.username, role: user.role, isMuted: !micEnabled, isCamOff: !videoEnabled, isSpeaking: isLocalSpeaking, stream: localStreamRef.current, isLocal: true, isScreen: false },
    ...Array.from(participantsMap.values())
  ];

  const screenShares = remoteStreams.filter(s => s.isScreen).map(s => ({
    peerId: `${s.peerId}-screen`, username: `${s.username} (Screen)`, role: s.role, isMuted: true, isCamOff: false, isSpeaking: false, stream: s.stream, isLocal: false, isScreen: true
  }));

  if (screenShareEnabled && localScreenStreamRef.current) {
    screenShares.push({ peerId: 'local-screen', username: `${user.username} (Your Screen)`, role: user.role, isMuted: true, isCamOff: false, isSpeaking: false, stream: localScreenStreamRef.current, isLocal: true, isScreen: true });
  }

  let allTiles = [...participants, ...screenShares];

  // Student: sees teacher/admin tiles, screen shares, or any active producing tile
  if (roomType === 'live_class' && user.role === 'student') {
    allTiles = allTiles.filter(t => t.isLocal || t.isScreen || isHostRole(t.role) || (t.stream && t.stream.getTracks().length > 0));
  }

  const totalVideoTiles = allTiles.length;
  const hasScreenShare = screenShares.length > 0;
  const primaryScreenShare = screenShares[0];

  const teacherTile = allTiles.find(t => isHostRole(t.role) && !t.isScreen);

  // Auto-spotlight / Grid View logic:
  // 1. If user pinned a tile -> Pinned tile takes main stage
  // 2. If screen share exists -> Screen Share ALWAYS takes main stage!
  // 3. If spotlightId is explicitly null -> Grid View (no spotlight)!
  // 4. If spotlightId has a value -> Spotlight that tile!
  // 5. Student View -> Teacher is pinned by default on the screen!
  let effectiveSpotlightId: string | null = null;
  if (pinnedPeerId && allTiles.some(t => t.peerId === pinnedPeerId)) {
    effectiveSpotlightId = pinnedPeerId;
  } else if (hasScreenShare) {
    effectiveSpotlightId = primaryScreenShare.peerId;
  } else if (spotlightId === null) {
    // Explicit Grid View!
    effectiveSpotlightId = null;
  } else if (spotlightId && allTiles.some(t => t.peerId === spotlightId)) {
    effectiveSpotlightId = spotlightId;
  } else if (isHost) {
    effectiveSpotlightId = allTiles.some(t => t.peerId === 'local') ? 'local' : (allTiles[0]?.peerId || null);
  } else if (teacherTile) {
    // Pin teacher by default on student screen
    effectiveSpotlightId = teacherTile.peerId;
  } else if (allTiles.length > 0) {
    effectiveSpotlightId = allTiles[0].peerId;
  }

  const spotlightTile = effectiveSpotlightId ? allTiles.find(t => t.peerId === effectiveSpotlightId) : (allTiles[0] || null);
  const stripTiles = effectiveSpotlightId ? allTiles.filter(t => t.peerId !== effectiveSpotlightId) : [];

  // OBS Stream key / URL (for teacher only — just show room info for OBS connection)
  const obsRtmpUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/live/stream`;
  const obsStreamKey = roomCode;

  const copyObsInfo = (text: string) => {
    navigator.clipboard.writeText(text).then(() => { setObsCopied(true); setTimeout(() => setObsCopied(false), 2000); });
  };

  const canControl = roomType !== 'live_class' || isHost;

  // --- RENDER TILE ---
  const renderTile = (tile: any, isThumbnail = false) => {
    if (!tile) return null;
    const { peerId, username, role, isMuted, isCamOff, isSpeaking, stream, isLocal, isScreen } = tile;
    const hasLiveVideoTrack = stream ? stream.getVideoTracks().some((t: any) => t.readyState === 'live') : false;
    const showVideo = (hasLiveVideoTrack || !isCamOff) && !!stream && stream.getVideoTracks().length > 0;
    const initials = username.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
    const displayName = isLocal ? `${username} (You)` : username;

    return (
      <div
        key={peerId}
        className={`relative rounded-2xl overflow-hidden border transition-all duration-300 group flex items-center justify-center ${
          isSpeaking ? 'border-green-500 shadow-[0_0_0_2px_rgba(34,197,94,0.4)]' : ''
        } ${isThumbnail ? 'h-full w-44 md:w-full md:h-28 flex-shrink-0' : 'w-full h-full'}`}
        style={{
          minHeight: isThumbnail ? undefined : '160px',
          background: showVideo ? '#000000' : (isDark ? '#0d1117' : '#f8fafc'),
          borderColor: isSpeaking ? undefined : 'var(--cr-border)'
        }}
      >
        {/* Render dedicated audio tag for remote stream so voice always plays seamlessly */}
        {!isLocal && stream && (
          <audio
            autoPlay
            playsInline
            ref={el => {
              if (el) {
                if (el.srcObject !== stream) {
                  el.srcObject = stream;
                }
                const p = el.play();
                if (p !== undefined) {
                  p.catch(() => {
                    setAudioAutoplayBlocked(true);
                  });
                }
              }
            }}
          />
        )}

        {showVideo ? (
          <video
            autoPlay
            playsInline
            muted={isLocal || isScreen}
            ref={el => {
              if (el) {
                if (el.srcObject !== stream) {
                  el.srcObject = stream;
                }
                const p = el.play();
                if (p !== undefined) {
                  p.catch(() => {
                    setAudioAutoplayBlocked(true);
                    if (isLocal || isScreen) {
                      el.muted = true;
                      el.play().catch(() => {});
                    }
                  });
                }
              }
            }}
            className={`w-full h-full object-contain ${isLocal && !isScreen && isMirrored ? 'scale-x-[-1]' : ''}`}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center"
            style={{
              background: isDark
                ? 'radial-gradient(ellipse at 50% 40%, rgba(30,30,50,1) 0%, #0d1117 100%)'
                : 'radial-gradient(ellipse at 50% 40%, #ffffff 0%, #e2e8f0 100%)'
            }}>
            <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br ${getAvatarGradient(role)} flex items-center justify-center text-white text-xl font-bold shadow-lg transition-all duration-300 ${
              isSpeaking ? 'ring-4 ring-green-400 shadow-[0_0_20px_rgba(34,197,94,0.5)] scale-110' : ''
            }`}>
              {initials}
            </div>
            {!isThumbnail && (
              <span className="mt-3 text-sm font-bold" style={{ color: isDark ? 'rgba(255,255,255,0.85)' : '#1e293b' }}>{displayName}</span>
            )}
          </div>
        )}

        {/* Speaking ring overlay */}
        {isSpeaking && (
          <div className="absolute inset-0 rounded-2xl pointer-events-none border-2 border-green-400 animate-pulse" />
        )}

        {/* Hand Raised Badge */}
        {(raisedHands.has(peerId) || (isLocal && handRaised)) && (
          <div className="absolute top-2 left-2 z-20">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-400/25 border border-yellow-400/50 backdrop-blur-md shadow-md">
              <span className="text-base animate-bounce">✋</span>
              {!isThumbnail && <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-300">Hand Raised</span>}
            </div>
          </div>
        )}

        {/* Hover Controls */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col justify-between p-3 z-10">
          <div className="flex justify-end gap-1.5">
            {isLocal && !isScreen && (
              <button
                onClick={(e) => { e.stopPropagation(); setIsMirrored(p => !p); }}
                title={isMirrored ? "Un-mirror Video (Normal Text)" : "Mirror Video (Selfie View)"}
                className={`p-1.5 rounded-lg transition-all ${isMirrored ? 'bg-violet-600 text-white' : 'bg-black/50 backdrop-blur text-white/80 hover:bg-black/70 hover:text-white'}`}
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setPinnedPeerId(pinnedPeerId === peerId ? null : peerId)}
              title={pinnedPeerId === peerId ? "Unpin" : "Pin"}
              className={`p-1.5 rounded-lg transition-all ${pinnedPeerId === peerId ? 'bg-violet-600 text-white' : 'bg-black/50 backdrop-blur text-white/80 hover:bg-black/70 hover:text-white'}`}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-white drop-shadow truncate max-w-[110px]">{displayName}</span>
              {/* Only show role badge for non-students or for host tiles */}
              {(role !== 'student') && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${getRoleBadgeStyle(role)}`}>
                  {getRoleLabel(role)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {isMuted && <div className="p-1 rounded-md bg-red-500/80"><MicOff className="w-3 h-3 text-white" /></div>}
              {isSpeaking && <div className="flex gap-[2px] items-end h-3"><div className="w-[3px] rounded-full bg-green-400 animate-[bounce_0.5s_ease-in-out_infinite]" style={{height:'8px'}} /><div className="w-[3px] rounded-full bg-green-400 animate-[bounce_0.5s_ease-in-out_0.1s_infinite]" style={{height:'12px'}} /><div className="w-[3px] rounded-full bg-green-400 animate-[bounce_0.5s_ease-in-out_0.2s_infinite]" style={{height:'6px'}} /></div>}
            </div>
          </div>
        </div>

        {/* Always-visible bottom badge */}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-2 opacity-100 group-hover:opacity-0 transition-opacity flex items-center justify-between pointer-events-none"
          style={{
            background: isDark
              ? 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)'
              : 'linear-gradient(to top, rgba(241,245,249,0.95), transparent)',
            color: isDark ? '#ffffff' : '#0f172a'
          }}>
          <span className="text-[11px] font-bold truncate drop-shadow-sm">{displayName}</span>
          {isMuted && <MicOff className="w-3 h-3 text-red-500 flex-shrink-0" />}
        </div>
      </div>
    );
  };

  const toggleSidebar = (panel: typeof activeSidebar) => {
    setActiveSidebar(prev => prev === panel ? null : panel);
  };

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{
        fontFamily: "'Inter', sans-serif",
        background: isDark ? '#080c12' : '#f1f3f8',
        color: isDark ? '#fff' : '#0f172a',
        '--cr-border': isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)',
        '--cr-surface': isDark ? 'rgba(12,16,24,0.97)' : 'rgba(255,255,255,0.95)',
        '--cr-card': isDark ? '#0d1117' : '#ffffff',
        '--cr-muted': isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)',
        '--cr-subtle': isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      } as React.CSSProperties}
    >
      {audioAutoplayBlocked && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs md:text-sm font-semibold py-2 px-4 flex items-center justify-between shadow-lg z-50 animate-pulse">
          <div className="flex items-center gap-2">
            <span>🔊</span>
            <span>Browser blocked unmuted audio playback. Click to enable teacher's voice.</span>
          </div>
          <button
            onClick={() => {
              document.querySelectorAll('audio, video').forEach((el: any) => {
                el.muted = false;
                el.play().catch(() => {});
              });
              setAudioAutoplayBlocked(false);
            }}
            className="ml-4 px-3 py-1 bg-white text-amber-800 font-bold rounded-lg text-xs hover:bg-amber-50 shadow-md transition-all flex-shrink-0"
          >
            Enable Audio
          </button>
        </div>
      )}
      {/* Suppress Next.js dev toolbar */}
      <style>{`nextjs-portal { display: none !important; } #__next-build-watcher { display: none !important; }`}</style>

      {/* Floating Reactions */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        {floatingReactions.map(r => (
          <div key={r.id} className="absolute bottom-24 text-4xl" style={{ left: `${r.x}%`, animation: 'floatUp 3s ease-out forwards' }}>
            {r.emoji}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0.5); opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(-60vh) scale(1.2); opacity: 0; }
        }
      `}</style>

      {/* === TOP NAVBAR === */}
      <header className="flex-shrink-0 h-14 flex items-center justify-between px-4 md:px-6 border-b relative z-10"
        style={{ background: 'var(--cr-surface)', backdropFilter: 'blur(20px)', borderColor: 'var(--cr-border)' }}>
        {/* Left: Brand + class info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-bold text-sm leading-none" style={{ color: isDark ? '#fff' : '#0f172a' }}>{batchName || 'Live Class'}</span>
              <span className="text-[10px] font-mono mt-0.5 uppercase tracking-widest" style={{ color: 'var(--cr-muted)' }}>{roomCode}</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono" style={{ background: 'var(--cr-subtle)', color: 'var(--cr-muted)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {formatTime(elapsed)}
          </div>
        </div>

        {/* Center: Status badge */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          {isRecording ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 animate-pulse">
              <CircleDot className="w-3 h-3" /> RECORDING
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-green-500 bg-green-500/10 border border-green-500/20">
              <Radio className="w-3 h-3" /> LIVE
            </div>
          )}
        </div>

        {/* Right: status + layout switcher + theme toggle */}
        <div className="flex items-center gap-2">
          {/* Layout mode switcher for Host */}
          {isHost && totalVideoTiles > 1 && (
            <Tip label={effectiveSpotlightId ? "Switch to All Grid View" : "Switch to Spotlight View"} position="bottom">
              <button
                type="button"
                onClick={() => {
                  if (effectiveSpotlightId) {
                    setSpotlightId(null);
                    setPinnedPeerId(null);
                  } else {
                    setSpotlightId('local');
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border shadow-sm"
                style={{
                  background: effectiveSpotlightId ? 'var(--cr-subtle)' : 'rgba(124,58,237,0.15)',
                  borderColor: effectiveSpotlightId ? 'var(--cr-border)' : 'rgba(124,58,237,0.4)',
                  color: effectiveSpotlightId ? 'inherit' : '#8b5cf6'
                }}
              >
                {effectiveSpotlightId ? <LayoutGrid className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">{effectiveSpotlightId ? 'Grid View' : 'Spotlight'}</span>
              </button>
            </Tip>
          )}

          <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${connected ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-400'}`}>
            {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span className="hidden lg:inline">{connected ? 'Connected' : 'Reconnecting...'}</span>
          </div>

          {/* Clickable participants counter */}
          <Tip label="Participants List" position="bottom">
            <button
              type="button"
              onClick={() => toggleSidebar('participants')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105 border"
              style={{ background: 'var(--cr-subtle)', borderColor: 'var(--cr-border)', color: 'inherit' }}
            >
              <Users className="w-3.5 h-3.5 text-violet-500" />
              <span>{peers.length + 1}</span>
            </button>
          </Tip>

          {recordingUrl && (
            <a href={recordingUrl} download className="text-xs px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded-full font-medium transition">Download</a>
          )}

          {/* Theme Toggle */}
          <Tip label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'} position="bottom">
            <button
              type="button"
              onClick={toggleTheme}
              className="w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:scale-110 active:scale-95 border"
              style={{ background: 'var(--cr-subtle)', borderColor: 'var(--cr-border)', color: 'inherit' }}
            >
              <span className="text-base select-none">{isDark ? '☀️' : '🌙'}</span>
            </button>
          </Tip>
        </div>
      </header>

      {/* === MAIN CONTENT === */}
      <div className="flex-1 flex min-h-0">
        {/* Video Grid / Main Stage */}
        <div className="flex-1 flex flex-col min-h-0 p-3 md:p-4 gap-3 md:gap-4">

          {allTiles.length === 0 ? (
            /* Waiting for Host / Stream */
            <div className="flex flex-col items-center justify-center col-span-full rounded-2xl border h-full"
              style={{ background: isDark ? 'radial-gradient(ellipse at center, #1a1f2e 0%, #080c12 100%)' : 'radial-gradient(ellipse at center, #f8fafc 0%, #e2e8f0 100%)', borderColor: 'var(--cr-border)' }}>
              <div className="w-20 h-20 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4 shadow-lg">
                <Video className="w-10 h-10 text-violet-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">{isHost ? 'Waiting for participants' : 'Waiting for Host'}</h3>
              <p className="text-sm" style={{ color: 'var(--cr-muted)' }}>
                {isHost ? 'Students will appear here when they join' : 'The live broadcast will begin shortly...'}
              </p>
            </div>
          ) : effectiveSpotlightId && spotlightTile ? (
            /* Spotlight Mode: Main Stage (Screen Share or Spotlighted User) + Collapsible Strip */
            <div className="flex-1 flex flex-col md:flex-row gap-3 min-h-0 relative">
              {/* Main Stage */}
              <div className="flex-1 min-h-0 relative rounded-2xl overflow-hidden shadow-sm">
                {renderTile(spotlightTile)}
                {/* Spotlight label overlay */}
                <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shadow-md backdrop-blur-md border border-white/10"
                    style={{ background: 'rgba(15,23,42,0.75)', color: '#fff' }}>
                    <Eye className="w-3.5 h-3.5 text-violet-400" />
                    <span>
                      {spotlightTile?.isScreen
                        ? `🖥️ ${spotlightTile?.username}`
                        : `Watching: ${spotlightTile?.isLocal ? `${user.username} (You)` : spotlightTile?.username}`}
                    </span>
                  </div>
                </div>

                {/* STUDENT Presentation mode: Teacher webcam as floating PIP in bottom-right corner */}
                {!isHost && hasScreenShare && stripTiles.length > 0 && showStrip && (
                  <div className="absolute bottom-4 right-4 z-30 w-44 h-28 sm:w-52 sm:h-32 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 hover:scale-105 transition-all">
                    {renderTile(stripTiles[0], true)}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowStrip(false); }}
                      className="absolute top-1.5 right-1.5 z-40 p-1 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs"
                      title="Hide camera"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Strip toggle button if collapsed */}
                {stripTiles.length > 0 && !showStrip && (
                  <button
                    type="button"
                    onClick={() => setShowStrip(true)}
                    className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-md border transition-all hover:scale-105"
                    style={{ background: 'var(--cr-surface)', borderColor: 'var(--cr-border)', color: 'inherit' }}
                  >
                    <PanelRightOpen className="w-3.5 h-3.5 text-violet-500" />
                    <span>Show ({stripTiles.length})</span>
                  </button>
                )}
              </div>

              {/* HOST / TEACHER Thumbnail strip (clean, no text clutter) */}
              {isHost && stripTiles.length > 0 && showStrip && (
                <div className="flex flex-row md:flex-col gap-2.5 h-28 md:h-full md:w-44 overflow-x-auto md:overflow-y-auto flex-shrink-0 p-1.5 rounded-2xl border transition-all shadow-sm"
                  style={{ background: 'var(--cr-surface)', borderColor: 'var(--cr-border)' }}>
                  
                  {/* Header of strip with close button */}
                  <div className="hidden md:flex items-center justify-end px-1 pb-1 border-b" style={{ borderColor: 'var(--cr-border)' }}>
                    <button
                      type="button"
                      onClick={() => setShowStrip(false)}
                      className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition text-xs"
                      style={{ color: 'var(--cr-muted)' }}
                      title="Hide list"
                    >
                      <PanelRightClose className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {stripTiles.map(t => (
                    <div
                      key={t.peerId}
                      className="relative flex-shrink-0 cursor-pointer rounded-2xl transition-all duration-150 hover:scale-[1.02]"
                      onClick={() => setSpotlightId(t.peerId)}
                      title={`Click to watch ${t.username}`}
                    >
                      {renderTile(t, true)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Multi-Tile Grid View (when no spotlight or screen share) */
            <div className={`grid gap-3 md:gap-4 flex-1 min-h-0 ${getGridCols(totalVideoTiles)} auto-rows-fr`}>
              {allTiles.map(t => (
                <div key={t.peerId} className="relative cursor-pointer group" onClick={() => setSpotlightId(t.peerId)} title={`Click to spotlight ${t.username}`}>
                  {renderTile(t, false)}
                  <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-violet-500/60 pointer-events-none transition-all" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Panel */}
        {activeSidebar && (
          <aside className="w-72 md:w-80 border-l flex flex-col flex-shrink-0"
            style={{ background: 'var(--cr-surface)', borderColor: 'var(--cr-border)' }}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--cr-border)' }}>
              <h3 className="font-semibold text-sm capitalize" style={{ color: isDark ? '#fff' : '#0f172a' }}>{activeSidebar}</h3>
              <button onClick={() => setActiveSidebar(null)} className="p-1 rounded-lg transition" style={{ color: 'var(--cr-muted)' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--cr-subtle)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              {activeSidebar === 'chat' && <ChatPanel roomCode={roomCode} socket={socketRef.current!} userRole={user.role} commentsEnabled={commentsEnabled} />}
              {activeSidebar === 'notes' && <NotesPanel roomCode={roomCode} socket={socketRef.current!} token={token} />}
              {activeSidebar === 'files' && <FilesPanel roomCode={roomCode} socket={socketRef.current!} token={token} />}
              {activeSidebar === 'participants' && (
                <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-2.5 h-full">
                  {/* Local User */}
                  <div className="flex items-center justify-between p-3 rounded-2xl border shadow-sm"
                    style={{ background: 'var(--cr-subtle)', borderColor: 'var(--cr-border)' }}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarGradient(user.role)} flex items-center justify-center text-white text-sm font-bold shadow-sm`}>
                        {user.username.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold leading-tight">{user.username} <span style={{ color: 'var(--cr-muted)' }}>(You)</span></p>
                        <p className="text-[11px] font-semibold text-violet-500">{getRoleLabel(user.role)}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {!micEnabled && <MicOff className="w-4 h-4 text-red-500" />}
                      {!videoEnabled && <VideoOff className="w-4 h-4 text-red-500" />}
                    </div>
                  </div>

                  {peers.map(p => (
                    <div key={p.peerId} className="flex items-center justify-between p-3 rounded-2xl border shadow-sm"
                      style={{ background: 'var(--cr-subtle)', borderColor: 'var(--cr-border)' }}>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarGradient(p.role)} flex items-center justify-center text-white text-sm font-bold shadow-sm`}>
                          {p.username.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-tight">{p.username}</p>
                          <p className={`text-[11px] font-semibold ${p.role === 'teacher' ? 'text-violet-500' : ''}`} style={{ color: p.role === 'teacher' ? undefined : 'var(--cr-muted)' }}>
                            {getRoleLabel(p.role)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {p.isMuted && <MicOff className="w-4 h-4 text-red-500" />}
                        {p.isSpeaking && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                        {isHost && (
                          <div className="flex gap-1 ml-1">
                            <button onClick={() => hostMutePeer(p.peerId)} className="p-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/25 text-yellow-600 dark:text-yellow-400 transition" title="Mute">
                              <VolumeX className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => hostRemovePeer(p.peerId)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-600 dark:text-red-400 transition" title="Remove">
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* === BOTTOM CONTROL BAR === */}
      <footer className="flex-shrink-0 border-t px-4 md:px-6 py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 relative z-10"
        style={{ background: 'var(--cr-surface)', borderColor: 'var(--cr-border)', backdropFilter: 'blur(20px)' }}>

        {/* Left: Class info on mobile */}
        <div className="sm:hidden text-xs font-mono truncate max-w-[120px]" style={{ color: 'var(--cr-muted)' }}>{batchName || roomCode}</div>

        {/* Left desktop: session info */}
        <div className="hidden sm:flex items-center gap-3 text-xs" style={{ color: 'var(--cr-muted)' }}>
          <span className="font-mono">{formatTime(elapsed)}</span>
          <span className="opacity-40">|</span>
          <span>{peers.length + 1} joined</span>
        </div>

        {/* Center: All Controls with Tooltips */}
        <div className="flex items-center justify-center gap-1.5 flex-1 sm:flex-none flex-wrap">
          {canControl ? (
            <>
              {/* Mic */}
              <Tip label={micEnabled ? 'Mute Mic' : 'Unmute Mic'}>
                <button onClick={() => toggleMic()}
                  className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 active:scale-95 ${
                    micEnabled
                      ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-600/30'
                      : 'bg-red-500/15 dark:bg-red-500/25 hover:bg-red-500/25 dark:hover:bg-red-500/40 text-red-600 dark:text-red-400 border border-red-500/30'
                  }`}>
                  {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>
              </Tip>

              {/* Camera */}
              <Tip label={videoEnabled ? 'Stop Camera' : 'Start Camera'}>
                <button onClick={toggleCam}
                  className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 active:scale-95 ${
                    videoEnabled
                      ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-600/30'
                      : 'bg-red-500/15 dark:bg-red-500/25 hover:bg-red-500/25 dark:hover:bg-red-500/40 text-red-600 dark:text-red-400 border border-red-500/30'
                  }`}>
                  {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
              </Tip>

              {/* Screen Share */}
              <Tip label={screenShareEnabled ? 'Stop Sharing' : 'Share Screen'}>
                <button onClick={toggleScreenShare}
                  className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 active:scale-95 border ${
                    screenShareEnabled ? 'bg-violet-500/25 text-violet-600 dark:text-violet-300 border-violet-400/50' : 'border-transparent hover:opacity-90'
                  }`}
                  style={{ background: screenShareEnabled ? undefined : 'var(--cr-subtle)', color: screenShareEnabled ? undefined : (isDark ? '#fff' : '#334155') }}>
                  <Monitor className="w-5 h-5" />
                </button>
              </Tip>

              {/* Hand Raise */}
              <Tip label={handRaised ? 'Lower Hand' : 'Raise Hand'}>
                <button onClick={toggleHandRaise}
                  className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 active:scale-95 border ${
                    handRaised ? 'bg-yellow-500/25 text-yellow-600 dark:text-yellow-300 border-yellow-400/50 animate-bounce' : 'border-transparent hover:opacity-90'
                  }`}
                  style={{ background: handRaised ? undefined : 'var(--cr-subtle)', color: handRaised ? undefined : (isDark ? '#fff' : '#334155') }}>
                  <Hand className="w-5 h-5" />
                </button>
              </Tip>

              {/* Recording (host only) */}
              {isHost && (
                <Tip label={isRecording ? 'Stop Recording' : 'Start Recording'}>
                  <button onClick={toggleRecording}
                    className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 active:scale-95 ${
                      isRecording ? 'bg-red-500 text-white shadow-lg shadow-red-900/50' : 'hover:opacity-90'
                    }`}
                    style={{ background: isRecording ? undefined : 'var(--cr-subtle)', color: isRecording ? undefined : (isDark ? '#fff' : '#334155') }}>
                    <CircleDot className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
                  </button>
                </Tip>
              )}

              {/* OBS (host only) */}
              {isHost && (
                <Tip label="OBS / Stream Setup">
                  <button onClick={() => setShowObsModal(true)}
                    className="flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 active:scale-95 hover:opacity-90"
                    style={{ background: 'var(--cr-subtle)', color: isDark ? '#fff' : '#334155' }}>
                    <Tv2 className="w-5 h-5" />
                  </button>
                </Tip>
              )}

              <div className="w-px h-8 mx-0.5" style={{ background: 'var(--cr-border)' }} />
            </>
          ) : (
            /* Student watching — show raise hand */
            <Tip label={handRaised ? 'Lower Hand' : 'Raise Hand'}>
              <button onClick={toggleHandRaise}
                className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 active:scale-95 border ${
                  handRaised ? 'bg-yellow-500/25 text-yellow-600 dark:text-yellow-300 border-yellow-400/50' : 'border-transparent hover:opacity-90'
                }`}
                style={{ background: handRaised ? undefined : 'var(--cr-subtle)', color: handRaised ? undefined : (isDark ? '#fff' : '#334155') }}>
                <Hand className={`w-5 h-5 ${handRaised ? 'animate-bounce' : ''}`} />
              </button>
            </Tip>
          )}

          {/* Reactions */}
          <div className="relative">
            <Tip label="Send Reaction">
              <button onClick={() => setShowReactions(p => !p)}
                className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 active:scale-95 ${
                  showReactions ? 'bg-violet-600 text-white' : 'hover:opacity-90'
                }`}
                style={{ background: showReactions ? undefined : 'var(--cr-subtle)', color: showReactions ? '#fff' : (isDark ? '#fff' : '#334155') }}>
                <Smile className="w-5 h-5" />
              </button>
            </Tip>
            {showReactions && (
              <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 flex gap-1.5 p-2 rounded-2xl border shadow-2xl z-50"
                style={{ background: 'var(--cr-surface)', borderColor: 'var(--cr-border)', backdropFilter: 'blur(20px)' }}>
                {REACTIONS.map(emoji => (
                  <button key={emoji} onClick={() => sendReaction(emoji)}
                    className="text-xl w-9 h-9 flex items-center justify-center rounded-xl hover:scale-125 transition-all duration-150 active:scale-110"
                    style={{ background: 'var(--cr-subtle)' }}>
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-8 mx-0.5" style={{ background: 'var(--cr-border)' }} />

          {/* Chat */}
          <Tip label="Chat">
            <button onClick={() => toggleSidebar('chat')}
              className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all active:scale-95 ${
                activeSidebar === 'chat' ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/50' : 'hover:opacity-90'
              }`}
              style={{ background: activeSidebar === 'chat' ? undefined : 'var(--cr-subtle)', color: activeSidebar === 'chat' ? '#fff' : (isDark ? '#fff' : '#334155') }}>
              <MessageSquare className="w-5 h-5" />
            </button>
          </Tip>

          {/* Notes */}
          <Tip label="Notes">
            <button onClick={() => toggleSidebar('notes')}
              className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all active:scale-95 ${
                activeSidebar === 'notes' ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/50' : 'hover:opacity-90'
              }`}
              style={{ background: activeSidebar === 'notes' ? undefined : 'var(--cr-subtle)', color: activeSidebar === 'notes' ? '#fff' : (isDark ? '#fff' : '#334155') }}>
              <FileText className="w-5 h-5" />
            </button>
          </Tip>

          {/* Files */}
          <Tip label="Files">
            <button onClick={() => toggleSidebar('files')}
              className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all active:scale-95 ${
                activeSidebar === 'files' ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/50' : 'hover:opacity-90'
              }`}
              style={{ background: activeSidebar === 'files' ? undefined : 'var(--cr-subtle)', color: activeSidebar === 'files' ? '#fff' : (isDark ? '#fff' : '#334155') }}>
              <FileUp className="w-5 h-5" />
            </button>
          </Tip>

          {/* Participants */}
          <Tip label={`Participants (${peers.length + 1})`}>
            <button onClick={() => toggleSidebar('participants')}
              className={`relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all active:scale-95 ${
                activeSidebar === 'participants' ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/50' : 'hover:opacity-90'
              }`}
              style={{ background: activeSidebar === 'participants' ? undefined : 'var(--cr-subtle)', color: activeSidebar === 'participants' ? '#fff' : (isDark ? '#fff' : '#334155') }}>
              <Users className="w-5 h-5" />
              {raisedHands.size > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-400 text-[9px] font-bold text-black flex items-center justify-center">
                  {raisedHands.size}
                </span>
              )}
            </button>
          </Tip>
        </div>

        {/* Right: Leave button */}
        <div className="flex items-center justify-end gap-2">
          <Tip label="Leave Class">
            <button onClick={handleLeave}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-red-900/40">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Leave</span>
            </button>
          </Tip>
        </div>
      </footer>

      {/* === OBS STREAM MODAL === */}
      {showObsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
            style={{ background: 'linear-gradient(145deg, #12182a, #0d1120)', color: '#fff' }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
                  <Tv2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">OBS & Studio Camera Setup</h3>
                  <p className="text-xs text-white/50">Connect OBS Virtual Camera or RTMP Stream</p>
                </div>
              </div>
              <button onClick={() => setShowObsModal(false)} className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Method 1: Virtual Camera (Recommended) */}
              <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/30">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-sm text-violet-300 flex items-center gap-1.5">
                    ✨ Method 1: OBS Virtual Camera (Zero Setup)
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400">Easiest</span>
                </div>
                <ol className="text-xs text-white/80 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>In OBS, design your class scenes (PPT, Webcam, Digital Board, Logo).</li>
                  <li>Click <b>"Start Virtual Camera"</b> button in OBS bottom-right dock.</li>
                  <li>In this LMS classroom, click <b>Start Camera</b> button below.</li>
                  <li>Select <b>"OBS Virtual Camera"</b> as your video source in Chrome popup!</li>
                </ol>
                <div className="mt-3 flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs">
                  <span className="text-white/70">Mirror / Inverted Text Issue?</span>
                  <button
                    onClick={() => setIsMirrored(p => !p)}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white transition flex items-center gap-1.5"
                  >
                    <FlipHorizontal className="w-3.5 h-3.5" />
                    {isMirrored ? "Set to Normal (Text Unmirrored)" : "Set to Mirrored"}
                  </button>
                </div>
              </div>

              {/* Method 2: Direct RTMP */}
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-white/50 mb-2">
                  Method 2: Direct RTMP Ingest (Live Broadcast)
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-white/60 mb-1 block">Server URL</label>
                    <div className="flex gap-2">
                      <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono truncate">
                        {obsRtmpUrl}
                      </div>
                      <button onClick={() => copyObsInfo(obsRtmpUrl)} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition flex-shrink-0">
                        {obsCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-white/60 mb-1 block">Stream Key</label>
                    <div className="flex gap-2">
                      <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
                        {obsStreamKey}
                      </div>
                      <button onClick={() => copyObsInfo(obsStreamKey)} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition flex-shrink-0">
                        {obsCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
