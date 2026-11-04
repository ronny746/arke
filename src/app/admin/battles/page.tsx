"use client";

import React, { useState, useEffect } from 'react';
import { 
  Swords, Trophy, Users, Zap, Plus, ArrowRight, RotateCcw, 
  Trash2, Copy, Check, Eye, Clock, Shield, Search, BookOpen, 
  Award, X, AlertTriangle, ExternalLink
} from 'lucide-react';
import { adminApi } from '@/api/admin';
import toast from 'react-hot-toast';

export default function AdminBattlesPage() {
  const [activeTab, setActiveTab] = useState<'live' | 'archive' | 'leaderboard'>('live');
  const [battles, setBattles] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>({ subjects: [], grades: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedBattleModal, setSelectedBattleModal] = useState<any | null>(null);

  // Create form state
  const [createForm, setCreateForm] = useState({
    title: '',
    mode: 'GROUP' as '1v1' | 'GROUP',
    subject: '',
    questionCount: 10,
    timePerQuestion: 20,
    difficulty: 'ALL',
    maxParticipants: 10
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [battlesRes, filterRes] = await Promise.allSettled([
        adminApi.getAdminBattles(),
        adminApi.getBattleFilters()
      ]);

      if (battlesRes.status === 'fulfilled' && battlesRes.value?.data?.success) {
        setBattles(battlesRes.value.data.data?.battles || []);
        setLeaderboard(battlesRes.value.data.data?.leaderboard || []);
      }

      if (filterRes.status === 'fulfilled' && filterRes.value?.data?.success) {
        const fData = filterRes.value.data.data;
        setFilters(fData);
        if (fData.subjects?.length > 0) {
          setCreateForm(prev => ({ ...prev, subject: fData.subjects[0] }));
        }
      }
    } catch (err) {
      console.error('Failed to load admin battle data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBattle = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = {
        title: createForm.title.trim() || `Official Institute ${createForm.subject || 'Multi-Subject'} Tournament`,
        mode: createForm.mode,
        subject: createForm.subject || undefined,
        questionCount: Number(createForm.questionCount),
        timePerQuestion: Number(createForm.timePerQuestion),
        maxParticipants: createForm.mode === '1v1' ? 2 : Number(createForm.maxParticipants),
        difficulty: createForm.difficulty
      };

      const res = await adminApi.createOfficialBattle(payload);
      if (res.data?.success) {
        toast.success(`Official tournament created! Room Code: ${res.data.data.roomCode}`);
        setShowCreateModal(false);
        loadData();
      } else {
        toast.error(res.data?.message || 'Failed to create battle');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not create official battle');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBattle = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete battle room ${code}? This cannot be undone.`)) return;

    try {
      const res = await adminApi.deleteBattle(id);
      if (res.data?.success) {
        toast.success(`Battle ${code} removed`);
        setBattles(prev => prev.filter(b => b._id !== id));
      } else {
        toast.error(res.data?.message || 'Failed to delete battle');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not delete battle');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Room code ${code} copied!`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // KPIs
  const totalBattles = battles.length;
  const activeBattles = battles.filter(b => b.status === 'WAITING' || b.status === 'IN_PROGRESS');
  const completedBattles = battles.filter(b => b.status === 'COMPLETED');
  const totalParticipants = battles.reduce((acc, curr) => acc + (curr.participants?.length || 0), 0);

  // Filtered battles for current tab
  const displayedBattles = battles.filter((b) => {
    if (activeTab === 'live') {
      if (b.status !== 'WAITING' && b.status !== 'IN_PROGRESS') return false;
    } else if (activeTab === 'archive') {
      if (b.status !== 'COMPLETED' && b.status !== 'CANCELLED') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = b.title?.toLowerCase().includes(q);
      const matchCode = b.roomCode?.toLowerCase().includes(q);
      const matchSubject = b.subject?.toLowerCase().includes(q);
      if (!matchTitle && !matchCode && !matchSubject) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 text-white shadow-xl border border-violet-800/40">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-violet-500/20 text-violet-200 border border-violet-400/30 text-xs font-semibold uppercase tracking-wider mb-2">
            <Swords className="w-3.5 h-3.5 text-amber-400" />
            Competitive Arena Control
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
            Quiz Battles & Tournaments ⚔️
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Monitor live student duels, review battle scoreboards, track top institute champions, and host official tournaments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-sm shadow-lg shadow-orange-500/25 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Host Official Tournament
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
            <Swords className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Total Battles</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">{totalBattles}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Live Active Rooms</div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {activeBattles.length}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Completed Clashes</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">{completedBattles.length}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Student Engagements</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">{totalParticipants}</div>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('live')}
            className={`px-4 py-2 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'live'
                ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            Live Arenas ({activeBattles.length})
          </button>

          <button
            onClick={() => setActiveTab('archive')}
            className={`px-4 py-2 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'archive'
                ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            Archive & Results ({completedBattles.length})
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'leaderboard'
                ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            Champions Leaderboard
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab !== 'leaderboard' && (
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search title, code, subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          )}

          <button
            onClick={loadData}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Refresh"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab !== 'leaderboard' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          {displayedBattles.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Swords className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {activeTab === 'live' ? 'No live battles in session' : 'No battle archives found'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {activeTab === 'live'
                  ? 'Students can launch duels anytime from their portal, or you can host an official tournament.'
                  : 'Completed battle records and scoreboards will be preserved here.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 text-xs uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Room Code</th>
                    <th className="py-3 px-4">Title & Details</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Participants</th>
                    <th className="py-3 px-4">Winner / Leader</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {displayedBattles.map((battle) => {
                    const isWaiting = battle.status === 'WAITING';
                    const isInProgress = battle.status === 'IN_PROGRESS';
                    const isCompleted = battle.status === 'COMPLETED';

                    return (
                      <tr key={battle._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleCopyCode(battle.roomCode)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono font-bold text-xs border border-slate-200 dark:border-slate-700 hover:border-violet-500 transition-colors"
                            title="Click to copy code"
                          >
                            {copiedCode === battle.roomCode ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            {battle.roomCode}
                          </button>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {battle.title}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="font-medium text-violet-600 dark:text-violet-400">
                              {battle.mode === '1v1' ? '1v1 Duel' : 'Battle Royale'}
                            </span>
                            •
                            <span>{battle.subject || 'All Subjects'}</span>
                            •
                            <span>{battle.questionCount} Questions</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isWaiting
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700'
                              : isInProgress
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 animate-pulse'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}>
                            {battle.status}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {battle.participants?.length || 0} / {battle.maxParticipants}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Host: {battle.hostId?.name || 'Student'}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {battle.winner ? (
                            <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <Trophy className="w-3.5 h-3.5 text-amber-500" />
                              {battle.winner.name} ({battle.winner.score} pts)
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-xs text-slate-500">
                          {new Date(battle.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedBattleModal(battle)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteBattle(battle._id, battle.roomCode)}
                              className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 text-rose-600 dark:hover:bg-rose-950/40 transition-colors"
                              title="Delete Room"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Leaderboard Tab */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Institute Gladiator Hall of Fame
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Top students across all batches ranked by victories and total arena points.
              </p>
            </div>
          </div>

          {leaderboard.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No students have participated in quiz battles yet.
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((champ: any, idx: number) => {
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
                          {idx === 0 && <span className="text-xs">👑 Champion</span>}
                        </div>
                        <div className="text-xs text-slate-500">
                          {champ.battlesWon} Victories • {champ.totalBattles} Total Battles Fought
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

      {/* Modal: Create Official Tournament */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-gradient-to-r from-violet-900 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-600/60 flex items-center justify-center">
                  <Swords className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="font-bold text-base">Host Official Tournament</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBattle} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1.5">
                  Tournament Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Physics Grand Prix Challenge"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1.5">
                  Subject Focus
                </label>
                <select
                  value={createForm.subject}
                  onChange={(e) => setCreateForm({ ...createForm, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">All Subjects (Grand Mixed)</option>
                  {filters.subjects?.map((sub: string) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1.5">
                    Questions Count
                  </label>
                  <select
                    value={createForm.questionCount}
                    onChange={(e) => setCreateForm({ ...createForm, questionCount: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                    <option value={15}>15 Questions</option>
                    <option value={20}>20 Questions</option>
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
                    <option value={15}>15 Seconds</option>
                    <option value={20}>20 Seconds</option>
                    <option value={30}>30 Seconds</option>
                    <option value={45}>45 Seconds</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1.5">
                  Max Participants
                </label>
                <input
                  type="number"
                  min={2}
                  max={50}
                  value={createForm.maxParticipants}
                  onChange={(e) => setCreateForm({ ...createForm, maxParticipants: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

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
                  {creating ? 'Creating...' : 'Create Tournament Room'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Battle Details & Scoreboard */}
      {selectedBattleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="font-mono px-2 py-0.5 rounded bg-violet-950 text-violet-300 font-bold text-xs border border-violet-800">
                  {selectedBattleModal.roomCode}
                </span>
                <h3 className="font-bold text-base">{selectedBattleModal.title}</h3>
              </div>
              <button
                onClick={() => setSelectedBattleModal(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500">Status</div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white mt-0.5">{selectedBattleModal.status}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500">Mode</div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white mt-0.5">{selectedBattleModal.mode}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500">Subject</div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white mt-0.5">{selectedBattleModal.subject || 'All'}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500">Questions</div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white mt-0.5">{selectedBattleModal.questionCount} Qs</div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Participants & Scoreboard ({selectedBattleModal.participants?.length || 0})
                </h4>
                <div className="space-y-2">
                  {(selectedBattleModal.participants || []).map((p: any, idx: number) => {
                    const isWinner = selectedBattleModal.winner?.studentId === p.studentId;
                    return (
                      <div
                        key={p.studentId || idx}
                        className={`p-3 rounded-xl border flex items-center justify-between text-sm ${
                          isWinner
                            ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-xs text-slate-400">#{idx + 1}</span>
                          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {p.name}
                            {isWinner && <span className="text-xs">👑 Winner</span>}
                          </span>
                        </div>
                        <div className="font-bold text-violet-600 dark:text-violet-400">
                          {p.score || 0} pts
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
