const mediasoup = require('mediasoup');
const os = require('os');

// mediasoup Configuration options
const config = {
  // Worker Settings
  workerSettings: {
    logLevel: 'warn',
    logTags: [
      'info',
      'ice',
      'dtls',
      'rtp',
      'srtp',
      'rtcp'
    ],
    rtcMinPort: parseInt(process.env.MEDIASOUP_MIN_PORT || 20000),
    rtcMaxPort: parseInt(process.env.MEDIASOUP_MAX_PORT || 20100),
  },
  // Router media codecs config
  routerMediaCodecs: [
    {
      kind: 'audio',
      mimeType: 'audio/opus',
      clockRate: 48000,
      channels: 2
    },
    {
      kind: 'video',
      mimeType: 'video/VP8',
      clockRate: 90000,
      parameters: {
        'x-google-start-bitrate': 1000
      }
    },
    {
      kind: 'video',
      mimeType: 'video/h264',
      clockRate: 90000,
      parameters: {
        'packetization-mode': 1,
        'profile-level-id': '42e01f',
        'level-asymmetry-allowed': 1
      }
    }
  ],
  // WebRtcTransport Settings
  webRtcTransportOptions: {
    listenInfos: [
      {
        protocol: 'udp',
        ip: process.env.MEDIASOUP_LISTEN_IP || '127.0.0.1',
        announcedAddress: process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1',
      },
      {
        protocol: 'tcp',
        ip: process.env.MEDIASOUP_LISTEN_IP || '127.0.0.1',
        announcedAddress: process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1',
      }
    ],
    initialAvailableOutgoingBitrate: 1000000,
    minimumAvailableOutgoingBitrate: 600000,
    maxSctpMessageSize: 262144,
    enableSctp: true,
  }
};

let workers = [];
let nextWorkerIdx = 0;
const rooms = new Map(); // key: roomCode -> { router, transports, producers, consumers, peers }

// Initialize workers
async function createWorkers() {
  const numWorkers = os.cpus().length;
  for (let i = 0; i < numWorkers; i++) {
    const worker = await mediasoup.createWorker(config.workerSettings);
    worker.on('died', () => {
      console.error(`mediasoup Worker died, exiting in 2 seconds...`);
      setTimeout(() => process.exit(1), 2000);
    });
    workers.push(worker);
  }
  console.log(`Created ${workers.length} mediasoup Workers.`);
}

function getWorker() {
  if (workers.length === 0) {
    throw new Error('No workers created. Initialize workers first.');
  }
  const worker = workers[nextWorkerIdx];
  nextWorkerIdx = (nextWorkerIdx + 1) % workers.length;
  return worker;
}

async function getOrCreateRouter(roomCode) {
  let room = rooms.get(roomCode);
  if (!room) {
    const worker = getWorker();
    const router = await worker.createRouter({ mediaCodecs: config.routerMediaCodecs });
    room = {
      router,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
      peers: new Map() // peerId -> { sendTransport, recvTransport, producers: [], consumers: [] }
    };
    rooms.set(roomCode, room);
  }
  return room.router;
}

async function createWebRtcTransport(roomCode, peerId, direction) {
  const room = rooms.get(roomCode);
  if (!room) throw new Error(`Room ${roomCode} not found`);

  const transport = await room.router.createWebRtcTransport(config.webRtcTransportOptions);

  transport.on('dtlsstatechange', (dtlsState) => {
    if (dtlsState === 'failed' || dtlsState === 'closed') {
      console.warn(`Transport DTLS state changed to ${dtlsState} for peer ${peerId}`);
    }
  });

  room.transports.set(transport.id, transport);

  if (!room.peers.has(peerId)) {
    room.peers.set(peerId, { sendTransport: null, recvTransport: null, producers: [], consumers: [] });
  }

  const peer = room.peers.get(peerId);
  if (direction === 'send') {
    peer.sendTransport = transport;
  } else {
    peer.recvTransport = transport;
  }

  return {
    id: transport.id,
    iceParameters: transport.iceParameters,
    iceCandidates: transport.iceCandidates,
    dtlsParameters: transport.dtlsParameters,
    sctpParameters: transport.sctpParameters
  };
}

