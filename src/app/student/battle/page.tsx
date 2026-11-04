"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Swords, Trophy, Flame, Users, Zap, Plus, ArrowRight, 
  RotateCcw, Sparkles, CheckCircle, Clock, Award, Shield, 
  Search, BookOpen, Layers, Target, ChevronRight, X
} from 'lucide-react';
import { studentApi } from '@/api/student';
import toast from 'react-hot-toast';

export default function StudentBattleArenaPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'live' | 'history' | 'leaderboard'>('live');
  const [activeBattles, setActiveBattles] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>({ subjects: [], grades: [] });
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // User info
  const [user, setUser] = useState<any>(null);

  // Form State for creating battle
  const [createForm, setCreateForm] = useState({
    title: '',
    mode: '1v1' as '1v1' | 'GROUP',
    subject: '',
    questionCount: 5,
    timePerQuestion: 20,
    difficulty: 'ALL',
    maxParticipants: 2
  });

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [battlesRes, histRes, filterRes] = await Promise.allSettled([
        studentApi.getActiveBattles(),
        studentApi.getMyBattleHistory(),
        studentApi.getBattleFilters()
      ]);

      if (battlesRes.status === 'fulfilled' && battlesRes.value?.data?.success) {
        setActiveBattles(battlesRes.value.data.data || []);
      }
      if (histRes.status === 'fulfilled' && histRes.value?.data?.success) {
        setHistory(histRes.value.data.data?.history || []);
        setLeaderboard(histRes.value.data.data?.leaderboard || []);
      }
      if (filterRes.status === 'fulfilled' && filterRes.value?.data?.success) {
        const fData = filterRes.value.data.data;
        setFilters(fData);
        if (fData.subjects?.length > 0) {
          setCreateForm(prev => ({ ...prev, subject: fData.subjects[0] }));
        }
      }
    } catch (err: any) {
      console.error('Failed to load battle data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) {
      toast.error('Please enter a valid room code');
      return;
    }
    setJoining(true);
    try {
      const res = await studentApi.joinBattle({ roomCode: cleanCode });
      if (res.data?.success) {
        toast.success('Joined battle room!');
        router.push(`/student/battle/${cleanCode}`);
      } else {
        toast.error(res.data?.message || 'Failed to join battle');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid room code or room is full/ended');
    } finally {
      setJoining(false);
    }
  };

  const handleCreateBattle = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = {
        title: createForm.title.trim() || `${createForm.subject || 'All Subjects'} ${createForm.mode === '1v1' ? 'Duel' : 'Clash'}`,
        mode: createForm.mode,
        subject: createForm.subject || undefined,
        questionCount: Number(createForm.questionCount),
        timePerQuestion: Number(createForm.timePerQuestion),
        maxParticipants: createForm.mode === '1v1' ? 2 : Number(createForm.maxParticipants),
        difficulty: createForm.difficulty
      };

      const res = await studentApi.createBattle(payload);
      if (res.data?.success) {
        toast.success(`Battle created! Room code: ${res.data.data.roomCode}`);
        setShowCreateModal(false);
        router.push(`/student/battle/${res.data.data.roomCode}`);
      } else {
        toast.error(res.data?.message || 'Failed to create battle');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not create battle');
    } finally {
      setCreating(false);
    }
  };

  // Calculate my stats from history
  const totalBattles = history.length;
  const totalWins = history.filter(b => b.winner?.studentId === user?._id || b.winner?.studentId === user?.id).length;
  const winRate = totalBattles > 0 ? Math.round((totalWins / totalBattles) * 100) : 0;
  const totalScore = history.reduce((acc, curr) => {
    const me = curr.participants?.find((p: any) => p.studentId === user?._id || p.studentId === user?.id);
    return acc + (me?.score || 0);
  }, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 p-6 md:p-8 text-white shadow-xl border border-violet-700/40">
        <div className="absolute -right-10 -bottom-10 opacity-15 pointer-events-none">
          <Swords className="w-80 h-80 text-violet-400 rotate-12" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-200 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              Live Multiplayer Arena
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              ARKE Quiz Battle ⚔️
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              Challenge your friends or institute peers in high-speed 1v1 duels and multiplayer battles. Answer fast to build combos, earn speed bonuses, and claim the championship crown!
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch md:items-center">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold shadow-lg shadow-orange-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              Create Battle Room
            </button>
          </div>
        </div>

        {/* Room Code Quick Join Strip */}
        <div className="mt-6 pt-6 border-t border-violet-800/40 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Have a Room Code from a friend or teacher? Enter it below to dive straight in:</span>
          </div>

          <form onSubmit={handleJoinByCode} className="w-full md:w-auto flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <input
                type="text"
                maxLength={8}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ENTER CODE (e.g. BTL-99)"
                className="w-full pl-4 pr-3 py-2.5 rounded-xl bg-slate-950/60 border border-violet-400/40 text-white font-mono text-center uppercase placeholder-slate-400 font-bold tracking-wider text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <button
              type="submit"
              disabled={joining || !joinCode.trim()}
              className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-md shadow-violet-600/30"
            >
              {joining ? 'Entering...' : 'Join Battle'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
            <Swords className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Battles Fought</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">{totalBattles}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Victories</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              {totalWins}
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">
                {winRate}% Win
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Total Arena Score</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">{totalScore.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Gladiator Rank</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {totalWins >= 10 ? '👑 Master' : totalWins >= 3 ? '⚔️ Warrior' : '🎯 Challenger'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('live')}
            className={`px-4 py-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'live'
                ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            Live Arenas ({activeBattles.length})
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            My Battle History
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'leaderboard'
                ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            Institute Leaderboard
          </button>
        </div>

        <button
          onClick={loadInitialData}
          className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tab 1: Live Arenas */}
      {activeTab === 'live' && (
        <div className="space-y-4">
          {activeBattles.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto mb-4">
                <Swords className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">No active battles open right now</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
                Be the gladiator to kick off the duel! Create a new room and invite your friends with a 6-character room code.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm shadow-md"
              >
                <Plus className="w-4 h-4" />
                Create Room Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeBattles.map((battle) => {
                const isMember = battle.participants?.some(
                  (p: any) => p.studentId === user?._id || p.studentId === user?.id
                );
                const isFull = battle.participants?.length >= battle.maxParticipants;
                const isWaiting = battle.status === 'WAITING';

                return (
                  <div
                    key={battle._id}
                    className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            battle.mode === '1v1'
                              ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                              : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700'
                          }`}>
                            {battle.mode === '1v1' ? '⚔️ 1v1 DUEL' : '🛡️ BATTLE ROYALE'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            isWaiting 
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
                              : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                          }`}>
                            {isWaiting ? '● Open Lobby' : '● Live In Arena'}
                          </span>
                        </div>

                        <div className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-mono font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {battle.roomCode}
                        </div>
                      </div>

                      <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-1">
                        {battle.title}
                      </h3>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                        {battle.subject && (
                          <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            <BookOpen className="w-3 h-3 text-violet-500" />
                            {battle.subject}
                          </span>
                        )}
                        <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          <Target className="w-3 h-3 text-amber-500" />
                          {battle.questionCount} Questions
                        </span>
                        <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          <Clock className="w-3 h-3 text-blue-500" />
                          {battle.timePerQuestion}s / Q
                        </span>
                      </div>

                      {/* Participant Previews */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            Gladiators: <strong className="text-slate-800 dark:text-slate-200">{battle.participants?.length || 0}</strong> / {battle.maxParticipants}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Host: {battle.hostId?.name || 'Gladiator'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5">
                      <button
                        onClick={() => router.push(`/student/battle/${battle.roomCode}`)}
                        className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm ${
                          isMember
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : isFull && !isMember
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/20'
                        }`}
                        disabled={isFull && !isMember}
                      >
                        {isMember ? 'Re-enter Room ⚔️' : isFull ? 'Room Full' : 'Enter Arena'}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: My Battle History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <Trophy className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No battles played yet</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 mb-4">
                Your past battles, results, scores, and accuracy breakdowns will appear here.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Battle</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Winner</th>
                      <th className="py-3 px-4">My Score</th>
                      <th className="py-3 px-4">My Accuracy</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {history.map((item) => {
                      const me = item.participants?.find((p: any) => p.studentId === user?._id || p.studentId === user?.id);
                      const isWinner = item.winner?.studentId === user?._id || item.winner?.studentId === user?.id;
                      const myTotalAns = me?.answers?.length || 0;
                      const myCorrect = me?.answers?.filter((a: any) => a.isCorrect)?.length || 0;
                      const accuracy = myTotalAns > 0 ? Math.round((myCorrect / myTotalAns) * 100) : 0;

                      return (
                        <tr key={item._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                              {item.title}
                              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {item.roomCode}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {item.mode === '1v1' ? '1v1 Duel' : 'Battle Royale'} • {item.subject || 'All Subjects'} • {item.questionCount} Qs
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500">
                            {new Date(item.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="py-3 px-4">
                            {item.winner ? (
                              <div className="flex items-center gap-1.5">
                                {isWinner ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold">
                                    <CrownIcon className="w-3.5 h-3.5 text-amber-500" /> You Won!
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                    🏆 {item.winner?.name}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">Undecided / Tie</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-violet-600 dark:text-violet-400">
                              {me?.score || 0} pts
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-full rounded-full"
                                  style={{ width: `${accuracy}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                {accuracy}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => router.push(`/student/battle/${item.roomCode}`)}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-slate-800 transition-colors"
                            >
                              Review & Stats
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Leaderboard */}
      {activeTab === 'leaderboard' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Institute Arena Champions
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Top gladiators ranked by total victories and battle performance points.
              </p>
            </div>
          </div>

          {leaderboard.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No champions registered yet. Win your first battle to climb to the top!
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((champ: any, idx: number) => {
                const isTop3 = idx < 3;
                return (
                  <div
                    key={champ.studentId}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      idx === 0
                        ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/50 shadow-sm'
                        : idx === 1
                        ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700'
                        : idx === 2
                        ? 'bg-orange-50/40 dark:bg-orange-950/20 border-orange-300 dark:border-orange-800/40'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-sm ${
                        idx === 0 ? 'bg-amber-400 text-slate-950' :
                        idx === 1 ? 'bg-slate-300 text-slate-800' :
                        idx === 2 ? 'bg-amber-700 text-white' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {idx + 1}
                      </div>

                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {champ.name}
                          {idx === 0 && <span className="text-xs">👑</span>}
                        </div>
                        <div className="text-xs text-slate-500">
                          {champ.battlesWon} Victories • {champ.totalBattles} Total Matches
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-black text-violet-600 dark:text-violet-400 text-base">
                        {champ.totalScore?.toLocaleString() || 0} pts
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {champ.totalBattles > 0 ? Math.round((champ.battlesWon / champ.totalBattles) * 100) : 0}% Win Rate
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Battle Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-gradient-to-r from-violet-900 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-600/60 flex items-center justify-center">
                  <Swords className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="font-bold text-base">Create Quiz Battle</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBattle} className="p-6 space-y-4">
              {/* Mode Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1.5">
                  Battle Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, mode: '1v1', maxParticipants: 2 })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      createForm.mode === '1v1'
                        ? 'border-violet-600 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-sm flex items-center gap-1.5">
                      ⚔️ 1v1 Duel
                    </div>
                    <div className="text-[11px] opacity-75 mt-0.5">Head-to-head showdown with 1 peer</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, mode: 'GROUP', maxParticipants: 6 })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      createForm.mode === 'GROUP'
                        ? 'border-violet-600 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-sm flex items-center gap-1.5">
                      🛡️ Battle Royale
                    </div>
                    <div className="text-[11px] opacity-75 mt-0.5">Multiplayer group room (up to 10)</div>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1.5">
                  Battle Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Physics Mechanics Blitz"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1.5">
                  Subject Focus
                </label>
                <select
                  value={createForm.subject}
                  onChange={(e) => setCreateForm({ ...createForm, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">All Subjects (Mixed Arena)</option>
                  {filters.subjects?.map((sub: string) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              {/* Question count & Timer */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1.5">
                    Questions
                  </label>
                  <select
                    value={createForm.questionCount}
                    onChange={(e) => setCreateForm({ ...createForm, questionCount: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value={5}>5 Questions (Speed)</option>
                    <option value={10}>10 Questions (Standard)</option>
                    <option value={15}>15 Questions (Championship)</option>
                    <option value={20}>20 Questions (Marathon)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1.5">
                    Timer per Question
                  </label>
                  <select
                    value={createForm.timePerQuestion}
                    onChange={(e) => setCreateForm({ ...createForm, timePerQuestion: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value={15}>15 Seconds (Rapid)</option>
                    <option value={20}>20 Seconds (Balanced)</option>
                    <option value={30}>30 Seconds (Thoughtful)</option>
                    <option value={45}>45 Seconds (Deep)</option>
                  </select>
                </div>
              </div>

              {createForm.mode === 'GROUP' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1.5">
                    Max Competitors (Up to 10)
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={10}
                    value={createForm.maxParticipants}
                    onChange={(e) => setCreateForm({ ...createForm, maxParticipants: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
                >
                  {creating ? 'Generating Arena...' : 'Create Room & Enter'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
    </svg>
  );
}
