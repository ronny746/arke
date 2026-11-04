const QuizBattle = require('./battle.model');
const QuestionBank = require('../exams/question-bank.model');
const UserModel = require('../users/users.model');
const mongoose = require('mongoose');

// Fallback high-quality STEM & general science questions for instant battle readiness
const FALLBACK_QUESTIONS = [
  {
    questionText: 'What is the SI unit of Electric Potential?',
    options: [
      { text: 'Volt', isCorrect: true },
      { text: 'Joule', isCorrect: false },
      { text: 'Coulomb', isCorrect: false },
      { text: 'Newton', isCorrect: false }
    ],
    correctOptionIndex: 0,
    explanation: 'The SI unit of electric potential and electromotive force is the Volt (V), which equals 1 Joule per Coulomb.',
    marks: 100
  },
  {
    questionText: 'Which law states that the induced electromotive force in any closed circuit is equal to the negative rate of change of magnetic flux through the circuit?',
    options: [
      { text: "Coulomb's Law", isCorrect: false },
      { text: "Faraday's Law of Induction", isCorrect: true },
      { text: "Ampere's Circuital Law", isCorrect: false },
      { text: "Gauss's Law", isCorrect: false }
    ],
    correctOptionIndex: 1,
    explanation: "Faraday's Law of Electromagnetic Induction states that emf = -dΦ/dt.",
    marks: 100
  },
  {
    questionText: 'What happens to the capacitance of a parallel plate capacitor if a dielectric slab is inserted between its plates?',
    options: [
      { text: 'Decreases', isCorrect: false },
      { text: 'Remains the same', isCorrect: false },
      { text: 'Increases by factor K', isCorrect: true },
      { text: 'Becomes zero', isCorrect: false }
    ],
    correctOptionIndex: 2,
    explanation: 'When a dielectric with dielectric constant K is introduced, the capacitance increases to C = K * C0.',
    marks: 100
  },
  {
    questionText: 'Two charges +q and -q are separated by a distance 2a. What is the electric potential at any point on the equatorial plane of this dipole?',
    options: [
      { text: 'Zero', isCorrect: true },
      { text: '2kq/a', isCorrect: false },
      { text: 'kq/a²', isCorrect: false },
      { text: 'Infinite', isCorrect: false }
    ],
    correctOptionIndex: 0,
    explanation: 'On the equatorial plane, the distance from +q and -q is identical. Hence, V = kq/r + (-kq/r) = 0.',
    marks: 100
  },
  {
    questionText: 'What is the velocity of electromagnetic waves in a vacuum?',
    options: [
      { text: '3 × 10⁸ m/s', isCorrect: true },
      { text: '3 × 10⁶ m/s', isCorrect: false },
      { text: '332 m/s', isCorrect: false },
      { text: 'Infinite', isCorrect: false }
    ],
    correctOptionIndex: 0,
    explanation: 'The speed of light/electromagnetic waves in vacuum is c = 1/√(μ₀ε₀) ≈ 3 × 10⁸ m/s.',
    marks: 100
  },
  {
    questionText: 'In a photoelectric effect experiment, the stopping potential depends directly on the:',
    options: [
      { text: 'Intensity of incident radiation', isCorrect: false },
      { text: 'Frequency of incident radiation', isCorrect: true },
      { text: 'Distance between source and plate', isCorrect: false },
      { text: 'Time of exposure', isCorrect: false }
    ],
    correctOptionIndex: 1,
    explanation: 'According to Einstein photoelectric equation, eV₀ = hν - Φ. Stopping potential V₀ depends linearly on frequency ν.',
    marks: 100
  },
  {
    questionText: 'What is the total resistance when two resistors of 6 Ω and 3 Ω are connected in parallel?',
    options: [
      { text: '9 Ω', isCorrect: false },
      { text: '2 Ω', isCorrect: true },
      { text: '4.5 Ω', isCorrect: false },
      { text: '18 Ω', isCorrect: false }
    ],
    correctOptionIndex: 1,
    explanation: '1/R = 1/6 + 1/3 = 3/6 = 1/2 => R = 2 Ω.',
    marks: 100
  },
  {
    questionText: 'A particle moves in a circle of radius r with constant speed v. What is its centripetal acceleration?',
    options: [
      { text: 'v / r', isCorrect: false },
      { text: 'v² / r', isCorrect: true },
      { text: 'v² · r', isCorrect: false },
      { text: 'Zero', isCorrect: false }
    ],
    correctOptionIndex: 1,
    explanation: 'Centripetal acceleration a = v²/r directed towards the center of the circle.',
    marks: 100
  }
];

