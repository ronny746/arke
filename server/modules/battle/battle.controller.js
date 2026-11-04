const BattleService = require('./battle.service');
const { successResponse, errorResponse } = require('../../common/responses');
const QuestionBank = require('../exams/question-bank.model');

exports.createBattle = async (req, res, next) => {
  try {
    const battle = await BattleService.createBattle(req.user, req.body);
    const sanitized = BattleService.sanitizeForClient(battle, req.user.userId);
    return successResponse(res, 'Battle room created successfully', sanitized);
  } catch (error) {
    next(error);
  }
};

exports.joinBattle = async (req, res, next) => {
  try {
    const { roomCode } = req.body;
    if (!roomCode) {
      return errorResponse(res, 'Room code is required', null, 400);
    }
    const battle = await BattleService.joinBattle(req.user, roomCode);
    const sanitized = BattleService.sanitizeForClient(battle, req.user.userId);
    return successResponse(res, 'Joined battle room successfully', sanitized);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('full') || error.message.includes('started')) {
      return errorResponse(res, error.message, null, 400);
    }
    next(error);
  }
};

exports.getBattle = async (req, res, next) => {
  try {
    const { roomCode } = req.params;
    const QuizBattle = require('./battle.model');
    const battle = await QuizBattle.findOne({ roomCode: roomCode.toUpperCase() });
    if (!battle) {
      return errorResponse(res, 'Battle room not found', null, 404);
    }
    const sanitized = BattleService.sanitizeForClient(battle, req.user.userId);
    return successResponse(res, 'Battle details retrieved', sanitized);
  } catch (error) {
    next(error);
  }
};

exports.toggleReady = async (req, res, next) => {
  try {
    const { roomCode } = req.params;
    const battle = await BattleService.toggleReady(req.user, roomCode);
    const sanitized = BattleService.sanitizeForClient(battle, req.user.userId);
    return successResponse(res, 'Ready status updated', sanitized);
  } catch (error) {
    next(error);
  }
};

exports.startBattle = async (req, res, next) => {
  try {
    const { roomCode } = req.params;
    const battle = await BattleService.startBattle(req.user, roomCode);
    const sanitized = BattleService.sanitizeForClient(battle, req.user.userId);
    return successResponse(res, 'Battle started', sanitized);
  } catch (error) {
    if (error.message.includes('host')) {
      return errorResponse(res, error.message, null, 403);
    }
    next(error);
  }
};

exports.submitAnswer = async (req, res, next) => {
  try {
    const { roomCode } = req.params;
    const { questionIndex, selectedOptionIndex, selectedOption, timeTaken } = req.body;
    const optIndex = selectedOptionIndex !== undefined ? selectedOptionIndex : selectedOption;
    const result = await BattleService.submitAnswer(req.user, roomCode, {
      questionIndex,
      selectedOptionIndex: optIndex,
      timeTaken
    });
    return successResponse(res, 'Answer submitted', result);
  } catch (error) {
    next(error);
  }
};

exports.nextQuestion = async (req, res, next) => {
  try {
    const { roomCode } = req.params;
    const battle = await BattleService.nextQuestion(req.user, roomCode);
    const sanitized = BattleService.sanitizeForClient(battle, req.user.userId);
    return successResponse(res, 'Question advanced', sanitized);
  } catch (error) {
    next(error);
  }
};

exports.leaveBattle = async (req, res, next) => {
  try {
    const { roomCode } = req.params;
    const battle = await BattleService.leaveBattle(req.user, roomCode);
    return successResponse(res, 'Left battle room', battle ? { roomCode: battle.roomCode } : null);
  } catch (error) {
    next(error);
  }
};

exports.getActiveBattles = async (req, res, next) => {
  try {
    const instituteId = req.user.instituteId;
    const battles = await BattleService.getActiveBattles(instituteId);
    return successResponse(res, 'Active battles retrieved', battles);
  } catch (error) {
    next(error);
  }
};

exports.getMyBattles = async (req, res, next) => {
  try {
    const battles = await BattleService.getMyBattles(req.user.userId);
    return successResponse(res, 'Battle history retrieved', battles);
  } catch (error) {
    next(error);
  }
};

exports.getAdminBattles = async (req, res, next) => {
  try {
    const instituteId = req.user.instituteId;
    const result = await BattleService.getAdminBattles(instituteId, req.query);
    return successResponse(res, 'Admin battles retrieved', result);
  } catch (error) {
    next(error);
  }
};

exports.deleteBattle = async (req, res, next) => {
  try {
    const { id } = req.params;
    await BattleService.deleteBattle(id);
    return successResponse(res, 'Battle deleted successfully');
  } catch (error) {
    next(error);
  }
};

exports.getBattleFilters = async (req, res, next) => {
  try {
    const instituteId = req.user.instituteId;
    const banks = await QuestionBank.find({ institute: instituteId })
      .select('_id title bankType totalQuestions')
      .limit(30)
      .lean();

    const subjects = ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'General Science', 'Mixed'];

    return successResponse(res, 'Battle filters retrieved', { banks, subjects });
  } catch (error) {
    next(error);
  }
};
