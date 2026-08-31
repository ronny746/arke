const express = require('express');
const router = express.Router();
const ChatController = require('./chat.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const { createRoomSchema, sendMessageSchema } = require('./chat.validation');

// All chat routes require authentication (applicable to all roles)
router.use(authMiddleware);

router.post('/rooms', validate(createRoomSchema), ChatController.createRoom);
router.get('/rooms', ChatController.getRooms);

router.post('/rooms/:roomId/messages', validate(sendMessageSchema), ChatController.sendMessage);
router.get('/rooms/:roomId/messages', ChatController.getMessages);

module.exports = router;