class BattleService {
  /**
   * Generate an uppercase 6-character room code (e.g. BTL482)
   */
  static async generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    let exists = true;
    let attempts = 0;

    while (exists && attempts < 10) {
      code = 'BTL';
      for (let i = 0; i < 3; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const found = await QuizBattle.findOne({ roomCode: code, status: { $ne: 'COMPLETED' } });
      if (!found) exists = false;
      attempts++;
    }

    if (exists) {
      code = 'BTL' + Math.floor(100 + Math.random() * 900);
    }

    return code;
  }

  /**
   * Pull and randomize questions from Question Banks or fallback pool
   */
  static async pickQuestions(instituteId, { questionBankId, subjectName, count = 5 }) {
    const requestedCount = Math.max(3, Math.min(25, parseInt(count, 10) || 5));
    let rawQuestions = [];

    try {
      if (questionBankId && mongoose.Types.ObjectId.isValid(questionBankId)) {
        const bank = await QuestionBank.findById(questionBankId);
        if (bank && bank.questions && bank.questions.length > 0) {
          rawQuestions = bank.questions.filter(q => q.options && q.options.length >= 2);
        }
      }

      if (rawQuestions.length === 0 && instituteId) {
        const query = { institute: new mongoose.Types.ObjectId(instituteId) };
        const banks = await QuestionBank.find(query).limit(10);
        for (const b of banks) {
          if (b.questions && b.questions.length > 0) {
            const matches = b.questions.filter(q => {
              if (subjectName && subjectName !== 'Mixed' && subjectName !== 'All') {
                return q.subjectName?.toLowerCase() === subjectName.toLowerCase() && q.options?.length >= 2;
              }
              return q.options && q.options.length >= 2;
            });
            rawQuestions.push(...matches);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching questions for battle:', err);
    }

    // Convert raw questions into standardized battle format
    let formatted = [];
    if (rawQuestions.length > 0) {
      // Shuffle array
      const shuffled = rawQuestions.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, requestedCount);

      formatted = selected.map(q => {
        const opts = (q.options || []).map(o => ({
          text: o.text || '',
          imageUrl: o.imageUrl || '',
          isCorrect: Boolean(o.isCorrect)
        }));

        let correctIdx = opts.findIndex(o => o.isCorrect);
        if (correctIdx === -1 && opts.length > 0) {
          // If no option was marked correct, default to first
          opts[0].isCorrect = true;
          correctIdx = 0;
        }

        return {
          questionText: q.questionText || 'Question',
          questionImageUrl: q.questionImageUrl || '',
          options: opts,
          correctOptionIndex: correctIdx,
          explanation: q.explanation || '',
          marks: q.marks || 100,
          negativeMarks: q.negativeMarks || 0
        };
      });
    }

    // If still not enough, append from fallback questions
    if (formatted.length < requestedCount) {
      const need = requestedCount - formatted.length;
      const shuffledFallback = [...FALLBACK_QUESTIONS].sort(() => 0.5 - Math.random());
      for (let i = 0; i < need && i < shuffledFallback.length; i++) {
        formatted.push(shuffledFallback[i]);
      }
    }

    return formatted;
  }

  /**
   * Create a new Battle
   */
  static async createBattle(user, data) {
    const instituteId = user.instituteId;
    const roomCode = await this.generateRoomCode();
    const count = parseInt(data.totalQuestions || data.questionCount, 10) || 5;
    const timeLimit = Math.max(10, Math.min(120, parseInt(data.timePerQuestion, 10) || 20));
    const subject = data.subjectName || data.subject || 'Mixed';
    const maxParticipants = data.mode === '1v1' ? 2 : (parseInt(data.maxParticipants, 10) || 10);

    const questions = await this.pickQuestions(instituteId, {
      questionBankId: data.questionBankId,
      subjectName: subject,
      count
    });

    const hostUser = await UserModel.findById(user.userId).select('firstName lastName profilePictureUrl role');
    const hostName = hostUser ? `${hostUser.firstName || ''} ${hostUser.lastName || ''}`.trim() : 'Player 1';
    const hostAvatar = hostUser?.profilePictureUrl || '';

    const battle = await QuizBattle.create({
      roomCode,
      title: data.title?.trim() || `${subject} Battle`,
      institute: instituteId,
      createdBy: user.userId,
      creatorName: hostName,
      creatorRole: user.role || 'student',
      mode: data.mode === 'GROUP' ? 'GROUP' : '1v1',
      maxParticipants,
      status: 'WAITING',
      subjectName: subject,
      chapterName: data.chapterName || '',
      topicName: data.topicName || '',
      questionBank: data.questionBankId || null,
      timePerQuestion: timeLimit,
      totalQuestions: questions.length,
      questions,
      participants: [{
        user: user.userId,
        name: hostName,
        avatar: hostAvatar,
        role: user.role || 'student',
        isHost: true,
        isReady: true,
        score: 0,
        streak: 0,
        maxStreak: 0,
        correctCount: 0,
        wrongCount: 0,
        totalTimeTaken: 0,
        answers: []
      }],
      currentQuestionIndex: 0
    });

    return battle;
  }

  /**
   * Join an existing battle
   */
  static async joinBattle(user, roomCode) {
    const code = String(roomCode || '').trim().toUpperCase();
    const battle = await QuizBattle.findOne({ roomCode: code });

    if (!battle) {
      throw new Error(`Battle room ${code} not found. Please check your room code.`);
    }

    if (battle.status === 'CANCELLED') {
      throw new Error('This battle has been cancelled.');
    }

    if (battle.status === 'COMPLETED') {
      return battle; // Can view results
    }

    // If user already in battle
    const existingParticipant = battle.participants.find(p => p.user.toString() === user.userId.toString());
    if (existingParticipant) {
      return battle;
    }

    if (battle.status !== 'WAITING') {
      throw new Error('This battle has already started and cannot accept new players.');
    }

    const maxPlayers = battle.mode === '1v1' ? 2 : 16;
    if (battle.participants.length >= maxPlayers) {
      throw new Error(`This battle is full (maximum ${maxPlayers} players for ${battle.mode} mode).`);
    }

    const joinUser = await UserModel.findById(user.userId).select('firstName lastName profilePictureUrl role');
    const joinName = joinUser ? `${joinUser.firstName || ''} ${joinUser.lastName || ''}`.trim() : `Player ${battle.participants.length + 1}`;
    const joinAvatar = joinUser?.profilePictureUrl || '';

    battle.participants.push({
      user: user.userId,
      name: joinName,
      avatar: joinAvatar,
      role: user.role || 'student',
      isHost: false,
      isReady: true,
      score: 0,
      streak: 0,
      maxStreak: 0,
      correctCount: 0,
      wrongCount: 0,
      totalTimeTaken: 0,
      answers: []
    });

    await battle.save();
    return battle;
  }

  /**
   * Toggle Ready status
   */
  static async toggleReady(user, roomCode) {
    const code = String(roomCode || '').trim().toUpperCase();
    const battle = await QuizBattle.findOne({ roomCode: code });
    if (!battle) throw new Error('Battle not found');

    const participant = battle.participants.find(p => p.user.toString() === user.userId.toString());
    if (!participant) throw new Error('You are not in this battle');

    participant.isReady = !participant.isReady;
    await battle.save();
    return battle;
  }

  /**
   * Start Battle (Host or Admin only)
   */
  static async startBattle(user, roomCode) {
    const code = String(roomCode || '').trim().toUpperCase();
    const battle = await QuizBattle.findOne({ roomCode: code });
    if (!battle) throw new Error('Battle not found');

    if (battle.status !== 'WAITING') {
      return battle;
    }

    const isHost = battle.createdBy.toString() === user.userId.toString();
    const isAdmin = user.role === 'admin';
    if (!isHost && !isAdmin) {
      throw new Error('Only the room host can start the battle.');
    }

    if (battle.mode === '1v1' && battle.participants.length < 2) {
      // Allow starting with 1 player only if testing/solo duel, but warn
      console.log('Starting 1v1 battle with 1 player (solo/test mode)');
    }

    battle.status = 'IN_PROGRESS';
    battle.currentQuestionIndex = 0;
    battle.startedAt = new Date();
    battle.roundStartTime = new Date();

    await battle.save();
    return battle;
  }

  /**
   * Submit an answer for the current round
   */
  static async submitAnswer(user, roomCode, { questionIndex, selectedOptionIndex, timeTaken }) {
    const code = String(roomCode || '').trim().toUpperCase();
    const battle = await QuizBattle.findOne({ roomCode: code });
    if (!battle) throw new Error('Battle not found');

    if (battle.status !== 'IN_PROGRESS') {
      throw new Error('Battle is not currently in progress');
    }

    const currentQIdx = battle.currentQuestionIndex;
    if (parseInt(questionIndex, 10) !== currentQIdx) {
      throw new Error('Submitting answer for an expired or future round');
    }

    const participant = battle.participants.find(p => p.user.toString() === user.userId.toString());
    if (!participant) throw new Error('Participant not in this battle');

    // Check if already answered this question
    const alreadyAnswered = participant.answers.some(a => a.questionIndex === currentQIdx);
    if (alreadyAnswered) {
      return { battle: this.sanitizeForClient(battle, user.userId), result: participant.answers.find(a => a.questionIndex === currentQIdx) };
    }

    const currentQ = battle.questions[currentQIdx];
    const isCorrect = selectedOptionIndex === currentQ.correctOptionIndex;
    const totalTime = battle.timePerQuestion || 20;
    const safeTimeTaken = Math.max(0.2, Math.min(totalTime, parseFloat(timeTaken) || 5));

    let pointsAwarded = 0;
    if (isCorrect) {
      // Base marks (100)
      const base = currentQ.marks || 100;
      // Speed bonus: up to 50 extra points for fast answer
      const speedRatio = Math.max(0, (totalTime - safeTimeTaken) / totalTime);
      const speedBonus = Math.round(speedRatio * 50);
      // Streak bonus: +10 pts per current streak
      participant.streak = (participant.streak || 0) + 1;
      if (participant.streak > (participant.maxStreak || 0)) {
        participant.maxStreak = participant.streak;
      }
      const streakBonus = Math.min(50, (participant.streak - 1) * 10);

      pointsAwarded = base + speedBonus + streakBonus;
      participant.score += pointsAwarded;
      participant.correctCount = (participant.correctCount || 0) + 1;
    } else {
      participant.streak = 0;
      participant.wrongCount = (participant.wrongCount || 0) + 1;
      if (currentQ.negativeMarks && currentQ.negativeMarks > 0) {
        participant.score = Math.max(0, participant.score - currentQ.negativeMarks);
      }
    }

    participant.totalTimeTaken = (participant.totalTimeTaken || 0) + safeTimeTaken;

    const answerRecord = {
      questionIndex: currentQIdx,
      selectedOptionIndex,
      isCorrect,
      timeTaken: safeTimeTaken,
      pointsAwarded
    };

    participant.answers.push(answerRecord);

    // Check if all participants have answered this question
    const allAnswered = battle.participants.every(p => 
      p.answers.some(a => a.questionIndex === currentQIdx)
    );

    await battle.save();

    const speedBonusValue = isCorrect ? Math.round(Math.max(0, (totalTime - safeTimeTaken) / totalTime) * 50) : 0;

    return {
      battle: this.sanitizeForClient(battle, user.userId),
      answerResult: answerRecord,
      allAnswered,
      isCorrect,
      pointsAwarded,
      streak: participant.streak || 0,
      newTotalScore: participant.score || 0,
      basePoints: currentQ.marks || 100,
      speedBonus: speedBonusValue,
      correctAnswer: currentQ.correctOptionIndex
    };
  }

  /**
   * Advance to next question or complete battle
   */
  static async nextQuestion(user, roomCode) {
    const code = String(roomCode || '').trim().toUpperCase();
    const battle = await QuizBattle.findOne({ roomCode: code });
    if (!battle) throw new Error('Battle not found');

    if (battle.status !== 'IN_PROGRESS') {
      return battle;
    }

    const nextIndex = battle.currentQuestionIndex + 1;

    if (nextIndex >= battle.totalQuestions) {
      // Battle finished! Compute leaderboard & winner
      battle.status = 'COMPLETED';
      battle.completedAt = new Date();

      // Compute rank & leaderboard
      const sorted = [...battle.participants].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.totalTimeTaken - b.totalTimeTaken; // Faster wins tiebreaker
      });

      battle.leaderboard = sorted.map((p, idx) => ({
        user: p.user,
        name: p.name,
        avatar: p.avatar,
        score: p.score,
        rank: idx + 1,
        correctCount: p.correctCount || 0,
        accuracy: Math.round(((p.correctCount || 0) / battle.totalQuestions) * 100),
        totalTimeTaken: Math.round(p.totalTimeTaken || 0)
      }));

      if (sorted.length > 0) {
        battle.winner = {
          user: sorted[0].user,
          name: sorted[0].name,
          avatar: sorted[0].avatar,
          score: sorted[0].score
        };
      }
    } else {
      battle.currentQuestionIndex = nextIndex;
      battle.roundStartTime = new Date();
    }

    await battle.save();
    return battle;
  }

