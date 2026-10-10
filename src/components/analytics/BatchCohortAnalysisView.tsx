"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  BookOpen, 
  Target, 
  AlertCircle, 
  BarChart3, 
  Layers, 
  Filter, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Award, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Sparkles, 
  TrendingUp, 
  ArrowUpRight,
  TrendingDown,
  X
} from 'lucide-react';
import { Card, Avatar } from '@/components/ui/index.jsx';
import axiosInstance from '@/api/axiosInstance.js';
import toast from 'react-hot-toast';
import { cn } from '@/utils/helpers.js';

interface BatchCohortAnalysisViewProps {
  batchId: string;
  portal?: 'teacher' | 'admin';
  batches?: any[];
  onSelectBatch?: (bId: string) => void;
  initialSubject?: string;
}

export default function BatchCohortAnalysisView({
  batchId,
  portal = 'teacher',
  batches = [],
  onSelectBatch,
  initialSubject = 'ALL'
}: BatchCohortAnalysisViewProps) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'students' | 'subjects' | 'exams'>('students');
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject || 'ALL');
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [filterTier, setFilterTier] = useState<string>('ALL');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  useEffect(() => {
    const fetchBatchData = async () => {
      try {
        setLoading(true);
        const params: any = {};
        if (selectedSubject !== 'ALL') params.subject = selectedSubject;
        const res = await axiosInstance.get(`/analytics-reports/batch/${batchId}/performance`, { params });
        setData(res.data?.data || null);
      } catch (err: any) {
        console.error('Failed to load batch performance', err);
        toast.error('Failed to load batch and subject analytics');
      } finally {
        setLoading(false);
      }
    };

    if (batchId) {
      fetchBatchData();
    }
  }, [batchId, selectedSubject]);

  // Derived available subjects from the data
  const availableSubjects = useMemo(() => {
    return (data?.subjects || []).map((s: any) => s.subject);
  }, [data]);

  // Filtered students list based on search and performance tier
  const filteredStudents = useMemo(() => {
    if (!data?.students) return [];
    return data.students.filter((st: any) => {
      if (searchStudent.trim()) {
        const q = searchStudent.toLowerCase();
        const name = `${st.firstName} ${st.lastName}`.toLowerCase();
        const roll = (st.rollNo || '').toLowerCase();
        const email = (st.email || '').toLowerCase();
        if (!name.includes(q) && !roll.includes(q) && !email.includes(q)) return false;
      }
      if (filterTier !== 'ALL' && st.performanceTier !== filterTier) return false;
      return true;
    });
  }, [data?.students, searchStudent, filterTier]);

  const navigateToStudent = (studentId: string, sub?: string) => {
    const targetSub = sub || (selectedSubject !== 'ALL' ? selectedSubject : '');
    const queryParams = new URLSearchParams();
    if (batchId && batchId !== 'all') queryParams.set('batch', batchId);
    if (targetSub) queryParams.set('subject', targetSub);
    const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const basePath = portal === 'admin' ? '/admin/students' : '/teacher/students';
    router.push(`${basePath}/${studentId}/performance${qs}`);
  };

  if (loading) {
    return (
      <Card className="p-12 text-center">
        <div className="w-10 h-10 border-4 border-[#1a7a35] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-gray-500 font-semibold">Generating overall batch and subject analysis...</p>
      </Card>
    );
  }

  const overall = data?.overall || {
    totalStudents: 0,
    activeStudents: 0,
    evaluatedStudentsCount: 0,
    totalExamsConducted: 0,
    batchAverageScore: 0,
    batchAverageAccuracy: 0,
    performanceTiers: { top: 0, average: 0, needsAttention: 0, notEvaluated: 0 }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. OVERALL BATCH & SUBJECT ANALYSIS SUMMARY HEADER */}
      <div className="bg-gradient-to-r from-emerald-50/90 via-teal-50/40 to-white dark:from-surface-900 dark:to-surface-800 p-5 rounded-2xl border border-emerald-200 dark:border-surface-700 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#1a7a35] text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <BarChart3 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Cohort Intelligence
                </span>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {data?.batch?.name || 'Selected Cohort'} {data?.batch?.section ? `· Sec ${data?.batch?.section}` : ''}
                </span>
                {selectedSubject !== 'ALL' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                    Subject: {selectedSubject}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                Overall Batch & Subject Academic Analysis
              </h2>
            </div>
          </div>

          {/* Controls: Batch & Subject selectors */}
          <div className="flex flex-wrap items-center gap-2.5">
            {batches.length > 0 && onSelectBatch && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-gray-500">Batch:</span>
                <select
                  value={batchId}
                  onChange={(e) => onSelectBatch(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white dark:bg-surface-800 text-xs font-bold text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1a7a35]"
                >
                  <option value="all">All Batches</option>
                  {batches.map((b: any) => (
                    <option key={b._id || b.id} value={b._id || b.id}>
                      {b.name} {b.section ? `(${b.section})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-gray-500">Subject:</span>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white dark:bg-surface-800 text-xs font-bold text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1a7a35]"
              >
                <option value="ALL">All Subjects ({availableSubjects.length})</option>
                {availableSubjects.map((sub: string) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            {selectedSubject !== 'ALL' && (
              <button
                onClick={() => setSelectedSubject('ALL')}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 transition-colors"
                title="Reset Subject Filter"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* High-Level KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-emerald-100 dark:border-surface-700">
          <div className="bg-white dark:bg-surface-800 p-3 rounded-xl border border-emerald-100 dark:border-surface-700 text-center shadow-xs">
            <p className="text-[10px] text-gray-400 font-bold uppercase">Enrolled Students</p>
            <p className="text-lg font-black text-gray-900 dark:text-white mt-0.5">{overall.totalStudents}</p>
          </div>
          <div className="bg-white dark:bg-surface-800 p-3 rounded-xl border border-emerald-100 dark:border-surface-700 text-center shadow-xs">
            <p className="text-[10px] text-gray-400 font-bold uppercase">Evaluated Students</p>
            <p className="text-lg font-black text-[#1a7a35] mt-0.5">{overall.evaluatedStudentsCount}</p>
          </div>
          <div className="bg-white dark:bg-surface-800 p-3 rounded-xl border border-emerald-100 dark:border-surface-700 text-center shadow-xs">
            <p className="text-[10px] text-gray-400 font-bold uppercase">Exams Conducted</p>
            <p className="text-lg font-black text-blue-600 mt-0.5">{overall.totalExamsConducted}</p>
          </div>
          <div className="bg-white dark:bg-surface-800 p-3 rounded-xl border border-emerald-100 dark:border-surface-700 text-center shadow-xs">
            <p className="text-[10px] text-gray-400 font-bold uppercase">Batch Avg Accuracy</p>
            <p className={cn("text-lg font-black mt-0.5", overall.batchAverageAccuracy >= 70 ? "text-emerald-600" : overall.batchAverageAccuracy >= 40 ? "text-amber-600" : "text-rose-600")}>
              {overall.batchAverageAccuracy}%
            </p>
          </div>
          <div className="bg-white dark:bg-surface-800 p-3 rounded-xl border border-emerald-100 dark:border-surface-700 text-center shadow-xs">
            <p className="text-[10px] text-gray-400 font-bold uppercase">Batch Avg Score</p>
            <p className="text-lg font-black text-gray-900 dark:text-white mt-0.5">{overall.batchAverageScore}</p>
          </div>
          <div className="bg-white dark:bg-surface-800 p-3 rounded-xl border border-emerald-100 dark:border-surface-700 text-center shadow-xs">
            <p className="text-[10px] text-gray-400 font-bold uppercase">Needs Attention</p>
            <p className="text-lg font-black text-[#881337] mt-0.5">{overall.performanceTiers?.needsAttention || 0} st.</p>
          </div>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-surface-200 dark:border-surface-700 pb-2">
        <button
          onClick={() => setActiveTab('students')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
            activeTab === 'students'
              ? "bg-[#1a7a35] text-white shadow-xs"
              : "bg-surface-100 dark:bg-surface-800 text-surface-600 hover:bg-surface-200"
          )}
        >
          <Users size={15} /> Student Exam Analysis ({filteredStudents.length})
        </button>
        <button
          onClick={() => setActiveTab('subjects')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
            activeTab === 'subjects'
              ? "bg-[#1a7a35] text-white shadow-xs"
              : "bg-surface-100 dark:bg-surface-800 text-surface-600 hover:bg-surface-200"
          )}
        >
          <BookOpen size={15} /> Subject-Wise Multi-Performance
        </button>
        <button
          onClick={() => setActiveTab('exams')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
            activeTab === 'exams'
              ? "bg-[#1a7a35] text-white shadow-xs"
              : "bg-surface-100 dark:bg-surface-800 text-surface-600 hover:bg-surface-200"
          )}
        >
          <FileText size={15} /> Batch Exams Roster ({data?.examsList?.length || 0})
        </button>
      </div>

      {/* TAB 1: STUDENT ANALYSIS BASED ON EXAMS LIST */}
      {activeTab === 'students' && (
        <div className="space-y-4 animate-fade-in">
          {/* Search & Tier Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-50 dark:bg-surface-900/60 p-3.5 rounded-2xl border border-surface-200 dark:border-surface-800">
            <div className="relative min-w-[240px] max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                placeholder="Search student by name, roll no, email..."
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-[#1a7a35]"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-gray-500">Performance Status:</span>
              <button
                onClick={() => setFilterTier('ALL')}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold text-[11px]",
                  filterTier === 'ALL' ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                All ({data?.students?.length || 0})
              </button>
              <button
                onClick={() => setFilterTier('TOP_PERFORMER')}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold text-[11px]",
                  filterTier === 'TOP_PERFORMER' ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                )}
              >
                Top ({overall.performanceTiers?.top || 0})
              </button>
              <button
                onClick={() => setFilterTier('AVERAGE')}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold text-[11px]",
                  filterTier === 'AVERAGE' ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                )}
              >
                Average ({overall.performanceTiers?.average || 0})
              </button>
              <button
                onClick={() => setFilterTier('NEEDS_ATTENTION')}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold text-[11px]",
                  filterTier === 'NEEDS_ATTENTION' ? "bg-[#881337] text-white" : "bg-rose-50 text-rose-800 hover:bg-rose-100"
                )}
              >
                Needs Attention ({overall.performanceTiers?.needsAttention || 0})
              </button>
            </div>
          </div>

          {/* Student Exam Analysis Table */}
          <Card className="p-0 overflow-hidden border border-surface-200 dark:border-surface-700">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50/80 dark:bg-surface-800 text-gray-500 uppercase text-[10px] font-bold">
                    <th className="p-3.5">Student</th>
                    <th className="p-3.5">Roll No</th>
                    <th className="p-3.5 text-center">Exams Taken</th>
                    <th className="p-3.5 text-center">Avg Score</th>
                    <th className="p-3.5 text-center">Overall Accuracy</th>
                    <th className="p-3.5">Latest Exam Result</th>
                    <th className="p-3.5 text-center">Academic Status</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((st: any) => {
                      const isExpanded = expandedStudentId === st._id;
                      return (
                        <React.Fragment key={st._id}>
                          <tr className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                            <td className="p-3.5">
                              <div className="flex items-center gap-2.5">
                                <Avatar name={`${st.firstName} ${st.lastName}`} size="sm" src="" className="" />
                                <div>
                                  <p className="font-semibold text-gray-900 dark:text-white text-xs">
                                    {st.firstName} {st.lastName}
                                  </p>
                                  <p className="text-[11px] text-gray-400">{st.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 font-bold text-gray-700 dark:text-gray-300">
                              {st.rollNo || '—'}
                            </td>
                            <td className="p-3.5 text-center font-bold text-blue-600">
                              {st.totalExams}
                            </td>
                            <td className="p-3.5 text-center font-bold text-gray-800 dark:text-gray-200">
                              {st.avgScore} <span className="text-[10px] text-gray-400">pts</span>
                            </td>
                            <td className="p-3.5 text-center">
                              <span className={cn(
                                "px-2.5 py-1 rounded-full text-xs font-black shadow-2xs inline-block",
                                st.overallAccuracy >= 70
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : st.overallAccuracy >= 40
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : st.totalExams > 0
                                  ? "bg-[#881337] text-white"
                                  : "bg-gray-100 text-gray-500"
                              )}>
                                {st.totalExams > 0 ? `${st.overallAccuracy}%` : '—'}
                              </span>
                            </td>
                            <td className="p-3.5">
                              {st.latestExam ? (
                                <div>
                                  <p className="font-bold text-gray-900 dark:text-white text-[11px] truncate max-w-[170px]">
                                    {st.latestExam.examTitle}
                                  </p>
                                  <p className="text-[10px] text-gray-500">
                                    Score: <span className="font-bold text-[#1a7a35]">{st.latestExam.score}</span> / {st.latestExam.totalMarks} ({st.latestExam.percentage}%)
                                  </p>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-[11px]">No tests taken</span>
                              )}
                            </td>
                            <td className="p-3.5 text-center">
                              {st.performanceTier === 'TOP_PERFORMER' ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Top Performer
                                </span>
                              ) : st.performanceTier === 'AVERAGE' ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                                  On Track
                                </span>
                              ) : st.performanceTier === 'NEEDS_ATTENTION' ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#881337] text-white">
                                  Needs Attention
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-400 font-semibold">Not Evaluated</span>
                              )}
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {st.exams && st.exams.length > 0 && (
                                  <button
                                    onClick={() => setExpandedStudentId(isExpanded ? null : st._id)}
                                    className="p-1 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                                    title="View student exams history"
                                  >
                                    {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                  </button>
                                )}
                                <button
                                  onClick={() => navigateToStudent(st._id)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#1a7a35] text-white hover:bg-[#146029] transition-colors inline-flex items-center gap-1 shadow-xs"
                                >
                                  Deep Dive <ChevronRight size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Exams List for this Student */}
                          {isExpanded && st.exams && (
                            <tr className="bg-emerald-50/30 dark:bg-surface-900/60 border-y border-emerald-100 dark:border-surface-700">
                              <td colSpan={8} className="p-4">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h5 className="font-bold text-xs text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                                      <FileText size={14} className="text-[#1a7a35]" /> Exam History for {st.firstName} ({st.exams.length} submissions):
                                    </h5>
                                    <span className="text-[11px] text-gray-500">
                                      Weak topics in tests: <strong className="text-rose-600">{st.weakTopicsCount}</strong>
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                    {st.exams.map((ex: any, idx: number) => (
                                      <div key={idx} className="p-3 rounded-xl bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 shadow-2xs space-y-1">
                                        <p className="font-bold text-xs text-gray-900 dark:text-white truncate">{ex.examTitle}</p>
                                        <div className="flex items-center justify-between text-[11px] text-gray-500">
                                          <span>Score: <strong className="text-gray-800 dark:text-gray-200">{ex.score} / {ex.totalMarks}</strong></span>
                                          <span className={cn(
                                            "font-bold px-1.5 py-0.2 rounded text-[10px]",
                                            ex.accuracy >= 70 ? "bg-emerald-100 text-emerald-800" : ex.accuracy >= 40 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                                          )}>
                                            {ex.accuracy}% acc.
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-gray-400">Date: {new Date(ex.date).toLocaleDateString()}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-xs text-gray-400">
                        No students match the selected filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: SUBJECT-WISE MULTI-PERFORMANCE ANALYSIS */}
      {activeTab === 'subjects' && (
        <div className="space-y-6 animate-fade-in">
          {/* A. Overall Subject Health Cards */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <BookOpen size={16} className="text-[#1a7a35]" /> Overall Subject Performance in this Batch
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(data?.subjects || []).map((subj: any) => (
                <div
                  key={subj.subject}
                  className={cn(
                    "p-4 rounded-2xl border transition-all bg-white dark:bg-surface-800 shadow-xs",
                    selectedSubject === subj.subject ? "border-[#1a7a35] ring-2 ring-emerald-100" : "border-surface-200 hover:border-emerald-300"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                      <BookOpen size={16} className="text-[#1a7a35]" /> {subj.subject}
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {subj.evaluatedStudentsCount} Evaluated
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                    <div className="bg-surface-50 dark:bg-surface-900/40 p-2 rounded-xl text-center">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Batch Accuracy</p>
                      <p className={cn("text-base font-black", subj.batchAverageAccuracy >= 70 ? "text-emerald-600" : subj.batchAverageAccuracy >= 40 ? "text-amber-600" : "text-rose-600")}>
                        {subj.batchAverageAccuracy}%
                      </p>
                    </div>
                    <div className="bg-surface-50 dark:bg-surface-900/40 p-2 rounded-xl text-center">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Avg Score</p>
                      <p className="text-base font-black text-gray-800 dark:text-white">
                        {subj.batchAverageScore}
                      </p>
                    </div>
                  </div>

                  {/* Student performance breakdown in this subject */}
                  <div className="flex items-center justify-between text-[11px] font-bold pt-2 border-t border-gray-100 dark:border-surface-700">
                    <span className="text-emerald-700">Strong: {subj.strongStudentsCount}</span>
                    <span className="text-amber-700">Avg: {subj.averageStudentsCount}</span>
                    <span className="text-[#881337]">Weak: {subj.weakStudentsCount}</span>
                  </div>

                  {/* Weak topics list in this subject */}
                  {subj.topWeakTopics && subj.topWeakTopics.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-surface-700">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Critical Topics in {subj.subject}:</p>
                      <div className="flex flex-wrap gap-1">
                        {subj.topWeakTopics.map((wt: any) => (
                          <span key={wt.topic} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#881337] text-white">
                            {wt.topic} ({wt.affectedStudentsCount} st.)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* B. Multi-Subject Performance Matrix Table (How students are performing in their different subjects) */}
          <Card className="p-5 border border-surface-200 dark:border-surface-700 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Target size={16} className="text-[#1a7a35]" /> Student Performance Breakdown Across Different Subjects
                </h3>
                <p className="text-xs text-gray-500">
                  Compare how each student is performing in Physics, Chemistry, Maths, and other evaluated subjects.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-gray-500 uppercase text-[10px] font-bold">
                    <th className="p-3 sticky left-0 bg-surface-50 dark:bg-surface-800 z-10">Student</th>
                    <th className="p-3 text-center">Roll No</th>
                    {availableSubjects.map((sub: string) => (
                      <th key={sub} className="p-3 text-center">
                        {sub}
                      </th>
                    ))}
                    <th className="p-3 text-right">Deep Dive</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                  {(data?.students || []).map((st: any) => (
                    <tr key={st._id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                      <td className="p-3 sticky left-0 bg-white dark:bg-surface-900 z-10">
                        <p className="font-semibold text-gray-900 dark:text-white text-xs">{st.firstName} {st.lastName}</p>
                        <p className="text-[10px] text-gray-400">{st.email}</p>
                      </td>
                      <td className="p-3 text-center font-bold text-gray-600 dark:text-gray-300">
                        {st.rollNo || '—'}
                      </td>

                      {/* Subject Scores / Accuracies for this student */}
                      {availableSubjects.map((sub: string) => {
                        const stSub = st.subjects?.[sub];
                        if (!stSub || stSub.attempted === 0) {
                          return (
                            <td key={sub} className="p-3 text-center text-gray-400 text-[11px]">
                              —
                            </td>
                          );
                        }

                        const isStrong = stSub.accuracy >= 70;
                        const isAverage = stSub.accuracy >= 40 && stSub.accuracy < 70;
                        const isWeak = stSub.accuracy < 40;

                        return (
                          <td key={sub} className="p-3 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[11px] font-black shadow-2xs",
                                isStrong
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : isAverage
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : "bg-[#881337] text-white"
                              )}>
                                {stSub.accuracy}%
                              </span>
                              <span className="text-[9px] text-gray-500 mt-0.5">
                                Score: {stSub.marksObtained}
                              </span>
                              {stSub.weakTopicsCount > 0 && (
                                <span className="text-[9px] font-bold text-rose-600 mt-0.2">
                                  {stSub.weakTopicsCount} weak top.
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      <td className="p-3 text-right">
                        <button
                          onClick={() => navigateToStudent(st._id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary-600 transition-colors inline-flex items-center gap-1 shadow-xs"
                        >
                          Analyze <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: BATCH EXAMS LIST & DETAILED RESULTS */}
      {activeTab === 'exams' && (
        <Card className="p-5 border border-surface-200 dark:border-surface-700 space-y-4 animate-fade-in">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText size={16} className="text-[#1a7a35]" /> Exams Taken by Students in this Batch
            </h3>
            <p className="text-xs text-gray-500">
              Overview of all exams evaluated for this cohort, attendance rate, highest and average scores.
            </p>
          </div>

          {data?.examsList && data.examsList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-gray-500 uppercase text-[10px] font-bold">
                    <th className="p-3">Exam Title</th>
                    <th className="p-3">Exam Type</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-center">Batch Attendance</th>
                    <th className="p-3 text-center">Avg Score / Total</th>
                    <th className="p-3 text-center">Highest Score</th>
                    <th className="p-3 text-center">Average Accuracy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                  {data.examsList.map((exam: any) => (
                    <tr key={exam.examId} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                      <td className="p-3">
                        <p className="font-bold text-gray-900 dark:text-white text-xs">{exam.title}</p>
                      </td>
                      <td className="p-3 text-gray-500 text-[11px]">
                        {exam.examType}
                      </td>
                      <td className="p-3 text-gray-600 text-xs">
                        {new Date(exam.date).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-bold text-gray-800 dark:text-gray-200">{exam.submissionsCount}</span>
                        <span className="text-[10px] text-gray-400 ml-1">({exam.attendanceRate}%)</span>
                      </td>
                      <td className="p-3 text-center font-bold text-gray-900 dark:text-white">
                        {exam.averageScore} <span className="text-[10px] text-gray-400">/ {exam.totalMarks}</span>
                      </td>
                      <td className="p-3 text-center font-black text-emerald-600">
                        {exam.highestScore}
                      </td>
                      <td className="p-3 text-center">
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-bold",
                          exam.averageAccuracy >= 70 ? "bg-emerald-100 text-emerald-800" : exam.averageAccuracy >= 40 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                        )}>
                          {exam.averageAccuracy}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-8">No exams have been completed for this batch yet.</p>
          )}
        </Card>
      )}
    </div>
  );
}
