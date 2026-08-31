const { ChatRoom, ChatMessage } = require('./chat.model');

exports.createRoom = async (reqUser, payload) => {
  // Ensure the creator is also a participant
  const participants = new Set(payload.participantIds);
  participants.add(reqUser.userId.toString());

  const room = new ChatRoom({
    instituteId: reqUser.instituteId,
    type: payload.type,
    name: payload.name,
    participants: Array.from(participants),
    metadata: payload.metadata
  });

  return await room.save();
};

exports.getRooms = async (reqUser) => {
  return await ChatRoom.find({ 
    instituteId: reqUser.instituteId,
    participants: reqUser.userId 
  }).populate('participants', 'firstName lastName role');
};

exports.sendMessage = async (roomId, reqUser, payload) => {
  // Verify user is part of the room
  const room = await ChatRoom.findOne({ _id: roomId, participants: reqUser.userId });
  if (!room) {
    throw new Error('Room not found or you do not have access');
  }

  const message = new ChatMessage({
    roomId,
    senderId: reqUser.userId,
    content: payload.content,
    attachments: payload.attachments,
    readBy: [reqUser.userId]
  });

  await message.save();
  return message;
};

exports.getMessages = async (roomId, reqUser) => {
  // Verify access
  const room = await ChatRoom.findOne({ _id: roomId, participants: reqUser.userId });
  if (!room) {
    throw new Error('Room not found or you do not have access');
  }

  return await ChatMessage.find({ roomId })
    .populate('senderId', 'firstName lastName')
    .sort({ createdAt: 1 });
};