  /**
   * Leave / Forfeit room
   */
  static async leaveBattle(user, roomCode) {
    const code = String(roomCode || '').trim().toUpperCase();
    const battle = await QuizBattle.findOne({ roomCode: code });
    if (!battle) return null;

    if (battle.status === 'WAITING') {
      battle.participants = battle.participants.filter(p => p.user.toString() !== user.userId.toString());
      if (battle.participants.length === 0) {
        battle.status = 'CANCELLED';
      } else if (battle.createdBy.toString() === user.userId.toString()) {
        // Pass host to next player
        battle.createdBy = battle.participants[0].user;
        battle.participants[0].isHost = true;
      }
      await battle.save();
    }

    return battle;
  }

  /**
   * Sanitize battle payload for client (prevent cheating by hiding future questions & current correct option)
   */
  static sanitizeForClient(battle, currentUserId) {
    if (!battle) return null;
    const b = battle.toObject ? battle.toObject() : JSON.parse(JSON.stringify(battle));

    if (b.status === 'COMPLETED') {
      b.questionCount = b.totalQuestions || (b.questions ? b.questions.length : 0);
      b.subject = b.subjectName;
      b.hostId = b.createdBy;
      b.participants = (b.participants || []).map(p => ({ ...p, studentId: p.user }));
      if (b.winner && b.winner.user) b.winner.studentId = b.winner.user;
      if (b.leaderboard) b.leaderboard = b.leaderboard.map(lb => ({ ...lb, studentId: lb.user }));
      return b; // Return full details including explanations and answers
    }

    // Map common frontend aliases
    b.questionCount = b.totalQuestions || (b.questions ? b.questions.length : 0);
    b.subject = b.subjectName;
    b.hostId = b.createdBy;
    b.participants = (b.participants || []).map(p => ({ ...p, studentId: p.user }));
    if (b.winner && b.winner.user) b.winner.studentId = b.winner.user;
    if (b.leaderboard) b.leaderboard = b.leaderboard.map(lb => ({ ...lb, studentId: lb.user }));

    // If waiting or in progress, do not send answers of future questions
    if (b.questions && Array.isArray(b.questions)) {
      const currentQIdx = b.currentQuestionIndex || 0;
      
      b.questions = b.questions.map((q, idx) => {
        // Check if user has answered this question already
        const myAnswer = b.participants?.find(p => (p.user?.toString() === currentUserId?.toString()) || (p.studentId?.toString() === currentUserId?.toString()))
          ?.answers?.find(a => a.questionIndex === idx);

        const isCurrentOrPast = idx <= currentQIdx;

        if (!isCurrentOrPast) {
          // Future question: hide everything except placeholder
          return { questionText: '', options: [] };
        }

        // For current question: hide correct answer if round is still live and user hasn't answered
        const shouldHideAnswer = idx === currentQIdx && !myAnswer && b.status === 'IN_PROGRESS';

        return {
          questionText: q.questionText,
          questionImageUrl: q.questionImageUrl,
          marks: q.marks,
          options: q.options?.map(opt => ({
            text: opt.text,
            imageUrl: opt.imageUrl,
            isCorrect: shouldHideAnswer ? undefined : opt.isCorrect
          })),
          correctOptionIndex: shouldHideAnswer ? undefined : q.correctOptionIndex,
          explanation: shouldHideAnswer ? '' : q.explanation
        };
      });
    }

    return b;
  }

