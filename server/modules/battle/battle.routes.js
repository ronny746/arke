const express = require('express');
const router = express.Router();
const BattleController = require('./battle.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.use(authMiddleware);

// Student & Admin endpoints
router.get('/filters', BattleController.getBattleFilters);
router.post('/create', BattleController.createBattle);
router.post('/join', BattleController.joinBattle);
router.get('/active', BattleController.getActiveBattles);
router.get('/my-history', BattleController.getMyBattles);

// Room specific endpoints
router.get('/room/:roomCode', BattleController.getBattle);
router.post('/room/:roomCode/ready', BattleController.toggleReady);
router.post('/room/:roomCode/start', BattleController.startBattle);
router.post('/room/:roomCode/answer', BattleController.submitAnswer);
router.post('/room/:roomCode/next', BattleController.nextQuestion);
router.post('/room/:roomCode/leave', BattleController.leaveBattle);

// Admin exclusive endpoints
router.get('/admin/all', BattleController.getAdminBattles);
router.delete('/admin/:id', BattleController.deleteBattle);

module.exports = router;
