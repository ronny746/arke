const ChatService = require('./chat.service');
const { successResponse } = require('../../common/responses');

exports.createRoom = async (req, res, next) => {
  try {
    const data = await ChatService.createRoom(req.user, req.body);
    return successResponse(res, 'Chat room created successfully', data, null, 201);
  } catch (error) {
    next(error);
  }
};

exports.getRooms = async (req, res, next) => {
  try {
    const data = await ChatService.getRooms(req.user);
    return successResponse(res, 'Chat rooms retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const data = await ChatService.sendMessage(req.params.roomId, req.user, req.body);
    return successResponse(res, 'Message sent successfully', data, null, 201);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(403).json({ success: false, message: error.message });
    }
    next(error);
  }
};

exports.getMessages = async (req, res, next) => {
  try {
    const data = await ChatService.getMessages(req.params.roomId, req.user);
    return successResponse(res, 'Messages retrieved successfully', data);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(403).json({ success: false, message: error.message });
    }
    next(error);
  }
};
