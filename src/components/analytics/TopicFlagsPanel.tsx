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

export function TopicFlagsPanel({ childId }: { childId?: string }) {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const url = childId ? `/performance-flags/children/${childId}` : '/performance-flags/me';
    axiosInstance.get(url).then(res => { if (active) setFlags(res.data?.data || []); }).catch(() => { if (active) setFlags([]); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [childId]);

  if (loading) return <div className="min-h-28 flex items-center justify-center"><LoaderCircle className="animate-spin text-primary-500" /></div>;
  if (!flags.length) return <div className="rounded-xl border border-dashed border-surface-300 px-5 py-7 text-sm text-surface-500">Topic flags will appear here after a submitted test.</div>;

  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
    {flags.map(flag => {
      const tone = style[flag.flag];
      return <article key={flag._id} className={`rounded-xl border p-4 ${tone.panel}`}>
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-surface-500">{flag.subjectName}</p><h3 className="mt-1 font-semibold text-surface-900">{flag.topicName}</h3></div>
          <span className={`h-3 w-3 rounded-full ${tone.dot}`} aria-label={flag.flag} />
        </div>
        <div className="mt-4 flex items-end justify-between"><div><p className={`text-2xl font-bold ${tone.text}`}>{flag.percentage}%</p><p className="text-xs text-surface-600">{tone.label}</p></div>
          {flag.flag === 'RED' && flag.remedialSessionId
            ? childId
              ? <span className="text-xs font-medium text-danger-700">Remedy assigned</span>
              : <Link className="btn-outline btn-sm" href={`/student/dpp/${flag.remedialSessionId._id}/play`}>Start remedy</Link>
            : flag.flag === 'GREEN'
              ? <CheckCircle2 className="text-success-600" size={20} />
              : <Clock3 className={tone.text} size={20} />}
        </div>
      </article>;
    })}
  </div>;
}
