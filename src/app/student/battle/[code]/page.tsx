"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Swords, Trophy, Flame, Users, Zap, Clock, CheckCircle, 
  XCircle, Copy, Check, Share2, LogOut, ArrowRight, Play, 
  RotateCcw, Sparkles, MessageSquare, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { studentApi } from '@/api/student';
import toast from 'react-hot-toast';
import 'katex/dist/katex.min.css';

const EMOJI_REACTIONS = ['🔥', '⚡', '🎯', '🧠', '👏', '💥', '😱', '👑'];

export default function StudentLiveBattlePage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = String(params.code || '').toUpperCase();

  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string>('');
  const [battle, setBattle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Gameplay state
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [roundResult, setRoundResult] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [totalRoundTime, setTotalRoundTime] = useState<number>(20);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [isReady, setIsReady] = useState(false);
  const [startingCountdown, setStartingCountdown] = useState<number | null>(null);
  const [floatingReactions, setFloatingReactions] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const [showReview, setShowReview] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<any>(null);
  const reactionIdRef = useRef(0);

  // Canvas confetti animation ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token') || '';
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error(e);
      }
    }
    setToken(storedToken);

    if (roomCode) {
      fetchBattleData();
      initSocket(storedToken);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (socketRef.current) {
        socketRef.current.emit('battle:leave_room', { roomCode });
        socketRef.current.disconnect();
      }
    };
  }, [roomCode]);

  // Fetch initial battle state via REST
  const fetchBattleData = async () => {
    try {
      const res = await studentApi.getBattleRoom(roomCode);
      if (res.data?.success) {
        const b = res.data.data;
        setBattle(b);
        setTotalRoundTime(b.timePerQuestion || 20);

        // Check if I am ready
        const storedUser = localStorage.getItem('user');
        const myId = storedUser ? JSON.parse(storedUser)._id || JSON.parse(storedUser).id : null;
        const me = b.participants?.find((p: any) => p.studentId === myId || p.studentId?._id === myId);
        if (me) {
          setIsReady(!!me.isReady);
        }

        if (b.status === 'IN_PROGRESS') {
          setupRoundTimer(b.timePerQuestion || 20);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not load battle room');
      router.push('/student/battle');
    } finally {
      setLoading(false);
    }
  };

  // Initialize Socket.io connection
  const initSocket = (authToken: string) => {
    const socket = io('/', { auth: { token: authToken } });
    socketRef.current = socket;

    socket.on('connect', () => {
      const storedUser = localStorage.getItem('user');
      const u = storedUser ? JSON.parse(storedUser) : null;
      socket.emit('battle:join_room', {
        roomCode,
        username: u?.name || 'Gladiator',
        role: u?.role || 'student'
      });
    });

    socket.on('battle:player_joined', ({ participants, message }) => {
      setBattle((prev: any) => prev ? { ...prev, participants } : prev);
      if (message) toast(message, { icon: '👋' });
    });

    socket.on('battle:player_left', ({ participants, message }) => {
      setBattle((prev: any) => prev ? { ...prev, participants } : prev);
      if (message) toast(message, { icon: '🚪' });
    });

    socket.on('battle:player_ready_changed', ({ studentId, isReady: readyVal, allReady }) => {
      setBattle((prev: any) => {
        if (!prev) return prev;
        const updated = (prev.participants || []).map((p: any) => {
          if (p.studentId === studentId || p.studentId?._id === studentId) {
            return { ...p, isReady: readyVal };
          }
          return p;
        });
        return { ...prev, participants: updated };
      });
    });

    socket.on('battle:started', ({ battle: updatedBattle }) => {
      setStartingCountdown(3);
      const countInt = setInterval(() => {
        setStartingCountdown((curr) => {
          if (curr === null || curr <= 1) {
            clearInterval(countInt);
            setStartingCountdown(null);
            setBattle(updatedBattle);
            resetForNewRound(updatedBattle);
            return null;
          }
          return curr - 1;
        });
      }, 1000);
    });

    socket.on('battle:answer_recorded', ({ studentId, studentName, score, streak, allAnswered }) => {
      setBattle((prev: any) => {
        if (!prev) return prev;
        const updated = (prev.participants || []).map((p: any) => {
          if (p.studentId === studentId || p.studentId?._id === studentId) {
            return { ...p, score, streak, hasAnsweredCurrent: true };
          }
          return p;
        });
        return { ...prev, participants: updated };
      });

      if (allAnswered) {
        toast('All answers locked in! Preparing next clash...', { icon: '⚡' });
      }
    });

    socket.on('battle:next_question', ({ battle: updatedBattle }) => {
      setBattle(updatedBattle);
      resetForNewRound(updatedBattle);
    });

    socket.on('battle:finished', ({ battle: updatedBattle, winner, leaderboard }) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setBattle({ ...updatedBattle, winner, leaderboard, status: 'COMPLETED' });
      triggerCelebration();
    });

    socket.on('battle:reaction_received', ({ emoji }) => {
      triggerFloatingReaction(emoji);
    });
  };

  // Reset round state for a new question
  const resetForNewRound = (b: any) => {
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setRoundResult(null);
    const duration = b.timePerQuestion || 20;
    setTotalRoundTime(duration);
    setTimeLeft(duration);
    setQuestionStartTime(Date.now());
    setupRoundTimer(duration);
  };

  // Setup round countdown timer
  const setupRoundTimer = (seconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(seconds);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeExpired = () => {
    if (!isAnswerSubmitted) {
      // Auto-submit no answer
      submitAnswer(-1, true);
    }
  };

  // Submit Answer
  const submitAnswer = async (optionIndex: number, timeout = false) => {
    if (isAnswerSubmitted && !timeout) return;
    setSelectedOption(optionIndex);
    setIsAnswerSubmitted(true);

    const timeTaken = Math.min(
      battle?.timePerQuestion || 20,
      Math.max(1, Math.round((Date.now() - questionStartTime) / 1000))
    );

    try {
      const res = await studentApi.submitBattleAnswer(roomCode, {
        questionIndex: battle.currentQuestionIndex || 0,
        selectedOption: optionIndex,
        timeTaken
      });

      if (res.data?.success) {
        const data = res.data.data;
        setRoundResult(data);
        if (data.isCorrect) {
          toast.success(`Correct! +${data.pointsAwarded} pts (Streak: ${data.streak} 🔥)`);
        } else if (optionIndex !== -1) {
          toast.error('Incorrect! Streak reset to 0');
        }

        // Notify via socket
        socketRef.current?.emit('battle:submit_answer', {
          roomCode,
          questionIndex: battle.currentQuestionIndex || 0,
          selectedOption: optionIndex,
          timeTaken,
          score: data.newTotalScore,
          streak: data.streak
        });

        // If all answered or game completed, check
        if (data.battle) {
          setBattle(data.battle);
          if (data.battle.status === 'COMPLETED') {
            socketRef.current?.emit('battle:finish_game', {
              roomCode,
              battle: data.battle,
              winner: data.battle.winner,
              leaderboard: data.battle.leaderboard
            });
            triggerCelebration();
          }
        }
      }
    } catch (err: any) {
      console.error('Submit error:', err);
    }
  };

  // Advance to next question (for Host or auto-advance)
  const handleNextQuestion = async () => {
    try {
      const res = await studentApi.nextBattleQuestion(roomCode);
      if (res.data?.success) {
        const updated = res.data.data;
        setBattle(updated);
        resetForNewRound(updated);
        socketRef.current?.emit('battle:advance_question', {
          roomCode,
          battle: updated
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not advance');
    }
  };

  // Toggle Ready
  const handleToggleReady = async () => {
    try {
      const res = await studentApi.toggleBattleReady(roomCode);
      if (res.data?.success) {
        const nextReady = !isReady;
        setIsReady(nextReady);
        socketRef.current?.emit('battle:player_ready', {
          roomCode,
          isReady: nextReady
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update ready status');
    }
  };

  // Host Start Game
  const handleStartGame = async () => {
    try {
      const res = await studentApi.startBattle(roomCode);
      if (res.data?.success) {
        const updated = res.data.data;
        socketRef.current?.emit('battle:start_game', {
          roomCode,
          battle: updated
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Cannot start battle yet');
    }
  };

  // Leave Battle
  const handleLeave = async () => {
    if (confirm('Are you sure you want to exit the battle arena?')) {
      try {
        await studentApi.leaveBattleRoom(roomCode);
      } catch (e) {
        // ignore
      }
      socketRef.current?.emit('battle:leave_room', { roomCode });
      router.push('/student/battle');
    }
  };

  // Copy Room Code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    toast.success('Room code copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  // Share via WhatsApp / Native Share
  const handleShare = () => {
    const text = `⚔️ Join my ARKE Quiz Battle! Room Code: *${roomCode}*. Let's duel and see who scores higher!`;
    const shareUrl = `${window.location.origin}/student/battle/${roomCode}`;
    if (navigator.share) {
      navigator.share({
        title: 'Join ARKE Quiz Battle',
        text: text,
        url: shareUrl
      }).catch(() => {});
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + '\n' + shareUrl)}`, '_blank');
    }
  };

  // Emoji Reactions
  const sendReaction = (emoji: string) => {
    socketRef.current?.emit('battle:reaction', { roomCode, emoji });
    triggerFloatingReaction(emoji);
  };

  const triggerFloatingReaction = (emoji: string) => {
    const id = ++reactionIdRef.current;
    const x = Math.floor(Math.random() * 70) + 15; // 15% - 85% width
    setFloatingReactions((prev) => [...prev, { id, emoji, x }]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2500);
  };

  // Confetti celebration animation using HTML5 Canvas
  const triggerCelebration = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#3b82f6', '#f43f5e'];
    const particles: any[] = [];
    for (let i = 0; i < 150; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 0.7) * 22,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        gravity: 0.35,
        alpha: 1
      });
    }

    let frame = 0;
    const anim = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rotation += p.rotationSpeed;
        p.alpha -= 0.007;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
          ctx.restore();
        }
      });

      if (alive && frame < 180) {
        frame++;
        requestAnimationFrame(anim);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    requestAnimationFrame(anim);
  };

  if (loading || !battle) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center text-white">
        <Swords className="w-12 h-12 text-violet-500 animate-spin mb-4" />
        <h2 className="text-xl font-bold">Connecting to Battle Arena...</h2>
        <p className="text-sm text-slate-400 mt-1">Room: {roomCode}</p>
      </div>
    );
  }

  const myId = user?._id || user?.id;
  const isHost = battle.hostId === myId || battle.hostId?._id === myId;
  const currentQIndex = battle.currentQuestionIndex || 0;
  const currentQuestion = battle.questions?.[currentQIndex];
  const totalQuestions = battle.questionCount || battle.questions?.length || 5;

  // Find me and opponent (for 1v1)
  const myParticipant = battle.participants?.find((p: any) => p.studentId === myId || p.studentId?._id === myId);
  const opponentParticipant = battle.participants?.find((p: any) => p.studentId !== myId && p.studentId?._id !== myId);

  // Timer percentage
  const timerPercent = totalRoundTime > 0 ? (timeLeft / totalRoundTime) * 100 : 0;
  const isTimeUrgent = timeLeft <= 5;

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between selection:bg-violet-600 selection:text-white relative overflow-x-hidden font-sans">
      {/* Canvas for Confetti */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-50 w-full h-full"
      />

      {/* Floating Emoji Layer */}
      <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
        {floatingReactions.map((r) => (
          <div
            key={r.id}
            className="absolute bottom-20 text-4xl animate-float-up"
            style={{ left: `${r.x}%` }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      {/* Top Universal Arena Header */}
      <header className="px-4 md:px-8 py-3.5 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-violet-600/30">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm md:text-base tracking-wide text-white">
                {battle.title}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-violet-950 text-violet-300 border border-violet-800">
                {battle.roomCode}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              {battle.mode === '1v1' ? '1v1 Duel' : 'Battle Royale'} • {battle.subject || 'All Subjects'}
            </div>
          </div>
        </div>

        {/* Status / Exit */}
        <div className="flex items-center gap-3">
          {battle.status === 'IN_PROGRESS' && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-xs font-semibold text-slate-300">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Round {currentQIndex + 1} of {totalQuestions}
            </div>
          )}

          <button
            onClick={handleLeave}
            className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit Arena</span>
          </button>
        </div>
      </header>

      {/* Main Screen Router based on Battle Status */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 flex flex-col justify-center">

        {/* ────────────────────────────────────────────────────────── */}
        {/* STATE 1: WAITING / LOBBY */}
        {/* ────────────────────────────────────────────────────────── */}
        {battle.status === 'WAITING' && (
          <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Countdown Overlay if Starting */}
            {startingCountdown !== null && (
              <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center">
                <div className="text-8xl md:text-9xl font-black text-amber-400 animate-bounce">
                  {startingCountdown}
                </div>
                <div className="text-2xl font-extrabold text-white mt-4 uppercase tracking-widest">
                  Gladiators Prepare!
                </div>
              </div>
            )}

            {/* Room Code Card */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-violet-800/40 p-6 md:p-8 text-center shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-500 via-amber-400 to-indigo-500" />

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-bold uppercase tracking-wider mb-4">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Battle Lobby Active
              </div>

              <h2 className="text-2xl md:text-3xl font-black text-white">
                Share Room Code to Invite
              </h2>
              <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
                Share this 6-character code or the invite link with your batchmates to challenge them:
              </p>

              {/* Big Room Code Box */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <div className="px-8 py-3.5 bg-slate-950 rounded-2xl border-2 border-violet-500/50 shadow-inner">
                  <span className="font-mono text-3xl md:text-4xl font-extrabold tracking-widest text-amber-400">
                    {battle.roomCode}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="px-4 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-violet-600/30 transition-all"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy Code'}
                  </button>

                  <button
                    onClick={handleShare}
                    className="p-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center shadow-lg shadow-emerald-600/30 transition-all"
                    title="Share via WhatsApp"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Battle Parameters */}
              <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-medium">Mode</div>
                  <div className="font-bold text-sm text-white mt-0.5">
                    {battle.mode === '1v1' ? '⚔️ 1v1 Duel' : '🛡️ Battle Royale'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-medium">Questions</div>
                  <div className="font-bold text-sm text-white mt-0.5">
                    {battle.questionCount} Rounds
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-medium">Timer</div>
                  <div className="font-bold text-sm text-white mt-0.5">
                    {battle.timePerQuestion}s / Q
                  </div>
                </div>
              </div>
            </div>

            {/* Participants Roster */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-violet-400" />
                  Gladiators Joined ({battle.participants?.length || 0} / {battle.maxParticipants})
                </h3>
                <span className="text-xs text-slate-400">
                  {battle.mode === '1v1' && (battle.participants?.length < 2 ? 'Waiting for opponent...' : 'Ready for Duel!')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {battle.participants?.map((p: any, idx: number) => {
                  const isMe = p.studentId === myId || p.studentId?._id === myId;
                  const isPlayerHost = battle.hostId === p.studentId || battle.hostId?._id === p.studentId;

                  return (
                    <div
                      key={p.studentId || idx}
                      className={`p-3.5 rounded-xl border flex items-center justify-between ${
                        isMe
                          ? 'bg-violet-950/40 border-violet-700/60'
                          : 'bg-slate-950/60 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center font-bold text-white text-sm shadow">
                          {p.name?.charAt(0) || 'G'}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white flex items-center gap-1.5">
                            {p.name}
                            {isMe && <span className="text-[10px] text-violet-400">(You)</span>}
                            {isPlayerHost && <span className="text-xs" title="Room Host">👑</span>}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {p.isReady ? (
                              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Ready
                              </span>
                            ) : (
                              <span className="text-amber-400/80 font-medium">Getting Ready...</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        {p.isReady ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                            READY
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                            WAITING
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Empty slots preview if 1v1 */}
                {battle.mode === '1v1' && battle.participants?.length < 2 && (
                  <div className="p-3.5 rounded-xl border border-dashed border-slate-800 bg-slate-950/30 flex items-center justify-center text-slate-500 text-xs gap-2">
                    <Clock className="w-4 h-4 animate-pulse text-amber-500" />
                    Waiting for Challenger to join...
                  </div>
                )}
              </div>

              {/* Lobby Action Controls */}
              <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  onClick={handleToggleReady}
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    isReady
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  {isReady ? "Ready! (Click to Unready)" : "Mark as Ready"}
                </button>

                {isHost && (
                  <button
                    onClick={handleStartGame}
                    disabled={battle.participants?.length < 2}
                    className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-sm shadow-xl shadow-orange-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-slate-950" />
                    Start Battle Now!
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────── */}
        {/* STATE 2: IN_PROGRESS / ARENA GAMEPLAY */}
        {/* ────────────────────────────────────────────────────────── */}
        {battle.status === 'IN_PROGRESS' && currentQuestion && (
          <div className="w-full space-y-5 animate-in fade-in duration-200">
            {/* Matchup Header Bar (VS status) */}
            {battle.mode === '1v1' ? (
              <div className="grid grid-cols-2 gap-3 bg-slate-900/90 rounded-2xl border border-slate-800 p-3.5 shadow-lg relative">
                {/* Center VS Badge */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-lg border-2 border-slate-950">
                  VS
                </div>

                {/* Left: You */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-violet-600 border-2 border-violet-400 flex items-center justify-center font-bold text-white text-base shadow">
                    {myParticipant?.name?.charAt(0) || 'Y'}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white flex items-center gap-1.5">
                      {myParticipant?.name || 'You'}
                      {myParticipant?.streak >= 2 && (
                        <span className="text-xs text-amber-400 flex items-center">
                          <Flame className="w-3.5 h-3.5 fill-amber-400" /> {myParticipant.streak}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-extrabold text-violet-400">
                      {myParticipant?.score || 0} pts
                    </div>
                  </div>
                </div>

                {/* Right: Opponent */}
                <div className="flex items-center justify-end gap-3 text-right">
                  <div>
                    <div className="font-bold text-sm text-white flex items-center justify-end gap-1.5">
                      {opponentParticipant?.name || 'Challenger'}
                      {opponentParticipant?.streak >= 2 && (
                        <span className="text-xs text-amber-400 flex items-center">
                          <Flame className="w-3.5 h-3.5 fill-amber-400" /> {opponentParticipant.streak}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-extrabold text-amber-400">
                      {opponentParticipant?.score || 0} pts
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-full bg-indigo-600 border-2 border-indigo-400 flex items-center justify-center font-bold text-white text-base shadow">
                    {opponentParticipant?.name?.charAt(0) || 'C'}
                  </div>
                </div>
              </div>
            ) : (
              /* Group Leaderboard Mini-Strip */
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-2.5 flex items-center gap-4 overflow-x-auto">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 pl-2">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" /> Ranks:
                </span>
                <div className="flex items-center gap-3 flex-1">
                  {[...(battle.participants || [])]
                    .sort((a, b) => (b.score || 0) - (a.score || 0))
                    .map((p, rankIdx) => (
                      <div
                        key={p.studentId || rankIdx}
                        className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
                          p.studentId === myId
                            ? 'bg-violet-900/60 text-violet-200 border border-violet-600'
                            : 'bg-slate-950 text-slate-300 border border-slate-800'
                        }`}
                      >
                        <span className="text-[10px] text-amber-400 font-bold">#{rankIdx + 1}</span>
                        <span>{p.name}</span>
                        <span className="font-bold text-white">{p.score || 0}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Synchronized Round Timer Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold px-1">
                <span className="text-slate-400">
                  Question <strong className="text-white">{currentQIndex + 1}</strong> of {totalQuestions}
                </span>
                <span className={`font-mono font-bold flex items-center gap-1 text-sm ${
                  isTimeUrgent ? 'text-rose-400 animate-pulse' : 'text-amber-400'
                }`}>
                  <Clock className="w-4 h-4" />
                  {timeLeft}s remaining
                </span>
              </div>
              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                    isTimeUrgent ? 'bg-rose-500' : timeLeft <= 10 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${timerPercent}%` }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 md:p-8 shadow-xl relative">
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-violet-950 text-violet-300 border border-violet-800 uppercase tracking-wide">
                  {currentQuestion.subject || battle.subject || 'Question'}
                </span>

                <div className="text-xs text-slate-400">
                  ⚡ Fast answer = Up to <strong className="text-amber-400">+50 Speed Bonus</strong>
                </div>
              </div>

              {/* Render Question Text (with MathML/HTML) */}
              <div
                className="text-lg md:text-xl font-medium text-slate-100 leading-relaxed question-content select-none"
                dangerouslySetInnerHTML={{ __html: currentQuestion.questionText || '' }}
              />

              {/* Question Image if present */}
              {currentQuestion.imageUrl && (
                <div className="mt-4 max-h-60 overflow-hidden rounded-xl border border-slate-800 flex justify-center bg-slate-950">
                  <img src={currentQuestion.imageUrl} alt="Question Diagram" className="object-contain" />
                </div>
              )}
            </div>

            {/* 4 Interactive Option Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {(currentQuestion.options || []).map((opt: any, optIdx: number) => {
                const optLetter = ['A', 'B', 'C', 'D'][optIdx] || `${optIdx + 1}`;
                const isSelected = selectedOption === optIdx;

                let cardStyle = 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800 text-slate-200';
                let badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';

                if (isSelected) {
                  cardStyle = 'bg-violet-950/80 border-violet-500 text-white shadow-lg shadow-violet-600/20 ring-2 ring-violet-500';
                  badgeStyle = 'bg-violet-600 text-white border-violet-400';
                }

                // If round result is known
                if (roundResult) {
                  if (optIdx === roundResult.correctAnswer) {
                    cardStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-100 shadow-lg shadow-emerald-600/20 ring-2 ring-emerald-500';
                    badgeStyle = 'bg-emerald-600 text-white border-emerald-400';
                  } else if (isSelected && !roundResult.isCorrect) {
                    cardStyle = 'bg-rose-950/80 border-rose-500 text-rose-100 ring-2 ring-rose-500';
                    badgeStyle = 'bg-rose-600 text-white border-rose-400';
                  }
                }

                return (
                  <button
                    key={optIdx}
                    disabled={isAnswerSubmitted}
                    onClick={() => submitAnswer(optIdx)}
                    className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 relative group disabled:cursor-default ${cardStyle}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm border flex-shrink-0 transition-colors ${badgeStyle}`}>
                      {optLetter}
                    </div>

                    <div
                      className="text-sm md:text-base leading-relaxed flex-1 select-none option-content pt-0.5"
                      dangerouslySetInnerHTML={{ __html: opt.text || '' }}
                    />
                  </button>
                );
              })}
            </div>

            {/* Answer Feedback Alert Banner */}
            {isAnswerSubmitted && (
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in zoom-in-95">
                <div className="flex items-center gap-3">
                  {roundResult?.isCorrect ? (
                    <div className="w-10 h-10 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700 flex items-center justify-center font-bold">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-rose-950 text-rose-400 border border-rose-700 flex items-center justify-center font-bold">
                      <XCircle className="w-5 h-5" />
                    </div>
                  )}

                  <div>
                    <div className="font-bold text-sm text-white flex items-center gap-2">
                      {roundResult?.isCorrect ? 'Superb! Correct Answer 🎯' : 'Incorrect Choice'}
                      {roundResult?.streak >= 2 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          {roundResult.streak}x Combo Streak 🔥
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {roundResult?.isCorrect
                        ? `Scored +${roundResult.pointsAwarded} pts (Base: ${roundResult.basePoints} + Speed: ${roundResult.speedBonus})`
                        : 'No points earned for this round.'}
                    </div>
                  </div>
                </div>

                {/* Host or auto Next Question control */}
                {isHost && (
                  <button
                    onClick={handleNextQuestion}
                    className="w-full sm:w-auto px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    Next Round
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Emoji Reactions Bar */}
            <div className="pt-2 flex items-center justify-center gap-2">
              <span className="text-xs text-slate-500 hidden sm:inline mr-1">Hype:</span>
              {EMOJI_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-125 border border-slate-800 text-xl flex items-center justify-center transition-transform shadow-sm"
                  title="Send Reaction"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────── */}
        {/* STATE 3: COMPLETED / VICTORY PODIUM */}
        {/* ────────────────────────────────────────────────────────── */}
        {battle.status === 'COMPLETED' && (
          <div className="w-full max-w-3xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500 py-6">
            {/* Victory Podium Banner */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl border border-amber-500/30 p-8 text-center shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-400" />

              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-extrabold uppercase tracking-widest mb-4">
                <Trophy className="w-4 h-4" />
                Battle Concluded
              </div>

              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                Victory Celebration! 👑
              </h2>
              <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
                The dust has settled in the arena. Here are the champion rankings and scores:
              </p>

              {/* Podium Visuals */}
              <div className="mt-8 flex items-end justify-center gap-3 md:gap-6 pt-6 pb-2">
                {/* 2nd Place */}
                {battle.leaderboard?.[1] && (
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-slate-700 border-2 border-slate-400 flex items-center justify-center font-bold text-white text-lg shadow-lg mb-2">
                      {battle.leaderboard[1].name?.charAt(0)}
                    </div>
                    <div className="text-xs font-bold text-slate-300 max-w-[90px] truncate">
                      {battle.leaderboard[1].name}
                    </div>
                    <div className="text-xs font-extrabold text-slate-400">
                      {battle.leaderboard[1].score} pts
                    </div>
                    <div className="w-20 md:w-24 h-24 bg-gradient-to-t from-slate-800 to-slate-700 rounded-t-xl mt-2 flex flex-col items-center justify-center text-slate-300 font-black text-xl shadow-inner">
                      <span>2</span>
                      <span className="text-[10px] text-slate-400 font-normal">Silver</span>
                    </div>
                  </div>
                )}

                {/* 1st Place (Champion) */}
                {battle.leaderboard?.[0] && (
                  <div className="flex flex-col items-center -mt-6">
                    <div className="text-2xl animate-bounce mb-1">👑</div>
                    <div className="w-18 h-18 md:w-20 md:h-20 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 border-4 border-amber-300 flex items-center justify-center font-black text-slate-950 text-2xl shadow-2xl mb-2">
                      {battle.leaderboard[0].name?.charAt(0)}
                    </div>
                    <div className="text-sm font-black text-white max-w-[110px] truncate">
                      {battle.leaderboard[0].name}
                    </div>
                    <div className="text-xs font-extrabold text-amber-400">
                      {battle.leaderboard[0].score} pts
                    </div>
                    <div className="w-24 md:w-28 h-36 bg-gradient-to-t from-amber-600/80 to-amber-500 rounded-t-2xl mt-2 flex flex-col items-center justify-center text-slate-950 font-black text-2xl shadow-xl">
                      <span>1</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider">Champion</span>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {battle.leaderboard?.[2] && (
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-amber-900 border-2 border-amber-700 flex items-center justify-center font-bold text-amber-200 text-lg shadow-lg mb-2">
                      {battle.leaderboard[2].name?.charAt(0)}
                    </div>
                    <div className="text-xs font-bold text-slate-300 max-w-[90px] truncate">
                      {battle.leaderboard[2].name}
                    </div>
                    <div className="text-xs font-extrabold text-amber-600">
                      {battle.leaderboard[2].score} pts
                    </div>
                    <div className="w-20 md:w-24 h-16 bg-gradient-to-t from-amber-950 to-amber-900 rounded-t-xl mt-2 flex flex-col items-center justify-center text-amber-300 font-black text-xl shadow-inner">
                      <span>3</span>
                      <span className="text-[10px] text-amber-500 font-normal">Bronze</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Complete Scoreboard Table */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Final Match Scoreboard
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/40 text-slate-400 text-xs uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Gladiator</th>
                      <th className="py-3 px-4">Score</th>
                      <th className="py-3 px-4">Correct Answers</th>
                      <th className="py-3 px-4">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {(battle.leaderboard || []).map((lb: any) => {
                      const isMe = lb.studentId === myId;
                      const accuracy = lb.totalQuestions > 0 ? Math.round((lb.correctAnswers / lb.totalQuestions) * 100) : 0;

                      return (
                        <tr
                          key={lb.studentId}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            isMe ? 'bg-violet-950/30' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-bold text-sm">
                            {lb.rank === 1 ? '🥇 1st' : lb.rank === 2 ? '🥈 2nd' : lb.rank === 3 ? '🥉 3rd' : `#${lb.rank}`}
                          </td>
                          <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                            {lb.name}
                            {isMe && <span className="text-xs text-violet-400">(You)</span>}
                          </td>
                          <td className="py-3 px-4 font-black text-amber-400 text-base">
                            {lb.score} pts
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-300">
                            {lb.correctAnswers} / {lb.totalQuestions}
                          </td>
                          <td className="py-3 px-4 text-xs font-semibold text-emerald-400">
                            {accuracy}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Collapsible Solution Review Section */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
              <button
                onClick={() => setShowReview(!showReview)}
                className="w-full flex items-center justify-between font-bold text-base text-white hover:text-violet-400 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  Review Questions & Solutions ({battle.questions?.length || 0})
                </div>
                {showReview ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>

              {showReview && (
                <div className="space-y-6 pt-4 border-t border-slate-800">
                  {(battle.questions || []).map((q: any, qIdx: number) => {
                    const myAns = myParticipant?.answers?.find((a: any) => a.questionIndex === qIdx);

                    return (
                      <div
                        key={qIdx}
                        className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-violet-400 uppercase">Question {qIdx + 1}</span>
                          {myAns ? (
                            myAns.isCorrect ? (
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> You answered correctly (+{myAns.pointsAwarded} pts)
                              </span>
                            ) : (
                              <span className="text-rose-400 font-bold flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" /> You answered incorrectly
                              </span>
                            )
                          ) : (
                            <span className="text-slate-500">Unanswered</span>
                          )}
                        </div>

                        {/* Question Text */}
                        <div
                          className="text-sm font-medium text-slate-100 question-content"
                          dangerouslySetInnerHTML={{ __html: q.questionText || '' }}
                        />

                        {/* Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {(q.options || []).map((opt: any, oIdx: number) => {
                            const isCorrectOpt = oIdx === q.correctOption;
                            const isMyChoice = myAns?.selectedOption === oIdx;

                            return (
                              <div
                                key={oIdx}
                                className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                                  isCorrectOpt
                                    ? 'bg-emerald-950/60 border-emerald-600 text-emerald-200 font-semibold'
                                    : isMyChoice && !isCorrectOpt
                                    ? 'bg-rose-950/60 border-rose-600 text-rose-200'
                                    : 'bg-slate-900 border-slate-800 text-slate-400'
                                }`}
                              >
                                <span className="font-bold uppercase">
                                  {['A', 'B', 'C', 'D'][oIdx]}:
                                </span>
                                <span dangerouslySetInnerHTML={{ __html: opt.text || '' }} />
                                {isCorrectOpt && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 ml-auto flex-shrink-0" />}
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation */}
                        {q.explanation && (
                          <div className="mt-2 p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
                            <strong className="text-amber-400 block mb-1">💡 Solution / Explanation:</strong>
                            <div
                              className="solution-content leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: q.explanation }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <button
                onClick={() => router.push('/student/battle')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm shadow-lg shadow-violet-600/30 transition-all flex items-center justify-center gap-2"
              >
                <Swords className="w-4 h-4" />
                Return to Battle Arena Hub
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Subtle Bottom Credit */}
      <footer className="py-3 text-center text-[11px] text-slate-600 border-t border-slate-900">
        ARKE Scholars Real-Time Multiplayer Quiz Arena
      </footer>
    </div>
  );
}
