const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Upload } = require('@aws-sdk/lib-storage');
const { s3Client, bucketName } = require('../config/s3');

const { User, Room, Message, Note, Recording, SharedFile } = require('../models/Schemas');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

const uploadsDir = path.resolve('./uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = new Set([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png', 'image/jpeg', 'image/webp',
    ]);
    cb(allowed.has(file.mimetype) ? null : new Error('Only PDFs, Office documents, and images can be shared.'), allowed.has(file.mimetype));
  },
});

// Auth Middleware
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

// Signup
router.post('/auth/signup', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });
    
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: 'Username already exists.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, role });
    await user.save();

    const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET);
    res.json({ token, user: { username: user.username, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'Invalid credentials.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials.' });

    const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET);
    res.json({ token, user: { username: user.username, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Room (Teacher only)
router.post('/rooms/create', auth, async (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Only teachers can create classrooms.' });
  }
  try {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const room = new Room({
      roomCode,
      creator: req.user.id,
      roomType: req.body.roomType || 'meeting'
    });
    await room.save();

    const note = new Note({ roomCode, content: '' });
    await note.save();

    res.json({ roomCode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Join Room Validation
router.get('/rooms/validate/:roomCode', auth, async (req, res) => {
  try {
    const room = await Room.findOne({ roomCode: req.params.roomCode.toUpperCase(), active: true });
    if (!room) return res.status(404).json({ error: 'Classroom not found or is inactive.' });
    res.json({ valid: true, roomType: room.roomType || 'meeting' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch Room Messages
router.get('/rooms/:roomCode/messages', auth, async (req, res) => {
  try {
    const messages = await Message.find({ roomCode: req.params.roomCode.toUpperCase() }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch Room Notes
router.get('/rooms/:roomCode/notes', auth, async (req, res) => {
  try {
    let note = await Note.findOne({ roomCode: req.params.roomCode.toUpperCase() });
    if (!note) {
      note = new Note({ roomCode: req.params.roomCode.toUpperCase(), content: '' });
      await note.save();
    }
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List recordings for a room
router.get('/recordings/:roomCode', auth, async (req, res) => {
  try {
    const recordings = await Recording.find({ roomCode: req.params.roomCode.toUpperCase() }).sort({ createdAt: -1 });
    res.json(recordings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload shared file
router.post('/files/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const { roomCode } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    if (!roomCode) return res.status(400).json({ error: 'Room code required.' });
    if (!bucketName) return res.status(503).json({ error: 'File storage is not configured.' });

    const normalizedRoom = roomCode.toUpperCase();
    const safeName = path.basename(req.file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `live-classes/${normalizedRoom}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
    await new Upload({
      client: s3Client,
      params: {
        Bucket: bucketName,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        ContentDisposition: `attachment; filename="${safeName}"`,
      },
    }).done();
    const downloadUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    const newFile = new SharedFile({
      roomCode: normalizedRoom,
      filename: req.file.originalname,
      downloadUrl,
      senderName: req.user.username
    });
    await newFile.save();

    const payload = newFile.toJSON();
    req.app.get('io')?.to(normalizedRoom).emit('file-shared', payload);
    res.status(201).json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch shared files history
router.get('/rooms/:roomCode/files', auth, async (req, res) => {
  try {
    const files = await SharedFile.find({ roomCode: req.params.roomCode.toUpperCase() }).sort({ createdAt: 1 });
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
