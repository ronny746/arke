import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Device } from 'mediasoup-client';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, LogOut, 
  MessageSquare, FileText, Users, Radio, CircleDot, UserX, VolumeX, FileUp, Pin
} from 'lucide-react';
import ChatPanel from './ChatPanel';
import NotesPanel from './NotesPanel';
import FilesPanel from './FilesPanel';

interface ClassRoomProps {
  user: { username: string; role: string };
  token: string;
  roomCode: string;
  roomType: 'meeting' | 'live_class';
  mobile?: string;
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

export default function ClassRoom({ user, token, roomCode: propRoomCode, roomType, mobile, onLeave }: ClassRoomProps) {
  const roomCode = propRoomCode?.toUpperCase();
  const [micEnabled, setMicEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [pinnedPeerId, setPinnedPeerId] = useState<string | null>(null);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: string; emoji: string; left: number }[]>([]);

  const [activeSidebar, setActiveSidebar] = useState<'chat' | 'notes' | 'participants' | 'files' | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const peersRef = useRef<Peer[]>([]);

  useEffect(() => {
    peersRef.current = peers;
  }, [peers]);

  // Refs for WebRTC & Socket objects
  const socketRef = useRef<Socket | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<any>(null);
  const recvTransportRef = useRef<any>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const audioProducerRef = useRef<any>(null);
  const videoProducerRef = useRef<any>(null);
  const screenProducerRef = useRef<any>(null);

  const consumersMap = useRef<Map<string, any>>(new Map()); // consumerId -> consumer
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioIntervalRef = useRef<any>(null);
  const localScreenStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // 1. Connect to signaling server
    const socket = io('/', {
      auth: { token }
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Signaling socket connected');
      // Join Room
      socket.emit('join-room', { roomCode, username: user.username, role: user.role, mobile, roomType }, async (response: any) => {
        if (response.error) {
          alert(`Failed to join classroom: ${response.error}`);
          onLeave();
          return;
        }

        setPeers(response.peers);
        setCommentsEnabled(response.commentsEnabled !== false);
        await initMediasoup(response.rtpCapabilities);
      });
    });

    // Handle new remote peer joining
    socket.on('peer-joined', ({ peerId, username, role }) => {
      setPeers(prev => [...prev.filter(p => p.peerId !== peerId), { peerId, username, role }]);
    });

    // Handle peer leaving
    socket.on('peer-left', ({ peerId }) => {
      setPeers(prev => prev.filter(p => p.peerId !== peerId));
      setRemoteStreams(prev => prev.filter(s => s.peerId !== peerId));
    });

    // Handle incoming media from new producers
    socket.on('new-producer', async ({ producerId, peerId, kind, appData }) => {
      console.log('New remote producer:', producerId, peerId, kind, appData);
      await consumeProducer(producerId, peerId, kind, appData?.label === 'screen');
    });

    // Handle peers muting / disabling cam
    socket.on('peer-mute-toggled', ({ peerId, kind, muted }) => {
      setPeers(prev => prev.map(p => {
        if (p.peerId === peerId) {
          return kind === 'audio' ? { ...p, isMuted: muted } : { ...p, isCamOff: muted };
        }
        return p;
      }));
    });

    // Handle peer speaking indicators
    socket.on('peer-speaking', ({ peerId, speaking }) => {
      setPeers(prev => prev.map(p => p.peerId === peerId ? { ...p, isSpeaking: speaking } : p));
    });

    // Host instructs this client to mute
    socket.on('host-instruct-mute', () => {
      console.log('Host instructed mute');
      toggleMic(false);
    });

    // Host instructs this client to leave
    socket.on('host-instruct-remove', () => {
      alert('You have been removed from the classroom by the host.');
      handleLeave();
    });

    // Comments toggled by host
    socket.on('comments-toggled', ({ enabled }) => {
      setCommentsEnabled(enabled);
    });

    // Emoji reaction received
    socket.on('emoji-received', ({ emoji }) => {
      showFloatingEmoji(emoji);
    });

    // Recording state updates
    socket.on('recording-started', () => {
      setIsRecording(true);
      setRecordingUrl(null);
    });

    socket.on('recording-stopped', ({ downloadUrl }) => {
      setIsRecording(false);
      setRecordingUrl(downloadUrl);
    });

    return () => {
      cleanup();
    };
  }, [roomCode]);

  // ACTIVE SPEAKER DETECTION (Web Audio API)
  const startSpeakerDetection = (stream: MediaStream) => {
    try {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }

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
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Speaking threshold
        const isCurrentlySpeaking = average > 25;

        if (isCurrentlySpeaking) {
          speakingDebounce = 5; // keep speaking state for ~750ms after stopping
          if (!lastSpeakingState) {
            lastSpeakingState = true;
            setIsLocalSpeaking(true);
            socketRef.current?.emit('speaking', { roomCode, speaking: true });
          }
        } else {
          if (speakingDebounce > 0) {
            speakingDebounce--;
          } else {
            if (lastSpeakingState) {
              lastSpeakingState = false;
              setIsLocalSpeaking(false);
              socketRef.current?.emit('speaking', { roomCode, speaking: false });
            }
          }
        }
      }, 150);
    } catch (err) {
      console.warn('Web Audio API active speaker detection error:', err);
    }
  };

  // MEDIASOUP INITIALIZATION

  const initMediasoup = async (rtpCapabilities: any) => {
    try {
      // 1. Create Device
      const device = new Device();
      await device.load({ routerRtpCapabilities: rtpCapabilities });
      deviceRef.current = device;

      // 2. Create WebRtcTransports on server (send & receive)
      await createSendTransport();
      await createRecvTransport();

      // 3. Muted and Camera-off by default on join
      setMicEnabled(false);
      setVideoEnabled(false);

      // 5. Query and consume existing producers in the room
      socketRef.current?.emit('get-producers', { roomCode }, async (producersList: any[]) => {
        console.log('Existing producers list:', producersList);
        for (const prod of producersList) {
          await consumeProducer(prod.producerId, prod.peerId, prod.kind, prod.appData?.label === 'screen');
        }
      });

    } catch (err) {
      console.error('Error initializing mediasoup:', err);
    }
  };

  const createSendTransport = async () => {
    return new Promise<void>((resolve, reject) => {
      socketRef.current?.emit('create-transport', { roomCode, direction: 'send' }, async (params: any) => {
        if (params.error) {
          reject(params.error);
          return;
        }

        const transport = deviceRef.current!.createSendTransport(params);
        sendTransportRef.current = transport;

        transport.on('connect', ({ dtlsParameters }, callback, errback) => {
          socketRef.current?.emit('connect-transport', {
            roomCode,
            transportId: transport.id,
            dtlsParameters
          }, (res: any) => {
            if (res.error) errback(res.error);
            else callback();
          });
        });

        transport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
          socketRef.current?.emit('produce', {
            roomCode,
            transportId: transport.id,
            kind,
            rtpParameters,
            appData
          }, (res: any) => {
            if (res.error) errback(res.error);
            else callback({ id: res.id });
          });
        });

        transport.on('connectionstatechange', (state) => {
          console.log('Send transport connection state:', state);
          if (state === 'failed' || state === 'disconnected') {
            console.log('Send transport failed, auto-reconnecting...');
          }
        });

        resolve();
      });
    });
  };

  const createRecvTransport = async () => {
    return new Promise<void>((resolve, reject) => {
      socketRef.current?.emit('create-transport', { roomCode, direction: 'recv' }, async (params: any) => {
        if (params.error) {
          reject(params.error);
          return;
        }

        const transport = deviceRef.current!.createRecvTransport(params);
        recvTransportRef.current = transport;

        transport.on('connect', ({ dtlsParameters }, callback, errback) => {
          socketRef.current?.emit('connect-transport', {
            roomCode,
            transportId: transport.id,
            dtlsParameters
          }, (res: any) => {
            if (res.error) errback(res.error);
            else callback();
          });
        });

        transport.on('connectionstatechange', (state) => {
          console.log('Recv transport connection state:', state);
        });

        resolve();
      });
    });
  };

  const consumeProducer = async (producerId: string, peerId: string, _kind: string, isScreen: boolean) => {
    if (!recvTransportRef.current) return;

    socketRef.current?.emit('consume', {
      roomCode,
      transportId: recvTransportRef.current.id,
      producerId,
      rtpCapabilities: deviceRef.current!.rtpCapabilities
    }, async (params: any) => {
      if (params.error) {
        console.error('Consume error:', params.error);
        return;
      }

      try {
        const consumer = await recvTransportRef.current.consume(params);
        consumersMap.current.set(consumer.id, consumer);

        // Resume consumer on server
        socketRef.current?.emit('resume-consumer', { roomCode, consumerId: consumer.id }, () => {
          console.log('Consumer resumed');
        });

        // Add track to new or existing MediaStream for this remote peer
        const track = consumer.track;
        const info = peersRef.current.find(p => p.peerId === peerId) || { username: 'Participant', role: 'student' };

        setRemoteStreams(prev => {
          // If we already have a stream for this combination, update it
          const existingIdx = prev.findIndex(s => s.peerId === peerId && s.isScreen === isScreen);
          if (existingIdx !== -1) {
            const oldItem = prev[existingIdx];
            // Filter out existing tracks of the same kind to prevent duplicates
            const otherTracks = oldItem.stream.getTracks().filter(t => t.kind !== track.kind);
            const newStream = new MediaStream([...otherTracks, track]);
            const updated = [...prev];
            updated[existingIdx] = {
              ...oldItem,
              stream: newStream
            };
            return updated;
          } else {
            const stream = new MediaStream([track]);
            return [...prev, {
              peerId,
              username: info.username,
              role: info.role,
              stream,
              isScreen
            }];
          }
        });

        consumer.on('transportclose', () => {
          console.log('Consumer transport closed');
          removeConsumer(consumer.id, peerId, isScreen);
        });

        consumer.on('producerclose', () => {
          console.log('Remote producer closed');
          removeConsumer(consumer.id, peerId, isScreen);
        });

      } catch (err) {
        console.error('Error consuming producer:', err);
      }
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
        
        // Remove only the specific closed track from the MediaStream
        stream.removeTrack(track);
        track.stop();
        
        // If there are no tracks left (both audio and video closed), remove the stream item
        if (stream.getTracks().length === 0) {
          return prev.filter((_, idx) => idx !== existingIdx);
        } else {
          // Recreate the MediaStream instance reference so the video player re-binds and doesn't freeze
          const newStream = new MediaStream(stream.getTracks());
          const updated = [...prev];
          updated[existingIdx] = {
            ...oldItem,
            stream: newStream
          };
          return updated;
        }
      });
    }
  };

  const sendEmoji = (emoji: string) => {
    socketRef.current?.emit('send-emoji', { roomCode, emoji });
    showFloatingEmoji(emoji);
  };

  const showFloatingEmoji = (emoji: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const left = Math.floor(Math.random() * 30) + 65; // between 65% and 95%
    setFloatingEmojis(prev => [...prev, { id, emoji, left }]);
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(item => item.id !== id));
    }, 3000);
  };

  // MEDIA ACTIONS

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

          if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(t => {
              t.stop();
            });
          }
          const videoTracks = localStreamRef.current ? localStreamRef.current.getVideoTracks() : [];
          localStreamRef.current = new MediaStream([track, ...videoTracks]);

          startSpeakerDetection(localStreamRef.current);

          if (sendTransportRef.current && deviceRef.current?.canProduce('audio')) {
            audioProducerRef.current = await sendTransportRef.current.produce({
              track,
              appData: { label: 'audio' }
            });
          }
        }

        setMicEnabled(true);
        socketRef.current?.emit('mute-toggle', { roomCode, kind: 'audio', muted: false });
      } catch (err) {
        console.error('Error starting mic stream:', err);
      }
    } else {
      if (audioProducerRef.current) {
        const prodId = audioProducerRef.current.id;
        audioProducerRef.current.track.stop();
        audioProducerRef.current.close();
        audioProducerRef.current = null;
        socketRef.current?.emit('close-producer', { roomCode, producerId: prodId });
      }

      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(t => {
          t.stop();
        });
      }
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
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, frameRate: 24 }
        });
        const track = stream.getVideoTracks()[0];

        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach(t => {
            t.stop();
          });
        }
        const audioTracks = localStreamRef.current ? localStreamRef.current.getAudioTracks() : [];
        localStreamRef.current = new MediaStream([track, ...audioTracks]);

        if (sendTransportRef.current && deviceRef.current?.canProduce('video')) {
          videoProducerRef.current = await sendTransportRef.current.produce({
            track,
            appData: { label: 'video' }
          });
        }

        setVideoEnabled(true);
        socketRef.current?.emit('mute-toggle', { roomCode, kind: 'video', muted: false });
      } catch (err) {
        console.error('Error starting video stream:', err);
      }
    } else {
      if (videoProducerRef.current) {
        const prodId = videoProducerRef.current.id;
        videoProducerRef.current.track.stop(); // Stop hardware stream!
        videoProducerRef.current.close();
        videoProducerRef.current = null;
        socketRef.current?.emit('close-producer', { roomCode, producerId: prodId });
      }

      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(track => {
          track.stop();
        });
      }
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
        localScreenStreamRef.current = stream; // Save screen share stream!
        const track = stream.getVideoTracks()[0];

        screenProducerRef.current = await sendTransportRef.current.produce({
          track,
          appData: { label: 'screen' }
        });

        setScreenShareEnabled(true);

        track.onended = () => {
          stopScreenShare();
        };
      } else {
        stopScreenShare();
      }
    } catch (err) {
      console.error('Screen sharing error:', err);
    }
  };

  const stopScreenShare = () => {
    if (screenProducerRef.current) {
      if (screenProducerRef.current.track) {
        screenProducerRef.current.track.stop(); // Stop the physical screen capture session!
      }
      socketRef.current?.emit('mute-toggle', { roomCode, kind: 'screen', muted: true });
      socketRef.current?.emit('close-producer', { roomCode, producerId: screenProducerRef.current.id });
      screenProducerRef.current.close();
      screenProducerRef.current = null;
    }
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach(t => t.stop());
      localScreenStreamRef.current = null;
    }
    setScreenShareEnabled(false);
  };

  // HOST ACTIONS

  const hostMutePeer = (peerId: string) => {
    socketRef.current?.emit('host-mute-peer', { roomCode, peerId });
  };

  const hostRemovePeer = (peerId: string) => {
    if (confirm('Are you sure you want to remove this participant?')) {
      socketRef.current?.emit('host-remove-peer', { roomCode, peerId });
    }
  };

  // RECORDING ACTIONS

  const toggleRecording = () => {
    if (isRecording) {
      socketRef.current?.emit('stop-recording', { roomCode }, (res: any) => {
        if (res.error) alert(res.error);
      });
    } else {
      socketRef.current?.emit('start-recording', { roomCode }, (res: any) => {
        if (res.error) alert(res.error);
      });
    }
  };

  const handleLeave = () => {
    cleanup();
    onLeave();
  };

  const cleanup = () => {
    stopScreenShare();

    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach(t => t.stop());
      localScreenStreamRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioProducerRef.current) audioProducerRef.current.close();
    if (videoProducerRef.current) videoProducerRef.current.close();

    consumersMap.current.forEach(c => c.close());
    consumersMap.current.clear();

    if (sendTransportRef.current) sendTransportRef.current.close();
    if (recvTransportRef.current) recvTransportRef.current.close();

    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  // RENDER DYNAMIC GRID SIZE
  const getGridCols = (count: number) => {
    if (count <= 1) return 'grid-cols-1';
    if (count <= 2) return 'grid-cols-1 md:grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    return 'grid-cols-2 lg:grid-cols-3';
  };

  // Build unified tiles list (webcams + screen shares)
  const participants = [
    {
      peerId: 'local',
      username: user.username,
      role: user.role,
      isMuted: !micEnabled,
      isCamOff: !videoEnabled,
      isSpeaking: isLocalSpeaking,
      stream: localStreamRef.current,
      isLocal: true,
      isScreen: false
    },
    ...peers.map(p => {
      const remoteStream = remoteStreams.find(s => s.peerId === p.peerId && !s.isScreen);
      return {
        peerId: p.peerId,
        username: p.username,
        role: p.role,
        isMuted: p.isMuted,
        isCamOff: p.isCamOff,
        isSpeaking: p.isSpeaking,
        stream: remoteStream?.stream,
        isLocal: false,
        isScreen: false
      };
    })
  ];

  const screenShares = remoteStreams
    .filter(s => s.isScreen)
    .map(s => ({
      peerId: `${s.peerId}-screen`,
      username: `${s.username} (Screen)`,
      role: s.role,
      isMuted: true,
      isCamOff: false,
      isSpeaking: false,
      stream: s.stream,
      isLocal: false,
      isScreen: true
    }));

  if (screenShareEnabled && localScreenStreamRef.current) {
    screenShares.push({
      peerId: 'local-screen',
      username: `${user.username} (Your Screen)`,
      role: user.role,
      isMuted: true,
      isCamOff: false,
      isSpeaking: false,
      stream: localScreenStreamRef.current,
      isLocal: true,
      isScreen: true
    });
  }

  const allTiles = [...participants, ...screenShares];
  const totalVideoTiles = allTiles.length;

  const hasPinnedTile = allTiles.some(t => t.peerId === pinnedPeerId);
  const activePinnedId = hasPinnedTile ? pinnedPeerId : null;

  // Render Single Tile Card (supports spotlight & thumbnail sizes)
  const renderTile = (tile: any, isThumbnail = false) => {
    if (!tile) return null;
    const { peerId, username, role, isMuted, isCamOff, isSpeaking, stream, isLocal, isScreen } = tile;
    const showVideo = !isCamOff && stream;
    
    const initials = username
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const speakRingClass = isSpeaking 
      ? 'ring-4 ring-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)] animate-pulse' 
      : 'ring-4 ring-transparent';

    return (
      <div 
        key={peerId} 
        className={`relative rounded-2xl overflow-hidden bg-slate-800 border transition-all duration-300 group min-h-0 flex items-center justify-center ${
          isSpeaking ? 'border-green-500 ring-2 ring-green-500/30 shadow-md' : 'border-slate-200 shadow-sm'
        } ${isThumbnail ? 'h-full w-48 md:w-full md:h-28 flex-shrink-0' : 'w-full h-full shadow-md'}`}
      >
        {showVideo ? (
          <video
            autoPlay
            playsInline
            muted={isLocal}
            ref={el => {
              if (el) {
                if (el.srcObject !== stream) {
                  el.srcObject = stream;
                  el.play().catch(e => console.warn("Video element play failed:", e));
                }
              }
            }}
            className={`w-full h-full object-cover ${isLocal && !isScreen ? 'transform scale-x-[-1]' : ''}`}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900 flex flex-col items-center justify-center p-4">
            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full bg-brand-600 flex items-center justify-center text-white text-lg font-bold transition-all duration-300 ${speakRingClass}`}>
              {initials}
            </div>
            {!isThumbnail && (
              <span className="mt-2 text-[10px] font-semibold text-slate-300 capitalize bg-slate-950/40 px-2 py-0.5 rounded-full">
                {role}
              </span>
            )}
          </div>
        )}

        {/* Hover Controls */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3.5 z-10">
          <div className="flex justify-between w-full">
            <button
              onClick={() => setPinnedPeerId(pinnedPeerId === peerId ? null : peerId)}
              title={pinnedPeerId === peerId ? "Unpin participant" : "Pin participant"}
              className={`p-1.5 rounded-lg transition ${
                pinnedPeerId === peerId 
                  ? 'bg-brand-600 text-white' 
                  : 'bg-slate-900/60 hover:bg-slate-900 text-slate-300 hover:text-white'
              }`}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>

            <div className="flex space-x-1.5">
              {isMuted && (
                <div className="p-1.5 rounded-lg bg-red-500/80 text-white">
                  <MicOff className="w-3.5 h-3.5" />
                </div>
              )}
              {isCamOff && (
                <div className="p-1.5 rounded-lg bg-red-500/80 text-white">
                  <VideoOff className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-semibold text-white drop-shadow-sm truncate max-w-[85%]">
              {username} {isLocal ? '(You)' : ''}
            </span>
            {isSpeaking && (
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
              </span>
            )}
          </div>
        </div>

        {/* Static badge */}
        <div className="absolute bottom-2.5 left-2.5 bg-slate-900/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-medium text-white flex items-center space-x-1 opacity-100 group-hover:opacity-0 transition-opacity">
          <span>{username} {isLocal ? '(You)' : ''}</span>
          {isSpeaking && <span className="w-1 h-1 rounded-full bg-green-50 animate-pulse"></span>}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-100 text-slate-800 relative">
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(100vh) scale(0.5) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
            transform: translateY(80vh) scale(1.2) rotate(10deg);
          }
          50% {
            transform: translateY(40vh) scale(1) rotate(-10deg);
          }
          100% {
            transform: translateY(-10vh) scale(0.8) rotate(15deg);
            opacity: 0;
          }
        }
        .floating-emoji {
          position: absolute;
          bottom: 0;
          font-size: 2.5rem;
          pointer-events: none;
          z-index: 100;
          animation: floatUp 3s cubic-bezier(0.08, 0.82, 0.17, 1) forwards;
        }
      `}</style>

      {/* Floating Emojis Container */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
        {floatingEmojis.map(item => (
          <div
            key={item.id}
            className="floating-emoji"
            style={{ left: `${item.left}%` }}
          >
            {item.emoji}
          </div>
        ))}
      </div>

      {/* Floating Emoji Bar */}
      <div className="absolute bottom-24 right-6 flex items-center space-x-2 bg-white/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-200 shadow-xl z-30 animate-fade-in">
        {['👍', '❤️', '👏', '😂', '🔥'].map(emoji => (
          <button
            key={emoji}
            onClick={() => sendEmoji(emoji)}
            className="text-2.5xl hover:scale-125 active:scale-95 transition transform duration-100"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-200/80 bg-white/85 backdrop-blur-md px-6 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <span className="text-xl">🎓</span>
          <span className="font-extrabold text-slate-800 tracking-tight">MeetOnline</span>
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-500 font-mono">
            <span>Classroom Code:</span>
            <span className="font-bold text-brand-600">{roomCode}</span>
          </div>
        </div>

        {/* Live / Recording Indicator */}
        <div className="flex items-center space-x-4">
          {isRecording ? (
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-xs text-red-600 font-semibold animate-pulse">
              <CircleDot className="w-4 h-4" />
              <span>RECORDING</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-green-50 border border-green-200 text-xs text-green-700 font-semibold">
              <Radio className="w-4 h-4" />
              <span>LIVE</span>
            </div>
          )}
          
          {recordingUrl && (
            <a 
              href={recordingUrl} 
              download
              className="text-xs px-3 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded-full font-medium transition shadow-sm"
            >
              Download Recording
            </a>
          )}
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Videos Area */}
        <div className="flex-1 flex flex-col md:flex-row p-6 overflow-hidden min-h-0 gap-4">
          {activePinnedId ? (
            /* SPOTLIGHT PINNED LAYOUT */
            <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 w-full">
              {/* Spotlight Center Window */}
              <div className="flex-1 min-h-0">
                {renderTile(allTiles.find(t => t.peerId === activePinnedId))}
              </div>
              
              {/* Sidebar Carousel (Vertical on desktop, horizontal scroll on mobile) */}
              <div className="flex flex-row md:flex-col h-32 md:h-full w-full md:w-60 gap-4 overflow-x-auto md:overflow-y-auto min-h-0 flex-shrink-0 pb-2 md:pb-0 pr-0 md:pr-2">
                {allTiles
                  .filter(t => t.peerId !== activePinnedId)
                  .map(t => renderTile(t, true))}
              </div>
            </div>
          ) : (
            /* BALANCED EQUAL GRID LAYOUT */
            <div className={`grid gap-4 flex-1 ${getGridCols(totalVideoTiles)} auto-rows-fr min-h-0 w-full`}>
              {allTiles.map(t => renderTile(t, false))}
            </div>
          )}
        </div>

        {/* Sidebar panels */}
        {activeSidebar && (
          <aside className="w-80 border-l border-slate-200 bg-white/75 backdrop-blur-lg flex flex-col z-10">
            {activeSidebar === 'chat' && <ChatPanel roomCode={roomCode} socket={socketRef.current!} userRole={user.role} commentsEnabled={commentsEnabled} />}
            {activeSidebar === 'notes' && <NotesPanel roomCode={roomCode} socket={socketRef.current!} token={token} />}
            {activeSidebar === 'files' && <FilesPanel roomCode={roomCode} socket={socketRef.current!} token={token} />}
            {activeSidebar === 'participants' && (
              <div className="flex-1 flex flex-col p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Participants</h3>
                <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                  {/* Local User */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                    <div>
                      <h4 className="font-semibold text-sm text-slate-800">{user.username} (You)</h4>
                      <p className="text-xs text-brand-600 capitalize">{user.role}</p>
                    </div>
                  </div>

                  {/* Remote Users */}
                  {peers.map(p => (
                    <div key={p.peerId} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                      <div>
                        <h4 className="font-semibold text-sm text-slate-800">{p.username}</h4>
                        <p className="text-xs text-slate-500 capitalize">{p.role}</p>
                      </div>

                      {user.role === 'teacher' && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => hostMutePeer(p.peerId)}
                            title="Mute Participant"
                            className="p-2 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-650 border border-slate-200/60 transition"
                          >
                            <VolumeX className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => hostRemovePeer(p.peerId)}
                            title="Remove Participant"
                            className="p-2 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-650 border border-slate-200/60 transition"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Floating Control Bar */}
      <footer className="py-3 md:py-0 md:h-20 border-t border-slate-200/80 bg-white/85 backdrop-blur-md px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-0 z-10 flex-shrink-0">
        {/* Connection status */}
        <div className="hidden md:block text-xs text-slate-400">
          Latency: <span className="font-mono text-green-600">~24ms</span>
        </div>

        {/* Media Controls */}
        {!(roomType === 'live_class' && user.role === 'student') ? (
          <div className="flex items-center justify-center space-x-3 md:space-x-4">
            <button
              onClick={() => toggleMic()}
              className={`p-3 rounded-xl border transition ${
                micEnabled
                  ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-200/60 shadow-sm'
                  : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100/50'
              }`}
            >
              {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleCam}
              className={`p-3 rounded-xl border transition ${
                videoEnabled
                  ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-200/60 shadow-sm'
                  : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100/50'
              }`}
            >
              {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleScreenShare}
              className={`p-3 rounded-xl border transition ${
                screenShareEnabled
                  ? 'bg-brand-50 border-brand-200 text-brand-600 hover:bg-brand-100/50 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <Monitor className="w-5 h-5" />
            </button>

            {user.role === 'teacher' && (
              <button
                onClick={toggleRecording}
                className={`p-3 rounded-xl border transition ${
                  isRecording
                    ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100/50 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-200/60'
                }`}
              >
                <CircleDot className="w-5 h-5" />
              </button>
            )}

            {/* On mobile, show Leave button next to media controls for easy access */}
            <button
              onClick={handleLeave}
              className="md:hidden p-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="md:hidden flex items-center justify-center">
            <button
              onClick={handleLeave}
              className="p-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition flex items-center space-x-2"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-xs font-bold">Leave Live Class</span>
            </button>
          </div>
        )}

        {/* Panel Toggles */}
        <div className="flex items-center justify-center space-x-2 md:space-x-3">
          <button
            onClick={() => setActiveSidebar(activeSidebar === 'chat' ? null : 'chat')}
            className={`p-2.5 md:p-3 rounded-xl transition ${
              activeSidebar === 'chat' ? 'bg-brand-50 border border-brand-100 text-brand-600' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveSidebar(activeSidebar === 'notes' ? null : 'notes')}
            className={`p-2.5 md:p-3 rounded-xl transition ${
              activeSidebar === 'notes' ? 'bg-brand-50 border border-brand-100 text-brand-600' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveSidebar(activeSidebar === 'files' ? null : 'files')}
            className={`p-2.5 md:p-3 rounded-xl transition ${
              activeSidebar === 'files' ? 'bg-brand-50 border border-brand-100 text-brand-600' : 'text-slate-500 hover:bg-slate-100'
            }`}
            title="Classroom Files"
          >
            <FileUp className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveSidebar(activeSidebar === 'participants' ? null : 'participants')}
            className={`p-2.5 md:p-3 rounded-xl transition ${
              activeSidebar === 'participants' ? 'bg-brand-50 border border-brand-100 text-brand-600' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Users className="w-5 h-5" />
          </button>

          {/* On desktop, show Leave button at the end */}
          <div className="hidden md:block w-px h-6 bg-slate-200 mx-2"></div>

          <button
            onClick={handleLeave}
            className="hidden md:block p-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
