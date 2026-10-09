"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  UserCheck, 
  Award, 
  Layers, 
  Search, 
  CheckCircle,
  FileText
} from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { studentAPI } from '@/api/index.js';
import toast from 'react-hot-toast';

export default function StudentDPPPage() {
  const router = useRouter();
  
  const [allDpps, setAllDpps] = useState<any[]>([]);
  const [topicFlags, setTopicFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ASSIGNED' | 'HISTORY'>('ASSIGNED');

  // History search/filter
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilterSubject, setHistoryFilterSubject] = useState('ALL');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [historyRes, flagsRes] = await Promise.all([
        studentAPI.getPracticeHistory({ sessionType: 'DPP' }).catch(() => ({ data: { data: [] } })),
        studentAPI.getTopicFlags().catch(() => ({ data: { data: [] } }))
      ]);
      const historyList = historyRes.data?.data || [];
      setAllDpps(historyList);
      setTopicFlags(flagsRes.data?.data || []);
    } catch (error) {
      toast.error('Failed to load DPP assignments');
    } finally {
      setLoading(false);
    }
  };

  const isTeacherDpp = (dpp: any) => {
    return Boolean(
      dpp.isTeacherAssigned || 
      dpp.assignedBy || 
      dpp.title?.toLowerCase().includes('remedial') ||
      dpp.title?.startsWith('DPP -') ||
      (dpp.filters?.topics && dpp.filters.topics.length > 0)
    );
  };

  const teacherAssignedDpps = useMemo(() => {
    return allDpps.filter(isTeacherDpp);
  }, [allDpps]);

  const pendingTeacherDpps = useMemo(() => {
    return teacherAssignedDpps.filter(d => d.status !== 'COMPLETED');
  }, [teacherAssignedDpps]);

  const completedTeacherDpps = useMemo(() => {
    return teacherAssignedDpps.filter(d => d.status === 'COMPLETED');
  }, [teacherAssignedDpps]);

  const completedDpps = useMemo(() => {
    return allDpps.filter(d => d.status === 'COMPLETED');
  }, [allDpps]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalTaken = completedDpps.length;
    let totalScore = 0;
    let totalPossible = 0;
    let totalQuestionsSolved = 0;

    completedDpps.forEach(d => {
      totalScore += (d.score || 0);
      totalPossible += (d.totalMarks || (d.totalQuestions * 4) || 0);
      totalQuestionsSolved += (d.totalQuestions || 0);
    });

    const accuracy = totalPossible > 0 ? ((totalScore / totalPossible) * 100).toFixed(1) : '0.0';

    return {
      assignedTotal: teacherAssignedDpps.length,
      assignedPending: pendingTeacherDpps.length,
      totalCompleted: totalTaken,
      accuracy,
      totalQuestionsSolved
    };
  }, [allDpps, teacherAssignedDpps, pendingTeacherDpps, completedDpps]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    return allDpps.filter(d => {
      if (historyFilterSubject !== 'ALL' && d.filters?.subject !== historyFilterSubject) return false;
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const titleMatch = (d.title || '').toLowerCase().includes(q);
        const subjMatch = (d.filters?.subject || '').toLowerCase().includes(q);
        const topicMatch = (d.filters?.topic || '').toLowerCase().includes(q);
        const topicsMatch = (d.filters?.topics || []).some((t: string) => t.toLowerCase().includes(q));
        if (!titleMatch && !subjMatch && !topicMatch && !topicsMatch) return false;
      }
      return true;
    });
  }, [allDpps, historyFilterSubject, historySearch]);

  const uniqueSubjectsInHistory = useMemo(() => {
    const set = new Set<string>();
    allDpps.forEach(d => {
      if (d.filters?.subject) set.add(d.filters.subject);
    });
    return Array.from(set);
  }, [allDpps]);

  const flagForDpp = (dpp: any) => topicFlags.find(flag => String(flag.remedialSessionId?._id || flag.remedialSessionId || '') === String(dpp._id));
  const flagStyle = (flag?: any) => {
    if (flag?.flag === 'RED') return { border: 'border-rose-300', tint: 'from-rose-50/70 to-white', badge: 'bg-rose-600', label: 'Needs attention' };
    if (flag?.flag === 'YELLOW') return { border: 'border-amber-300', tint: 'from-amber-50/70 to-white', badge: 'bg-amber-500', label: 'Improving' };
    return { border: 'border-emerald-300', tint: 'from-emerald-50/70 to-white', badge: 'bg-emerald-600', label: flag?.flag === 'GREEN' ? 'On track' : 'Teacher assigned' };
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12 animate-fade-in">
      <PageHeader
        title="Daily Practice Problems (DPP)"
        subtitle="Attempt and review remedial practice problems created and assigned by your teachers."
        breadcrumbs={['Home', 'Daily Practice (DPP)']}
      />

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          onClick={() => setActiveTab('ASSIGNED')} 
          className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-sm flex items-center gap-4 ${
            activeTab === 'ASSIGNED' ? 'bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-100' : 'bg-white border-gray-100 hover:border-emerald-200'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#1a7a35] flex items-center justify-center shrink-0">
            <Sparkles size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-black text-gray-900">{stats.assignedTotal}</p>
              {stats.assignedPending > 0 && (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                  {stats.assignedPending} Due
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-gray-500">Assigned by Teachers</p>
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('HISTORY')} 
          className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-sm flex items-center gap-4 ${
            activeTab === 'HISTORY' ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-100' : 'bg-white border-gray-100 hover:border-blue-200'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900">{stats.totalCompleted}</p>
            <p className="text-xs font-semibold text-gray-500">Completed DPPs</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Award size={24} />
          </div>
          <div>
            <p className="text-2xl font-black text-purple-600">{stats.accuracy}%</p>
            <p className="text-xs font-semibold text-gray-500">Overall Accuracy</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900">{stats.totalQuestionsSolved}</p>
            <p className="text-xs font-semibold text-gray-500">Questions Solved</p>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex border-b border-gray-200 bg-white rounded-2xl p-1.5 shadow-sm gap-1 max-w-lg">
        <button
          onClick={() => setActiveTab('ASSIGNED')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'ASSIGNED'
              ? 'bg-[#1a7a35] text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <UserCheck size={17} />
          <span>Assigned by Teachers</span>
          {stats.assignedPending > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${activeTab === 'ASSIGNED' ? 'bg-white text-[#1a7a35]' : 'bg-rose-500 text-white'}`}>
              {stats.assignedPending} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'HISTORY'
              ? 'bg-[#1a7a35] text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Clock size={17} />
          <span>DPP Results & History ({allDpps.length})</span>
        </button>
      </div>

      {/* TAB CONTENT */}
      {loading ? (
        <div className="bg-white rounded-3xl p-16 border border-gray-100 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#1a7a35] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-gray-500">Loading your DPP assignments...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          
          {/* TAB 1: TEACHER ASSIGNED DPPS */}
          {activeTab === 'ASSIGNED' && (
            <motion.div
              key="assigned-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {teacherAssignedDpps.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 border border-gray-100 text-center space-y-4 shadow-sm">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#1a7a35] flex items-center justify-center mx-auto">
                    <CheckCircle size={32} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">No Teacher Assignments Pending</h3>
                    <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                      You are all caught up! Remedial and targeted practice DPPs assigned by your teachers based on your exam evaluations will appear here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* Pending / In-Progress Assignments Section */}
                  {pendingTeacherDpps.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                          <span>Action Required: Pending Teacher DPPs ({pendingTeacherDpps.length})</span>
                        </h3>
                        <span className="text-xs text-rose-600 font-bold bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                          Assigned for Remedial Practice
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendingTeacherDpps.map((dpp) => {
                          const performanceFlag = flagForDpp(dpp);
                          const performanceStyle = flagStyle(performanceFlag);
                          const topicsList = dpp.filters?.topics && dpp.filters.topics.length > 0
                            ? dpp.filters.topics
                            : (dpp.filters?.topic ? [dpp.filters.topic] : []);

                          const isStarted = dpp.answers && dpp.answers.length > 0;
                          const teacherName = dpp.assignedBy?.firstName 
                            ? `${dpp.assignedBy.firstName} ${dpp.assignedBy.lastName || ''}`
                            : 'Faculty / Academic Teacher';

                          return (
                            <div 
                              key={dpp._id}
                              className={`bg-gradient-to-br ${performanceStyle.tint} rounded-3xl p-6 border-2 ${performanceStyle.border} shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between`}
                            >
                              <div className="space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${performanceStyle.badge} text-white flex items-center gap-1 shadow-xs`}>
                                    <Sparkles size={11} /> {performanceStyle.label}
                                  </span>
                                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                                    {isStarted ? 'In Progress' : 'Pending Attempt'}
                                  </span>
                                </div>

                                <div>
                                  <h4 className="text-base font-bold text-gray-900 leading-snug">{dpp.title}</h4>
                                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                    <span>Assigned by:</span>
                                    <strong className="text-gray-700">{teacherName}</strong>
                                  </p>
                                </div>

                                {/* Subject & Topics pills */}
                                <div className="space-y-1.5 pt-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                                      {dpp.filters?.subject || 'General'}
                                    </span>
                                    {topicsList.map((t: string, idx: number) => (
                                      <span key={idx} className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-[#1a7a35] border border-emerald-200">
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                {/* Info grid */}
                                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-white border border-gray-100 text-xs">
                                  <div className="text-center">
                                    <p className="text-gray-400 font-medium text-[10px]">Questions</p>
                                    <p className="font-bold text-gray-800">{dpp.totalQuestions}</p>
                                  </div>
                                  <div className="text-center border-x border-gray-100">
                                    <p className="text-gray-400 font-medium text-[10px]">Total Marks</p>
                                    <p className="font-bold text-gray-800">+{dpp.totalMarks || dpp.totalQuestions * 4}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-gray-400 font-medium text-[10px]">Level</p>
                                    <p className="font-bold text-emerald-700">{dpp.filters?.difficulty || 'Medium'}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="pt-2 flex items-center justify-between gap-3 border-t border-gray-100">
                                <span className="text-[11px] text-gray-400">
                                  Assigned on {new Date(dpp.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                                <button
                                  onClick={() => router.push(`/student/dpp/${dpp._id}/play`)}
                                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-[#1a7a35] hover:bg-[#146029] text-white shadow-md flex items-center gap-1.5 transition-all"
                                >
                                  <Play size={13} className="fill-current" />
                                  <span>{isStarted ? 'Resume DPP' : 'Start DPP'}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Completed Teacher Assignments Section */}
                  {completedTeacherDpps.length > 0 && (
                    <div className="space-y-3 pt-4">
                      <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-600" />
                        <span>Completed Teacher Remedial DPPs ({completedTeacherDpps.length})</span>
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {completedTeacherDpps.map((dpp) => {
                          const topicsList = dpp.filters?.topics && dpp.filters.topics.length > 0
                            ? dpp.filters.topics
                            : (dpp.filters?.topic ? [dpp.filters.topic] : []);

                          const pct = dpp.totalMarks > 0 ? ((dpp.score / dpp.totalMarks) * 100).toFixed(0) : '0';

                          return (
                            <div 
                              key={dpp._id}
                              className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all space-y-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                                  {dpp.filters?.subject || 'General'}
                                </span>
                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                  Score: {dpp.score} / {dpp.totalMarks} ({pct}%)
                                </span>
                              </div>

                              <div>
                                <h4 className="text-sm font-bold text-gray-900">{dpp.title}</h4>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {topicsList.map((t: string, idx: number) => (
                                    <span key={idx} className="text-[11px] font-medium text-gray-500">
                                      • {t}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                                <span className="text-gray-400 text-[11px]">
                                  Completed on {new Date(dpp.completedAt || dpp.createdAt).toLocaleDateString()}
                                </span>
                                <button
                                  onClick={() => router.push(`/student/dpp/${dpp._id}/play`)}
                                  className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors"
                                >
                                  Review Solutions
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: ALL DPP HISTORY & RESULTS */}
          {activeTab === 'HISTORY' && (
            <motion.div
              key="history-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Search & Filter Toolbar */}
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="relative w-full sm:w-72">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by title, subject, topic..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs focus:ring-2 focus:ring-[#1a7a35]"
                  />
                </div>

                {uniqueSubjectsInHistory.length > 0 && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-gray-500 font-medium">Subject:</span>
                    <select
                      value={historyFilterSubject}
                      onChange={(e) => setHistoryFilterSubject(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 focus:outline-none"
                    >
                      <option value="ALL">All Subjects</option>
                      {uniqueSubjectsInHistory.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {filteredHistory.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 border border-gray-100 text-center space-y-3">
                  <p className="text-sm font-bold text-gray-700">No DPP sessions found.</p>
                  <p className="text-xs text-gray-400">Complete assigned teacher DPPs to build your performance history.</p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                          <th className="py-3.5 px-5">DPP Title & Type</th>
                          <th className="py-3.5 px-4">Subject & Topics</th>
                          <th className="py-3.5 px-4 text-center">Questions</th>
                          <th className="py-3.5 px-4 text-center">Score / Marks</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4">Date</th>
                          <th className="py-3.5 px-5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredHistory.map((session) => {
                          const isCompleted = session.status === 'COMPLETED';
                          const isTeacher = isTeacherDpp(session);
                          const pct = session.totalMarks > 0 ? ((session.score / session.totalMarks) * 100).toFixed(0) : '0';

                          return (
                            <tr key={session._id} className="hover:bg-gray-50/70 transition-colors">
                              
                              {/* Title */}
                              <td className="py-3.5 px-5">
                                <div>
                                  <p className="font-bold text-gray-900 text-xs sm:text-sm">{session.title}</p>
                                  {isTeacher && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded mt-0.5 border border-emerald-200">
                                      <Sparkles size={10} /> Teacher Assigned
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Subject / Topics */}
                              <td className="py-3.5 px-4">
                                <div className="space-y-0.5">
                                  <span className="text-xs font-bold text-gray-700">{session.filters?.subject || 'General'}</span>
                                  <p className="text-[11px] text-gray-400 truncate max-w-xs">
                                    {session.filters?.topics?.join(', ') || session.filters?.topic || 'General Practice'}
                                  </p>
                                </div>
                              </td>

                              {/* Questions */}
                              <td className="py-3.5 px-4 text-center font-bold text-gray-700 text-xs">
                                {session.totalQuestions}
                              </td>

                              {/* Score */}
                              <td className="py-3.5 px-4 text-center">
                                {isCompleted ? (
                                  <div>
                                    <span className="font-bold text-sm text-[#1a7a35]">{session.score}</span>
                                    <span className="text-xs text-gray-400"> / {session.totalMarks}</span>
                                    <p className="text-[10px] font-semibold text-gray-400">{pct}%</p>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400 font-medium">—</span>
                                )}
                              </td>

                              {/* Status */}
                              <td className="py-3.5 px-4">
                                {isCompleted ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 size={12} /> Completed
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    <Clock size={12} /> In Progress
                                  </span>
                                )}
                              </td>

                              {/* Date */}
                              <td className="py-3.5 px-4 text-xs text-gray-500 whitespace-nowrap">
                                {new Date(session.completedAt || session.createdAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </td>

                              {/* Action */}
                              <td className="py-3.5 px-5 text-right">
                                <button
                                  onClick={() => router.push(`/student/dpp/${session._id}/play`)}
                                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all ${
                                    isCompleted 
                                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' 
                                      : 'bg-[#1a7a35] hover:bg-[#146029] text-white shadow-xs'
                                  }`}
                                >
                                  {isCompleted ? 'Review Solutions' : 'Resume DPP'}
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
            </motion.div>
          )}

        </AnimatePresence>
      )}

    </div>
  );
}
