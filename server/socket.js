const socketIo = require('socket.io');
const mediaService = require('./services/mediaService');
const recordingService = require('./services/recordingService');
const { Note, Message } = require('./models/Schemas');

module.exports = function setupSocketIO(server) {
  const io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  const peerInfo = new Map(); // socket.id -> { username, role, roomCode }

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join Room signaling
    socket.on('join-room', async ({ roomCode, username, role, mobile, roomType }, callback) => {
      roomCode = roomCode.toUpperCase();
      console.log(`User ${username} (${role}) joining room ${roomCode} with roomType: ${roomType}`);
      
      socket.join(roomCode);
      peerInfo.set(socket.id, { username, role, roomCode, mobile });

      try {
        // Ensure router is created for this room
        const router = await mediaService.getOrCreateRouter(roomCode);
        
        const room = mediaService.rooms.get(roomCode);
        if (room && !room.roomType) {
          room.roomType = roomType || 'meeting';
          room.commentsEnabled = true; // Enabled by default
        }

        // Let other peers in the room know someone joined
        socket.to(roomCode).emit('peer-joined', { 
          peerId: socket.id, 
          username, 
          role,
          mobile
        });

        // Return current peer list to the joining peer
        const currentPeers = [];
        if (room) {
          room.peers.forEach((p, pId) => {
            if (pId !== socket.id) {
              const info = peerInfo.get(pId);
              currentPeers.push({
                peerId: pId,
                username: info?.username || 'Unknown',
                role: info?.role || 'student',
                mobile: info?.mobile || ''
              });
            }
          });
        }

        callback({ 
          rtpCapabilities: router.rtpCapabilities, 
          peers: currentPeers,
          roomType: room?.roomType || 'meeting',
          commentsEnabled: room?.commentsEnabled !== false
        });
      } catch (error) {
        console.error('Join room error:', error);
        callback({ error: error.message });
      }
    });

    // Toggle Chat Comments
    socket.on('toggle-comments', ({ roomCode, enabled }) => {
      const room = mediaService.rooms.get(roomCode);
      if (room) {
        room.commentsEnabled = enabled;
        io.to(roomCode).emit('comments-toggled', { enabled });
      }
    });

    // Emoji reactions
    socket.on('send-emoji', ({ roomCode, emoji }) => {
      socket.to(roomCode).emit('emoji-received', { peerId: socket.id, emoji });
    });

    // Create WebRtcTransport
    socket.on('create-transport', async ({ roomCode, direction }, callback) => {
      try {
        const transportParams = await mediaService.createWebRtcTransport(roomCode, socket.id, direction);
        callback(transportParams);
      } catch (error) {
        console.error('Create transport error:', error);
        callback({ error: error.message });
      }
    });

    // Connect WebRtcTransport
    socket.on('connect-transport', async ({ roomCode, transportId, dtlsParameters }, callback) => {
      try {
        await mediaService.connectTransport(roomCode, transportId, dtlsParameters);
        callback({ success: true });
      } catch (error) {
        console.error('Connect transport error:', error);
        callback({ error: error.message });
      }
    });

    // Produce media
    socket.on('produce', async ({ roomCode, transportId, kind, rtpParameters, appData }, callback) => {
      try {
        const { id } = await mediaService.produce(roomCode, socket.id, transportId, kind, rtpParameters, appData);
        
        // Broadcast this new producer to all other peers in the room
        socket.to(roomCode).emit('new-producer', {
          producerId: id,
          peerId: socket.id,
          kind,
          appData
        });
        
        callback({ id });
      } catch (error) {
        console.error('Produce error:', error);
        callback({ error: error.message });
      }
    });

    // Close producer
    socket.on('close-producer', ({ roomCode, producerId }) => {
      try {
        mediaService.closeProducer(roomCode, producerId);
      } catch (error) {
        console.error('Close producer error:', error);
      }
    });

    // Active speaker detection
    socket.on('speaking', ({ roomCode, speaking }) => {
      socket.to(roomCode).emit('peer-speaking', { peerId: socket.id, speaking });
    });

    // Consume media
    socket.on('consume', async ({ roomCode, transportId, producerId, rtpCapabilities }, callback) => {
      try {
        const consumerParams = await mediaService.consume(roomCode, socket.id, transportId, producerId, rtpCapabilities);
        callback(consumerParams);
      } catch (error) {
        console.error('Consume error:', error);
        callback({ error: error.message });
      }
    });

    // Resume consumer
    socket.on('resume-consumer', async ({ roomCode, consumerId }, callback) => {
      try {
        const room = mediaService.rooms.get(roomCode);
        if (room) {
          const consumer = room.consumers.get(consumerId);
          if (consumer) {
            await consumer.resume();
          }
        }
        callback({ success: true });
      } catch (error) {
        console.error('Resume consumer error:', error);
        callback({ error: error.message });
      }
    });

    // Get Room Producers list
    socket.on('get-producers', ({ roomCode }, callback) => {
      try {
        const producers = mediaService.getRoomProducers(roomCode, socket.id);
        callback(producers);
      } catch (error) {
        console.error('Get producers error:', error);
        callback({ error: error.message });
      }
    });

    // Client toggle mic/cam mute notifications to others
    socket.on('mute-toggle', ({ roomCode, kind, muted }) => {
      socket.to(roomCode).emit('peer-mute-toggled', { peerId: socket.id, kind, muted });
    });

    // Chat message event
    socket.on('chat-message', async ({ roomCode, message }) => {
      const info = peerInfo.get(socket.id);
      if (!info) return;

      try {
        const newMessage = new Message({
          roomCode,
          senderName: info.username,
          role: info.role,
          content: message
        });
        await newMessage.save();

        io.to(roomCode).emit('chat-message', {
          _id: newMessage._id,
          senderName: info.username,
          role: info.role,
          content: message,
          createdAt: newMessage.createdAt
        });
      } catch (error) {
        console.error('Error saving chat message:', error);
      }
    });

    // Shared Notes Update
    socket.on('notes-update', async ({ roomCode, content }) => {
      socket.to(roomCode).emit('notes-update', { content });
      
      // Throttle / Save to db
      try {
        await Note.findOneAndUpdate(
          { roomCode },
          { content, updatedAt: new Date() },
          { upsert: true }
        );
      } catch (error) {
        console.error('Error updating notes:', error);
      }
    });

    // Host Action: Mute Participant
    socket.on('host-mute-peer', ({ roomCode, peerId }) => {
      const info = peerInfo.get(socket.id);
      if (info && info.role === 'teacher') {
        io.to(peerId).emit('host-instruct-mute');
      }
    });

    // Host Action: Remove Participant
    socket.on('host-remove-peer', ({ roomCode, peerId }) => {
      const info = peerInfo.get(socket.id);
      if (info && info.role === 'teacher') {
        io.to(peerId).emit('host-instruct-remove');
      }
    });

    // Server-side Recording starting
    socket.on('start-recording', async ({ roomCode }, callback) => {
      const info = peerInfo.get(socket.id);
      if (!info || info.role !== 'teacher') {
        return callback({ error: 'Only teachers can record classes.' });
      }

      try {
        await recordingService.startRecording(roomCode, socket.id);
        io.to(roomCode).emit('recording-started');
        callback({ success: true });
      } catch (error) {
        console.error('Start recording error:', error);
        callback({ error: error.message });
      }
    });

    // Server-side Recording stopping
    socket.on('stop-recording', async ({ roomCode }, callback) => {
      const info = peerInfo.get(socket.id);
      if (!info || info.role !== 'teacher') {
        return callback({ error: 'Only teachers can stop recording.' });
      }

      try {
        const downloadUrl = await recordingService.stopRecording(roomCode);
        io.to(roomCode).emit('recording-stopped', { downloadUrl });
        callback({ success: true, downloadUrl });
      } catch (error) {
        console.error('Stop recording error:', error);
        callback({ error: error.message });
      }
    });

    // Handle peer disconnect
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      const info = peerInfo.get(socket.id);
      if (info) {
        const { roomCode, username } = info;
        // Alert room
        io.to(roomCode).emit('peer-left', { peerId: socket.id, username });
        // Close in mediasoup
        mediaService.closePeer(roomCode, socket.id);
        peerInfo.delete(socket.id);
      }
    });
  });
};
