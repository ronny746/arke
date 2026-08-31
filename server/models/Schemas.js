const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['teacher', 'student'], default: 'student' }
}, { timestamps: true });

const RoomSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, unique: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roomType: { type: String, default: 'meeting' },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const MessageSchema = new mongoose.Schema({
  roomCode: { type: String, required: true },
  senderName: { type: String, required: true },
  role: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const NoteSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, unique: true },
  content: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
});

const RecordingSchema = new mongoose.Schema({
  roomCode: { type: String, required: true },
  filepath: { type: String, required: true },
  downloadUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const SharedFileSchema = new mongoose.Schema({
  roomCode: { type: String, required: true },
  filename: { type: String, required: true },
  downloadUrl: { type: String, required: true },
  senderName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const MeetonlineUser = mongoose.models.MeetonlineUser || mongoose.model('MeetonlineUser', UserSchema);
const Room = mongoose.models.Room || mongoose.model('Room', RoomSchema);
const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);
const Note = mongoose.models.Note || mongoose.model('Note', NoteSchema);
const Recording = mongoose.models.Recording || mongoose.model('Recording', RecordingSchema);
const SharedFile = mongoose.models.SharedFile || mongoose.model('SharedFile', SharedFileSchema);

module.exports = { User: MeetonlineUser, Room, Message, Note, Recording, SharedFile };
