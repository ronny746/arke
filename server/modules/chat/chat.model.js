const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  type: { type: String, enum: ['DIRECT', 'GROUP'], required: true },
  name: { type: String }, // Optional, mostly for GROUP chats
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  metadata: { type: mongoose.Schema.Types.Mixed } // e.g. { batchId: '...', subjectId: '...' }
}, { timestamps: true });

const chatMessageSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String },
  attachments: [{ type: String }],
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

module.exports = { ChatRoom, ChatMessage };
