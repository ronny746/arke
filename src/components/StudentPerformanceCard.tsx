"use client";

import { useState, useEffect } from 'react';
import { TrendingUp, Video, Target, FileText, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { studentAPI } from '@/api/index.js';

export default function StudentPerformanceCard() {
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        setLoading(true);
        const res = await studentAPI.getMyPerformance();
        if (res.data?.success) {
          setPerformanceData(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch student performance", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPerformance();
  }, []);

  const summary = performanceData?.dashboardSummary || {};
  const overall = performanceData?.overall || {};
  const subjectWiseList: any[] = [
    ...(performanceData?.subjectWise || []),
    ...(performanceData?.dppData?.subjectWise || [])
  ];

  let totalAttemptedAll = 0;
  let totalCorrectAll = 0;

  const subjectTotals = new Map<string, { attempted: number; correct: number }>();

  for (const s of subjectWiseList) {
    if (!s) continue;
    const subjectName = String(s.subject || s.subjectName || 'Uncategorised').trim() || 'Uncategorised';
    const attempted = Number(s.attempted) || 0;
    const correct = Number(s.correct) || 0;

    totalAttemptedAll += attempted;
    totalCorrectAll += correct;

    const current = subjectTotals.get(subjectName) || { attempted: 0, correct: 0 };
    subjectTotals.set(subjectName, { attempted: current.attempted + attempted, correct: current.correct + correct });
  }

  const calcOverallAcc = totalAttemptedAll > 0
    ? (totalCorrectAll / totalAttemptedAll) * 100
    : Number(overall.overallPercentage || 0);

  const overallAccuracyStr = summary.overallAccuracy || `${calcOverallAcc.toFixed(1)}%`;
  const subjectAccuracies = Array.from(subjectTotals.entries())
    .map(([name, value]) => ({ name, accuracy: value.attempted ? (value.correct / value.attempted) * 100 : 0 }))
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 4);

  const counts = summary.counts || {};
  const liveExams = counts.liveExams ?? overall.totalExamsTaken ?? (performanceData?.recentExams?.length || 0);
  const dpps = counts.dpps ?? (performanceData?.dppData?.recentDpps?.length || 0);
  const practicePapers = counts.practicePapers ?? 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xl font-bold text-surface-900 dark:text-white">My Performance</h2>
        <Link 
          href="/student/performance" 
          className="flex items-center gap-1 text-sm font-semibold text-accent-600 hover:text-accent-700 dark:text-accent-400 transition-colors"
        >
          View Details
          <ChevronRight size={16} />
        </Link>
      </div>

      {/* Performance Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-6 shadow-sm space-y-6"
      >
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-8 h-8 border-4 border-accent-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Top Grid: Overall + Subject Accuracy */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Overall Accuracy */}
              <div className="md:col-span-5 flex flex-col justify-center space-y-2">
                <span className="text-xs font-bold text-surface-400 uppercase tracking-wider">
                  OVERALL ACCURACY
                </span>
                <span className="text-4xl md:text-5xl font-black text-surface-900 dark:text-white tracking-tight">
                  {overallAccuracyStr}
                </span>
                <div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                    <TrendingUp size={14} />
                    Overall Accuracy
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="hidden md:block md:col-span-1 flex justify-center">
                <div className="h-28 w-px bg-surface-200 dark:bg-surface-800" />
              </div>

              {/* Subject Accuracy Progress Bars */}
              <div className="md:col-span-6 space-y-3">
                <span className="text-xs font-bold text-surface-400 uppercase tracking-wider block mb-1">
                  SUBJECT ACCURACY
                </span>

                {subjectAccuracies.length ? subjectAccuracies.map((subject, index) => (
                  <div className="space-y-1" key={subject.name}>
                    <div className="flex justify-between text-xs font-bold"><span className="text-surface-700 dark:text-surface-300">{subject.name}</span><span className="text-surface-400">{subject.accuracy.toFixed(1)}%</span></div>
                    <div className="w-full h-2 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden"><div className={['bg-emerald-500', 'bg-amber-500', 'bg-indigo-500', 'bg-violet-500'][index]} style={{ width: `${Math.min(Math.max(subject.accuracy, 0), 100)}%` }} /></div>
                  </div>
                )) : <p className="text-sm text-surface-500">Subject accuracy will appear after your first submitted assessment.</p>}
              </div>
            </div>

            {/* Bottom KPI Grid */}
            <div className="pt-4 border-t border-surface-100 dark:border-surface-800 grid grid-cols-3 gap-4 text-center md:text-left">
              <Link href="/student/exams" className="flex flex-col md:flex-row items-center gap-3 p-2 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-950/50 text-accent-600 dark:text-accent-400 flex items-center justify-center shrink-0">
                  <Video size={20} />
                </div>
                <div>
                  <div className="text-lg font-bold text-surface-900 dark:text-white leading-tight">{liveExams}</div>
                  <div className="text-xs font-medium text-surface-500">Live Exams</div>
                </div>
              </Link>

              <Link href="/student/dpp" className="flex flex-col md:flex-row items-center gap-3 p-2 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Target size={20} />
                </div>
                <div>
                  <div className="text-lg font-bold text-surface-900 dark:text-white leading-tight">{dpps}</div>
                  <div className="text-xs font-medium text-surface-500">DPPs</div>
                </div>
              </Link>

              <Link href="/student/practice" className="flex flex-col md:flex-row items-center gap-3 p-2 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="text-lg font-bold text-surface-900 dark:text-white leading-tight">{practicePapers}</div>
                  <div className="text-xs font-medium text-surface-500">Practice Papers</div>
                </div>
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