async function connectTransport(roomCode, transportId, dtlsParameters) {
  const room = rooms.get(roomCode);
  if (!room) throw new Error(`Room not found`);
  const transport = room.transports.get(transportId);
  if (!transport) throw new Error(`Transport not found`);
  await transport.connect({ dtlsParameters });
}

async function produce(roomCode, peerId, transportId, kind, rtpParameters, appData = {}) {
  const room = rooms.get(roomCode);
  if (!room) throw new Error(`Room not found`);
  const transport = room.transports.get(transportId);
  if (!transport) throw new Error(`Transport not found`);

  const producer = await transport.produce({ kind, rtpParameters, appData });

  producer.on('transportclose', () => {
    console.log(`Producer's transport closed`);
    producer.close();
  });

  room.producers.set(producer.id, producer);

  const peer = room.peers.get(peerId);
  if (peer) {
    peer.producers.push(producer.id);
  }

  return { id: producer.id };
}

async function consume(roomCode, peerId, transportId, producerId, rtpCapabilities) {
  const room = rooms.get(roomCode);
  if (!room) throw new Error(`Room not found`);
  const router = room.router;
  const transport = room.transports.get(transportId);
  if (!transport) throw new Error(`Transport not found`);

  if (!router.canConsume({ producerId, rtpCapabilities })) {
    throw new Error(`Cannot consume producer ${producerId}`);
  }

  const consumer = await transport.consume({
    producerId,
    rtpCapabilities,
    paused: true // Client should explicitly resume
  });

  consumer.on('transportclose', () => {
    console.log(`Consumer's transport closed`);
    consumer.close();
  });

  consumer.on('producerclose', () => {
    console.log(`Producer closed, closing consumer`);
    consumer.close();
  });

  room.consumers.set(consumer.id, consumer);

  const peer = room.peers.get(peerId);
  if (peer) {
    peer.consumers.push(consumer.id);
  }

  return {
    id: consumer.id,
    producerId,
    kind: consumer.kind,
    rtpParameters: consumer.rtpParameters,
    type: consumer.type
  };
}

function getRoomProducers(roomCode, peerId) {
  const room = rooms.get(roomCode);
  if (!room) return [];
  const producersList = [];
  room.peers.forEach((peer, otherPeerId) => {
    if (otherPeerId !== peerId) {
      peer.producers.forEach(prodId => {
        const prod = room.producers.get(prodId);
        if (prod) {
          producersList.push({
            producerId: prod.id,
            peerId: otherPeerId,
            kind: prod.kind,
            appData: prod.appData
          });
        }
      });
    }
  });
  return producersList;
}

function closeProducer(roomCode, producerId) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const producer = room.producers.get(producerId);
  if (producer) {
    producer.close();
    room.producers.delete(producerId);
  }
}

function closePeer(roomCode, peerId) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const peer = room.peers.get(peerId);
  if (!peer) return;

  peer.producers.forEach(prodId => {
    const prod = room.producers.get(prodId);
    if (prod) prod.close();
    room.producers.delete(prodId);
  });

  peer.consumers.forEach(consId => {
    const cons = room.consumers.get(consId);
    if (cons) cons.close();
    room.consumers.delete(consId);
  });

  if (peer.sendTransport) peer.sendTransport.close();
  if (peer.recvTransport) peer.recvTransport.close();

  room.peers.delete(peerId);

  if (room.peers.size === 0) {
    room.router.close();
    rooms.delete(roomCode);
    console.log(`Room ${roomCode} has been cleaned up.`);
  }
}

module.exports = {
  createWorkers,
  getOrCreateRouter,
  createWebRtcTransport,
  connectTransport,
  produce,
  consume,
  getRoomProducers,
  closeProducer,
  closePeer,
  rooms
};
