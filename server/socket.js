const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('./config/env');
const mediaService = require('./services/mediaService');
const recordingService = require('./services/recordingService');
const { AppShareService } = require('./services/appShareService');
const { Note, Message } = require('./models/Schemas');

module.exports = function setupSocketIO(server) {
  const io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  const peerInfo = new Map(); // socket.id -> { username, role, roomCode }
  const appShareService = new AppShareService();

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // The REST JWT decides the room name, so a client cannot read another
    // account's in-app notifications.
    socket.on('subscribe-notifications', (payload = {}, acknowledge) => {
      try {
        const token = String(payload.token || '').replace(/^Bearer\s+/i, '');
        const user = jwt.verify(token, env.JWT_SECRET);
        socket.join(`user:${String(user.userId)}`);
        if (typeof acknowledge === 'function') acknowledge({ success: true });
      } catch {
        if (typeof acknowledge === 'function') acknowledge({ success: false, message: 'Unauthorized notification subscription' });
      }
    });

    // Join Room signaling
    socket.on('join-room', async ({ roomCode, username, role, mobile, roomType }, callback) => {
      roomCode = roomCode.toUpperCase();
      console.log(`User ${username} (${role}) joining room ${roomCode} with roomType: ${roomType}`);
      
      socket.join(roomCode);
      peerInfo.set(socket.id, { username, role, roomCode, mobile });

      if (String(role).toLowerCase() === 'teacher') {
        appShareService.rebindTeacher({
          roomCode,
          teacherKey: getTeacherShareKey({ username, mobile }),
          teacherSocketId: socket.id,
        });
      }

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
                mobile: info?.mobile || '',
                isMuted: p.isMuted || false,
                isCamOff: p.isCamOff || false
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
        socket.to(roomCode).emit('producer-closed', { producerId, peerId: socket.id });
      } catch (error) {
        console.error('Close producer error:', error);
      }
    });

    // Screen share stopped notification
    socket.on('screen-share-stopped', ({ roomCode }) => {
      socket.to(roomCode).emit('screen-share-stopped', { peerId: socket.id });
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
      const room = mediaService.rooms.get(roomCode);
      if (room) {
        const peer = room.peers.get(socket.id);
        if (peer) {
          if (kind === 'audio') peer.isMuted = muted;
          if (kind === 'video') peer.isCamOff = muted;
        }
      }
      socket.to(roomCode).emit('peer-mute-toggled', { peerId: socket.id, kind, muted });
    });

    socket.on('pause-producer', async ({ roomCode, producerId }, callback) => {
      const info = peerInfo.get(socket.id);
      if (!info || info.roomCode !== String(roomCode).toUpperCase()) return callback?.({ error: 'Invalid media control request.' });
      try {
        await mediaService.pauseProducer(info.roomCode, socket.id, producerId);
        callback?.({ success: true });
      } catch (error) {
        callback?.({ error: error.message });
      }
    });

    socket.on('resume-producer', async ({ roomCode, producerId }, callback) => {
      const info = peerInfo.get(socket.id);
      if (!info || info.roomCode !== String(roomCode).toUpperCase()) return callback?.({ error: 'Invalid media control request.' });
      try {
        await mediaService.resumeProducer(info.roomCode, socket.id, producerId);
        callback?.({ success: true });
      } catch (error) {
        callback?.({ error: error.message });
      }
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
    socket.on('notes-update', async ({ roomCode, content }, callback) => {
      const info = peerInfo.get(socket.id);
      const normalizedRoom = String(roomCode || '').toUpperCase();
      if (!info || info.roomCode !== normalizedRoom || typeof content !== 'string' || content.length > 50000) {
        return callback?.({ error: 'Invalid shared notes update.' });
      }
      try {
        await Note.findOneAndUpdate(
          { roomCode: normalizedRoom },
          { content, updatedAt: new Date() },
          { upsert: true }
        );
        socket.to(normalizedRoom).emit('notes-update', { content });
        callback?.({ success: true });
      } catch (error) {
        console.error('Error updating notes:', error);
        callback?.({ error: 'Notes could not be saved. Please try again.' });
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

    // Hand Raise
    socket.on('hand-raise', ({ roomCode, raised }) => {
      // Broadcast to everyone in the room
      socket.to(roomCode).emit('hand-raised', { peerId: socket.id, raised });
    });

    // Emoji Reactions
    socket.on('reaction', ({ roomCode, emoji }) => {
      // Broadcast to everyone in the room except sender
      socket.to(roomCode).emit('reaction', { emoji });
    });

    // Companion whiteboard: the teacher keeps camera/audio on the web while a
    // paired phone or tablet contributes only ink data to the same class room.
    socket.on('start-app-share', ({ roomCode }, callback) => {
      const info = peerInfo.get(socket.id);
      if (!info || !['teacher', 'admin'].includes(String(info.role).toLowerCase())) {
        return callback({ error: 'Only the class host can share with the app.' });
      }
      if (info.roomCode !== String(roomCode).toUpperCase()) {
        return callback({ error: 'This app share does not belong to the current class.' });
      }

      const session = appShareService.create(
        info.roomCode,
        socket.id,
        getTeacherShareKey(info),
      );
      io.to(session.roomCode).emit('app-share-started', {
        expiresAt: session.expiresAt,
      });
      callback({
        code: session.code,
        expiresAt: session.expiresAt,
        roomCode: session.roomCode,
      });
    });

    socket.on('join-app-share', ({ roomCode, code }, callback) => {
      if (typeof roomCode !== 'string' || typeof code !== 'string') {
        return callback({ error: 'Enter the class code and the six-character share code.' });
      }
      const session = appShareService.join({ roomCode, code, appSocketId: socket.id });
      if (!session) return callback({ error: 'That share code is invalid or has expired.' });

      io.to(session.roomCode).emit('app-share-status', { connected: true });
      callback({
        roomCode: session.roomCode,
        strokes: session.strokes,
        docState: session.docState,
      });
    });

    socket.on('app-whiteboard-doc', ({ docState }, callback) => {
      const session = appShareService.getBySocket(socket.id);
      if (!session || session.appSocketId !== socket.id) {
        return callback?.({ error: 'Whiteboard is not paired.' });
      }
      appShareService.setDocState(session.id, docState);
      io.to(session.roomCode).emit('app-whiteboard-doc', { docState });
      callback?.({ success: true });
    });

    socket.on('app-whiteboard-stroke', ({ stroke }, callback) => {
      const session = appShareService.getBySocket(socket.id);
      if (!session || session.appSocketId !== socket.id || !isValidStroke(stroke)) {
        return callback?.({ error: 'Invalid whiteboard update.' });
      }
      appShareService.appendStroke(session.id, stroke);
      io.to(session.roomCode).emit('app-whiteboard-stroke', { stroke });
      callback?.({ success: true });
    });

    socket.on('app-whiteboard-clear', (_, callback) => {
      const session = appShareService.getBySocket(socket.id);
      if (!session || session.appSocketId !== socket.id) {
        return callback?.({ error: 'Whiteboard is not paired.' });
      }
      appShareService.clear(session.id);
      appShareService.setDocState(session.id, null);
      io.to(session.roomCode).emit('app-whiteboard-clear');
      callback?.({ success: true });
    });

    socket.on('stop-app-share', (_, callback) => {
      const info = peerInfo.get(socket.id);
      const session = appShareService.getByTeacher(socket.id) ||
        (info ? appShareService.stopForTeacherKey(info.roomCode, getTeacherShareKey(info)) : null);
      if (!session) return callback?.({ success: true });
      appShareService.stopForTeacher(socket.id);
      io.to(session.roomCode).emit('app-share-stopped');
      callback?.({ success: true });
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

      const appSession = appShareService.getBySocket(socket.id);
      if (appSession?.appSocketId === socket.id) {
        appSession.appSocketId = null;
        io.to(appSession.roomCode).emit('app-share-status', { connected: false });
      }
      // Do not stop the pairing on a browser reconnect. The next join-room
      // event rebinds the session to the new socket id; expiry and the explicit
      // “Stop sharing” action remain the cleanup mechanism.
    });
  });

  return io;
};

function isValidStroke(stroke) {
  if (!stroke || typeof stroke !== 'object') return false;
  if (!Array.isArray(stroke.points) || stroke.points.length < 1) return false;
  if (typeof stroke.color !== 'string') return false;
  if (typeof stroke.width !== 'number' || stroke.width < 1) return false;
  return stroke.points.every((point) =>
    point && Number.isFinite(point.x) && Number.isFinite(point.y) &&
    point.x >= 0 && point.x <= 1 && point.y >= 0,
  );
}

function getTeacherShareKey({ username, mobile }) {
  const mobileKey = String(mobile || '').replace(/\D/g, '');
  return mobileKey || String(username || '').trim().toLowerCase();
}
