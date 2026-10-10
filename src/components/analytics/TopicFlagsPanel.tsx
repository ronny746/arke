"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock3, LoaderCircle } from 'lucide-react';
import axiosInstance from '@/api/axiosInstance';

type Flag = { _id: string; subjectName: string; topicName: string; percentage: number; flag: 'RED' | 'YELLOW' | 'GREEN'; remedialSessionId?: { _id: string; title: string; status: string } };

const style = {
  RED: { label: 'Needs remedial work', dot: 'bg-danger-500', panel: 'border-danger-200 bg-danger-50/50', text: 'text-danger-700' },
  YELLOW: { label: 'Build confidence', dot: 'bg-warning-500', panel: 'border-warning-200 bg-warning-50/50', text: 'text-warning-700' },
  GREEN: { label: 'On track', dot: 'bg-success-500', panel: 'border-success-200 bg-success-50/50', text: 'text-success-700' },
};

export function TopicFlagsPanel({ 
  studentId, 
  childId, 
  sourceType,
  subject,
  fallbackTopics = []
}: { 
  studentId?: string; 
  childId?: string; 
  sourceType?: 'EXAM' | 'DPP';
  subject?: string;
  fallbackTopics?: any[];
}) {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const url = childId 
      ? `/performance-flags/children/${childId}` 
      : (studentId && studentId !== 'me')
      ? `/performance-flags/student/${studentId}`
      : '/performance-flags/me';

    const params: any = {};
    if (sourceType) params.sourceType = sourceType;
    if (subject && subject !== 'ALL') params.subject = subject;

    axiosInstance.get(url, { params })
      .then(res => { if (active) setFlags(res.data?.data || []); })
      .catch(() => { if (active) setFlags([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [studentId, childId, sourceType, subject]);

  const displayList = flags.length > 0 ? flags : fallbackTopics;

  if (loading && !displayList.length) return <div className="min-h-20 flex items-center justify-center"><LoaderCircle className="animate-spin text-primary-500" /></div>;
  if (!displayList.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 dark:border-surface-700 px-4 py-5 text-center text-xs text-gray-500">
        {sourceType === 'DPP' ? 'No topic evaluations from DPPs yet. Complete assigned DPPs to track topic health.' : 'No weak topics flagged from submitted tests.'}
      </div>
    );
  }

  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {displayList.map(flag => {
        const isRed = flag.flag === 'RED';
        const isYellow = flag.flag === 'YELLOW';

        return (
          <article 
            key={flag._id} 
            className={`rounded-xl border p-3 transition-all ${
              isRed 
                ? 'bg-[#881337] border-[#70102d] text-white shadow-xs' 
                : isYellow 
                ? 'bg-[#b45309] border-[#92400e] text-white shadow-xs' 
                : 'bg-[#15803d] border-[#166534] text-white shadow-xs'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className={`text-[10px] font-bold uppercase tracking-wider truncate ${
                  isRed ? 'text-rose-200' : isYellow ? 'text-amber-200' : 'text-emerald-200'
                }`}>
                  {flag.subjectName}
                </p>
                <h4 className="text-xs font-bold truncate mt-0.5 text-white">
                  {flag.topicName}
                </h4>
              </div>
              <span 
                className="h-2.5 w-2.5 rounded-full shrink-0 bg-white/80 shadow-xs" 
                aria-label={flag.flag} 
              />
            </div>

            <div className="mt-2.5 flex items-end justify-between">
              <div>
                <p className="text-lg font-black leading-none text-white">
                  {flag.percentage}%
                </p>
                <p className={`text-[10px] font-medium mt-0.5 ${
                  isRed ? 'text-rose-100' : isYellow ? 'text-amber-100' : 'text-emerald-100'
                }`}>
                  {isRed ? 'Needs Attention' : isYellow ? 'Needs Practice' : 'On Track'}
                </p>
              </div>

              {isRed ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/20 text-white border border-white/20 inline-flex items-center gap-1">
                  Weak Topic
                </span>
              ) : isYellow ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/20 text-white border border-white/20 inline-flex items-center gap-1">
                  <Clock3 size={11} className="text-white" /> Practice
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/20 text-white border border-white/20 inline-flex items-center gap-1">
                  <CheckCircle2 size={11} className="text-white" /> Mastered
                </span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