  /**
   * Fetch active rooms
   */
  static async getActiveBattles(instituteId) {
    const query = {
      status: { $in: ['WAITING', 'IN_PROGRESS'] }
    };
    if (instituteId && mongoose.Types.ObjectId.isValid(instituteId)) {
      query.institute = new mongoose.Types.ObjectId(instituteId);
    }

    const battles = await QuizBattle.find(query)
      .sort({ createdAt: -1 })
      .limit(20)
      .select('roomCode title mode status subjectName timePerQuestion totalQuestions maxParticipants participants creatorName createdAt');

    return battles;
  }

  /**
   * Fetch user history
   */
  static async getMyBattles(userId) {
    const battles = await QuizBattle.find({
      'participants.user': new mongoose.Types.ObjectId(userId)
    })
    .sort({ createdAt: -1 })
    .limit(25)
    .select('roomCode title mode status subjectName totalQuestions maxParticipants participants winner createdAt completedAt leaderboard');

    return battles;
  }

  /**
   * Get all battles for admin
   */
  static async getAdminBattles(instituteId, { status, mode, page = 1, limit = 20 }) {
    const query = {};
    if (instituteId && mongoose.Types.ObjectId.isValid(instituteId)) {
      query.institute = new mongoose.Types.ObjectId(instituteId);
    }
    if (status && status !== 'ALL') query.status = status;
    if (mode && mode !== 'ALL') query.mode = mode;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const total = await QuizBattle.countDocuments(query);
    const battles = await QuizBattle.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return { battles, total, page: parseInt(page, 10), pages: Math.ceil(total / limit) };
  }

  /**
   * Delete battle (Admin)
   */
  static async deleteBattle(battleId) {
    return await QuizBattle.findByIdAndDelete(battleId);
  }
}

module.exports = BattleService;
