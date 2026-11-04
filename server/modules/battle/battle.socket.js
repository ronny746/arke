const BattleService = require('./battle.service');

module.exports = function registerBattleSockets(io, socket) {
  // Join battle room
  socket.on('battle:join_room', ({ roomCode, user }) => {
    if (!roomCode) return;
    const room = `battle:${String(roomCode).trim().toUpperCase()}`;
    socket.join(room);
    console.log(`Socket ${socket.id} joined battle room: ${room}`);

    // Notify room of active member
    socket.to(room).emit('battle:member_connected', {
      userId: user?.id || user?._id || user?.userId,
      name: user?.name || user?.firstName || 'A player'
    });
  });

  // Leave battle room
  socket.on('battle:leave_room', ({ roomCode, user }) => {
    if (!roomCode) return;
    const room = `battle:${String(roomCode).trim().toUpperCase()}`;
    socket.leave(room);
    socket.to(room).emit('battle:player_left', {
      userId: user?.id || user?._id || user?.userId,
      name: user?.name || user?.firstName || 'A player'
    });
  });

  // Player ready status changed
  socket.on('battle:player_ready', ({ roomCode, userId, isReady }) => {
    if (!roomCode) return;
    const room = `battle:${String(roomCode).trim().toUpperCase()}`;
    io.to(room).emit('battle:ready_updated', { userId, isReady });
  });

  // Host starts battle countdown
  socket.on('battle:start_game', ({ roomCode, countdownSeconds = 3 }) => {
    if (!roomCode) return;
    const room = `battle:${String(roomCode).trim().toUpperCase()}`;
    io.to(room).emit('battle:game_countdown', { countdown: countdownSeconds });
  });

  // Player locked in an answer
  socket.on('battle:submit_answer', ({ roomCode, userId, name, timeTaken, allAnswered }) => {
    if (!roomCode) return;
    const room = `battle:${String(roomCode).trim().toUpperCase()}`;
    // Notify room that this player answered (without revealing the selected option to prevent copying!)
    io.to(room).emit('battle:answer_locked', {
      userId,
      name: name || 'Player',
      timeTaken,
      allAnswered: Boolean(allAnswered)
    });
  });

  // Advance question / round change
  socket.on('battle:advance_question', ({ roomCode, currentQuestionIndex, roundStartTime }) => {
    if (!roomCode) return;
    const room = `battle:${String(roomCode).trim().toUpperCase()}`;
    io.to(room).emit('battle:round_advanced', {
      currentQuestionIndex,
      roundStartTime: roundStartTime || new Date()
    });
  });

  // Game completed
  socket.on('battle:finish_game', ({ roomCode, winner, leaderboard }) => {
    if (!roomCode) return;
    const room = `battle:${String(roomCode).trim().toUpperCase()}`;
    io.to(room).emit('battle:game_completed', { winner, leaderboard });
  });

  // Live in-game emoji reaction
  socket.on('battle:reaction', ({ roomCode, emoji, name, userId }) => {
    if (!roomCode || !emoji) return;
    const room = `battle:${String(roomCode).trim().toUpperCase()}`;
    io.to(room).emit('battle:reaction_received', {
      emoji,
      name: name || 'Player',
      userId,
      id: Math.random().toString(36).substring(7)
    });
  });

  // Quick cheer chat message
  socket.on('battle:chat', ({ roomCode, message, senderName, senderAvatar, userId }) => {
    if (!roomCode || !message) return;
    const room = `battle:${String(roomCode).trim().toUpperCase()}`;
    io.to(room).emit('battle:chat_received', {
      message: String(message).trim().slice(0, 100),
      senderName: senderName || 'Player',
      senderAvatar: senderAvatar || '',
      userId,
      timestamp: new Date()
    });
  });
};
