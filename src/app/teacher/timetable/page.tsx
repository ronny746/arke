"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, RefreshCw, Filter, Users, Play, ExternalLink, ArrowLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialBatchParam = searchParams.get('batchId') || 'ALL';

  const [start, setStart] = useState(() => weekStart());
  const [scheduleByDate, setScheduleByDate] = useState<Record<string, any[]>>({});
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>(initialBatchParam);
  const [loading, setLoading] = useState(true);

  // Sync state if query param changes
  useEffect(() => {
    const param = searchParams.get('batchId');
    if (param) {
      setSelectedBatchFilter(param);
    }
  }, [searchParams]);

  // Load teacher batches for filter
  useEffect(() => {
    teacherAPI.getViewBatches()
      .then(res => setBatches(res.data?.data || []))
      .catch(() => {});
  }, []);

  const dates = useMemo(() => DAYS.map((label, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { label, key: localDate(date), date, isToday: localDate(date) === localDate(new Date()) };
  }), [start]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(dates.map(async ({ key }) => {
        const params: any = { date: key };
        if (selectedBatchFilter !== 'ALL') {
          params.batchId = selectedBatchFilter;
        }
        const response = await teacherAPI.getCalculatedSchedule(params);
        return [key, response.data?.data || []] as const;
      }));
      setScheduleByDate(Object.fromEntries(results));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not load your weekly timetable.');
    } finally {
      setLoading(false);
    }
  }, [dates, selectedBatchFilter]);

  useEffect(() => { load(); }, [load]);

  const shiftWeek = (amount: number) => setStart((current) => {
    const next = new Date(current);
    next.setDate(next.getDate() + amount * 7);
    return next;
  });

  const selectedBatchObj = batches.find(b => b._id === selectedBatchFilter);

  // Total count of scheduled classes this week
  const totalClassesThisWeek = useMemo(() => {
    return Object.values(scheduleByDate).reduce((sum, list) => sum + (list?.length || 0), 0);
  }, [scheduleByDate]);

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <PageHeader 
        title="Weekly Timetable" 
        subtitle="All classes assigned to you, filtered by batch." 
        breadcrumbs={['Home', 'Timetable']} 
      />

      <Card className="p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-100 pb-4 dark:border-surface-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="flex items-center gap-2 text-lg font-bold text-surface-900 dark:text-white">
                <CalendarDays className="text-[#1a7a35]" size={20} /> Weekly Class Plan
              </h2>
              {selectedBatchObj && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#ecfdf5] text-[#1a7a35] border border-[#1a7a35]/20">
                  {selectedBatchObj.name}{selectedBatchObj.section ? ` · Sec ${selectedBatchObj.section}` : ''}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-surface-500">
              {dates[0].date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – {dates[6].date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • {totalClassesThisWeek} {totalClassesThisWeek === 1 ? 'class' : 'classes'} scheduled
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Batch Filter Dropdown */}
            {batches.length > 0 && (
              <div className="flex items-center gap-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-1.5">
                <Filter size={14} className="text-[#1a7a35]" />
                <span className="text-xs font-bold text-surface-600 dark:text-surface-300 mr-1">Batch:</span>
                <select
                  value={selectedBatchFilter}
                  onChange={(e) => setSelectedBatchFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-surface-900 dark:text-white focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Assigned Batches ({batches.length})</option>
                  {batches.map((batch: any) => (
                    <option key={batch._id} value={batch._id}>
                      {batch.name}{batch.section ? ` · ${batch.section}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-1.5">
              <Button type="button" variant="outline" size="sm" onClick={() => shiftWeek(-1)}>Previous week</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setStart(weekStart())}>This week</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => shiftWeek(1)}>Next week</Button>
              <Button type="button" variant="outline" size="sm" loading={loading} onClick={load}>
                <RefreshCw size={14} className="mr-1.5" />Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Batch Pills Bar */}
        {batches.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pt-4 pb-2 border-b border-surface-100 dark:border-surface-800 scrollbar-thin">
            <button
              type="button"
              onClick={() => setSelectedBatchFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedBatchFilter === 'ALL'
                  ? 'bg-[#1a7a35] text-white shadow-sm'
                  : 'bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-200'
              }`}
            >
              All Batches
            </button>
            {batches.map((batch: any) => (
              <button
                key={batch._id}
                type="button"
                onClick={() => setSelectedBatchFilter(batch._id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedBatchFilter === batch._id
                    ? 'bg-[#1a7a35] text-white shadow-sm'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-200'
                }`}
              >
                {batch.name}{batch.section ? ` · Sec ${batch.section}` : ''}
              </button>
            ))}
          </div>
        )}

        {/* 7-Day Timetable Grid */}
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dates.map(({ label, key, date, isToday }) => {
            const classes = scheduleByDate[key] || [];
            return (
              <section 
                key={key} 
                className={`rounded-2xl border p-4 transition-all ${
                  isToday 
                    ? 'border-[#1a7a35]/40 bg-[#f7fdf9] dark:bg-surface-900 shadow-sm' 
                    : 'border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-surface-900 dark:text-white flex items-center gap-1.5">
                      {label}
                      {isToday && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#1a7a35] text-white">
                          Today
                        </span>
                      )}
                    </h3>
                    <p className="mt-0.5 text-xs text-surface-500">
                      {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-surface-400">
                    {classes.length} {classes.length === 1 ? 'class' : 'classes'}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {loading ? (
                    <div className="h-16 animate-pulse rounded-xl bg-surface-100 dark:bg-surface-800" />
                  ) : classes.length ? (
                    classes.map((item) => (
                      <article 
                        key={item._id} 
                        className="rounded-xl border border-primary-100 bg-primary-50/50 p-3 dark:border-primary-900/50 dark:bg-primary-950/20"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-surface-900 dark:text-white truncate">
                            {item.subjectId?.name || 'Subject not set'}
                          </p>
                          {item.isRescheduled && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                              Rescheduled
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-surface-600 dark:text-surface-300">
                          {item.batchId?.name || 'Batch'}{item.batchId?.section ? ` · ${item.batchId.section}` : ''}
                        </p>
                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-primary-100/60 dark:border-primary-900/40">
                          <p className="text-xs font-semibold text-[#1a7a35] dark:text-primary-300">
                            {readableTime(item.startTime)} – {readableTime(item.endTime)}
                          </p>
                          <button
                            onClick={() => router.push(`/teacher/live-classes?batchId=${item.batchId?._id || item.batchId}`)}
                            className="text-[11px] font-bold text-[#1a7a35] hover:underline"
                          >
                            Live Class →
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="rounded-xl border border-dashed border-surface-200 bg-surface-50 px-3 py-5 text-center text-xs text-surface-500 dark:border-surface-700 dark:bg-surface-950/30">
                      No class assigned.
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
