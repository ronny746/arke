"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card } from '@/components/ui/index.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { teacherAPI } from '@/api/teacher';
import toast from 'react-hot-toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const localDate = (value: Date) => {
  const copy = new Date(value);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
};
const weekStart = (value = new Date()) => {
  const date = new Date(value);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  date.setHours(0, 0, 0, 0);
  return date;
};
const readableTime = (value?: string) => {
  if (!value) return 'Time not set';
  const [hours, minutes] = value.split(':').map(Number);
  return `${((hours + 11) % 12) + 1}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
};

export default function TeacherTimetablePage() {
  const [start, setStart] = useState(() => weekStart());
  const [scheduleByDate, setScheduleByDate] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  const dates = useMemo(() => DAYS.map((label, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { label, key: localDate(date), date };
  }), [start]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(dates.map(async ({ key }) => {
        const response = await teacherAPI.getCalculatedSchedule({ date: key });
        return [key, response.data?.data || []] as const;
      }));
      setScheduleByDate(Object.fromEntries(results));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not load your weekly timetable.');
    } finally {
      setLoading(false);
    }
  }, [dates]);

  useEffect(() => { load(); }, [load]);
  const shiftWeek = (amount: number) => setStart((current) => {
    const next = new Date(current);
    next.setDate(next.getDate() + amount * 7);
    return next;
  });

  return <div className="space-y-6 animate-fade-in">
    <PageHeader title="Weekly timetable" subtitle="All classes assigned to you this week, across every batch." breadcrumbs={['Home', 'Timetable']} />
    <Card className="p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-100 pb-4 dark:border-surface-800">
        <div><h2 className="flex items-center gap-2 text-lg font-bold text-surface-900 dark:text-white"><CalendarDays className="text-primary-600" size={20} /> Weekly class plan</h2><p className="mt-1 text-sm text-surface-500">{dates[0].date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – {dates[6].date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
        <div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => shiftWeek(-1)}>Previous week</Button><Button type="button" variant="outline" size="sm" onClick={() => shiftWeek(1)}>Next week</Button><Button type="button" variant="outline" size="sm" loading={loading} onClick={load}><RefreshCw size={15} className="mr-1.5" />Refresh</Button></div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dates.map(({ label, key, date }) => {
          const classes = scheduleByDate[key] || [];
          return <section key={key} className="rounded-2xl border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-900">
            <h3 className="font-bold text-surface-900 dark:text-white">{label}</h3><p className="mt-0.5 text-xs text-surface-500">{date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
            <div className="mt-4 space-y-3">{loading ? <div className="h-16 animate-pulse rounded-xl bg-surface-100 dark:bg-surface-800" /> : classes.length ? classes.map((item) => <article key={item._id} className="rounded-xl border border-primary-100 bg-primary-50/50 p-3 dark:border-primary-900/50 dark:bg-primary-950/20"><p className="text-sm font-bold text-surface-900 dark:text-white">{item.subjectId?.name || 'Subject not set'}</p><p className="mt-1 text-xs text-surface-600 dark:text-surface-300">{item.batchId?.name || 'Batch'}{item.batchId?.section ? ` · ${item.batchId.section}` : ''}</p><p className="mt-2 text-xs font-semibold text-primary-700 dark:text-primary-300">{readableTime(item.startTime)} – {readableTime(item.endTime)}</p></article>) : <p className="rounded-xl border border-dashed border-surface-200 bg-surface-50 px-3 py-5 text-center text-xs text-surface-500 dark:border-surface-700 dark:bg-surface-950/30">No class assigned.</p>}</div>
          </section>;
        })}
      </div>
    </Card>
  </div>;
}
