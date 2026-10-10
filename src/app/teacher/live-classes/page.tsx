"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  AlertCircle, CalendarDays, CheckCircle2, Clock3, ExternalLink, 
  Play, RefreshCw, StopCircle, Video, Users, ChevronLeft, ChevronRight,
  GraduationCap, Radio, ArrowLeft, Grid, Calendar, ArrowUpRight, Filter, Sparkles
} from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card } from '@/components/ui/index.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { teacherAPI } from '@/api/index.js';
import toast from 'react-hot-toast';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const localDateValue = (date = new Date()) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
};

const getWeekStart = (value = new Date()) => {
  const date = new Date(value);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  date.setHours(0, 0, 0, 0);
  return date;
};

const classIdentity = (liveClass: any) => String(liveClass?.classScheduleId?._id || liveClass?.classScheduleId || '');
const hostUrl = (liveClass: any) => liveClass?.startUrl || liveClass?.meetingLink || null;

const displayTime = (time?: string) => {
  if (!time) return 'Time not set';
  const [hours, minutes] = time.split(':').map(Number);
  return `${((hours + 11) % 12) + 1}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
};

const dateTimeFor = (date: string, time?: string) => new Date(`${date}T${time || '00:00'}:00`);

export default function TeacherLiveClassesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialBatchId = searchParams.get('batchId') || '';

  const [selectedDate, setSelectedDate] = useState(localDateValue());
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(initialBatchId);
  const [viewMode, setViewMode] = useState<'DAILY' | 'WEEKLY'>('DAILY');

  // Timetable section preview state (at top)
  const [timetableBatchFilter, setTimetableBatchFilter] = useState<string>(initialBatchId || 'ALL');
  const [topWeekSchedule, setTopWeekSchedule] = useState<Record<string, any[]>>({});
  const [topTimetableLoading, setTopTimetableLoading] = useState(true);

  const [schedule, setSchedule] = useState<any[]>([]);
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [weeklyBatchSchedule, setWeeklyBatchSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState('');
  const [endingId, setEndingId] = useState('');
  const [endConfirmationId, setEndConfirmationId] = useState('');
  const [now, setNow] = useState(new Date());

  // Week days for the top timetable preview
  const currentWeekStart = useMemo(() => getWeekStart(), []);
  const weekDayDates = useMemo(() => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((label, index) => {
    const d = new Date(currentWeekStart);
    d.setDate(currentWeekStart.getDate() + index);
    return {
      label,
      dateKey: localDateValue(d),
      date: d,
      isToday: localDateValue(d) === localDateValue(new Date())
    };
  }), [currentWeekStart]);

  // Load teacher batches
  const loadBatches = useCallback(async () => {
    try {
      const res = await teacherAPI.getViewBatches();
      const fetchedBatches = res.data?.data || [];
      setBatches(fetchedBatches);
    } catch (err) {
      console.error('Failed to load batches', err);
    }
  }, []);

  // Load Top Timetable Preview data
  const loadTopTimetable = useCallback(async () => {
    setTopTimetableLoading(true);
    try {
      const results = await Promise.all(weekDayDates.map(async ({ dateKey }) => {
        const params: any = { date: dateKey };
        if (timetableBatchFilter !== 'ALL') {
          params.batchId = timetableBatchFilter;
        }
        const res = await teacherAPI.getCalculatedSchedule(params);
        return [dateKey, res.data?.data || []] as const;
      }));
      setTopWeekSchedule(Object.fromEntries(results));
    } catch (err) {
      console.error('Failed to load top timetable', err);
    } finally {
      setTopTimetableLoading(false);
    }
  }, [weekDayDates, timetableBatchFilter]);

  // Load daily schedule & live classes
  const loadClasses = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const params: any = { date: selectedDate };
      if (selectedBatchId) {
        params.batchId = selectedBatchId;
      }

      const [scheduleResponse, liveResponse] = await Promise.all([
        teacherAPI.getCalculatedSchedule(params),
        teacherAPI.getLiveClasses(),
      ]);
      setSchedule(scheduleResponse.data?.data || []);
      setLiveClasses(liveResponse.data?.data || []);

      // If a batch is selected, load full schedule for that batch
      if (selectedBatchId) {
        const fullSchedRes = await teacherAPI.getClassSchedule({ batchId: selectedBatchId });
        setWeeklyBatchSchedule(fullSchedRes.data?.data || []);
      }
    } catch (error: any) {
      if (!quiet) toast.error(error.response?.data?.message || 'Could not load your classes. Please try again.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [selectedDate, selectedBatchId]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  useEffect(() => {
    loadTopTimetable();
  }, [loadTopTimetable]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    const refresh = window.setInterval(() => loadClasses({ quiet: true }), 30_000);
    return () => window.clearInterval(refresh);
  }, [loadClasses]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(tick);
  }, []);

  const changeDateBy = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(localDateValue(current));
  };

  const classesWithLiveState = useMemo(() => schedule.map((item) => ({
    ...item,
    liveClass: liveClasses.find((liveClass) => liveClass.status === 'ONGOING' && classIdentity(liveClass) === String(item._id)),
  })), [schedule, liveClasses]);

  // Group classes by Batch
  const classesGroupedByBatch = useMemo(() => {
    const groups: Record<string, { batchInfo: any; classes: any[] }> = {};

    classesWithLiveState.forEach((item) => {
      const bId = item.batchId?._id || item.batchId || 'unassigned';
      if (!groups[bId]) {
        groups[bId] = {
          batchInfo: item.batchId || { name: 'Assigned Batch' },
          classes: []
        };
      }
      groups[bId].classes.push(item);
    });

    return Object.entries(groups);
  }, [classesWithLiveState]);

  const startClass = async (item: any) => {
    setStartingId(String(item._id));
    try {
      const response = await teacherAPI.createLiveClass({ classScheduleId: item._id, platform: 'zoom' });
      const liveClass = response.data?.data;
      toast.success('Live class started! Students can join now.');
      const url = hostUrl(liveClass);
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      await loadClasses({ quiet: true });
    } catch (error: any) {
      const existing = error.response?.data?.data;
      if (error.response?.status === 409 && existing) {
        toast('This class is already live. Reopening it now.', { icon: 'ℹ️' });
        const url = hostUrl(existing);
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
        await loadClasses({ quiet: true });
      } else {
        toast.error(error.response?.data?.message || 'Could not start the class.');
      }
    } finally {
      setStartingId('');
    }
  };

  const rejoin = (liveClass: any) => {
    const url = hostUrl(liveClass);
    if (!url) return toast.error('The meeting link is not available. Contact an admin.');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const endClass = async (liveClass: any) => {
    setEndingId(String(liveClass._id));
    try {
      await teacherAPI.endLiveClass(liveClass._id);
      toast.success('Class ended. Attendance will now be synced.');
      setEndConfirmationId('');
      await loadClasses({ quiet: true });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not end the class.');
    } finally {
      setEndingId('');
    }
  };

  const isToday = selectedDate === localDateValue();
  const selectedBatchObj = batches.find((b) => b._id === selectedBatchId);

  // Total classes across the week in the top timetable
  const totalTopWeekClasses = useMemo(() => {
    return Object.values(topWeekSchedule).reduce((sum, list) => sum + (list?.length || 0), 0);
  }, [topWeekSchedule]);

  const openTimetablePage = (batchIdToPass?: string) => {
    const targetBatch = batchIdToPass !== undefined ? batchIdToPass : timetableBatchFilter;
    if (targetBatch && targetBatch !== 'ALL') {
      router.push(`/teacher/timetable?batchId=${targetBatch}`);
    } else {
      router.push('/teacher/timetable');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <PageHeader 
        title="Live Classes & Batches" 
        subtitle="Start live Zoom sessions and view timetables organized by your assigned batches." 
        breadcrumbs={['Home', 'Live Classes']} 
      />

      {/* ========================================================================= */}
      {/* TIMETABLE SECTION AT TOP (CLICKABLE TO OPEN TIMETABLE PAGE WITH BATCH FILTER) */}
      {/* ========================================================================= */}
      <section 
        className="bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/40 rounded-2xl border border-emerald-200/80 p-5 shadow-sm hover:shadow-md transition-all relative group cursor-pointer"
        onClick={() => openTimetablePage()}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-emerald-100 pb-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#1a7a35] text-white flex items-center justify-center shrink-0 shadow-sm">
              <CalendarDays size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-black text-gray-800">
                  Weekly Timetable
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ecfdf5] text-[#1a7a35] border border-[#1a7a35]/20">
                  Teacher Only
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {weekDayDates[0].date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – {weekDayDates[6].date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • {totalTopWeekClasses} {totalTopWeekClasses === 1 ? 'class' : 'classes'} scheduled this week
              </p>
            </div>
          </div>

          {/* Batch Filter & Open Button */}
          <div className="flex flex-wrap items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
            {/* Batch Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-xs">
              <Filter size={13} className="text-gray-400" />
              <select
                value={timetableBatchFilter}
                onChange={(e) => {
                  setTimetableBatchFilter(e.target.value);
                }}
                className="bg-transparent text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Assigned Batches ({batches.length})</option>
                {batches.map((batch: any) => (
                  <option key={batch._id} value={batch._id}>
                    {batch.name}{batch.section ? ` · ${batch.section}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => openTimetablePage()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1a7a35] text-white text-xs font-bold shadow-sm hover:bg-[#15632b] transition-all"
            >
              <span>Open Full Timetable</span>
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

        {/* 7-Day Mini Timetable Strip Preview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 mt-4">
          {weekDayDates.map(({ label, dateKey, date, isToday }) => {
            const dayClasses = topWeekSchedule[dateKey] || [];
            return (
              <div
                key={dateKey}
                onClick={(e) => {
                  e.stopPropagation();
                  openTimetablePage();
                }}
                className={`rounded-xl p-2.5 border transition-all text-left flex flex-col justify-between ${
                  isToday
                    ? 'border-[#1a7a35] bg-white shadow-sm ring-1 ring-[#1a7a35]/20'
                    : 'border-gray-200/70 bg-white/80 hover:bg-white hover:border-[#1a7a35]/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-800">{label.slice(0, 3)}</span>
                    <span className="text-[10px] text-gray-400">{date.getDate()}</span>
                  </div>
                  {isToday && (
                    <span className="inline-block mt-0.5 text-[9px] font-black px-1.5 py-0.2 rounded bg-[#1a7a35] text-white">
                      TODAY
                    </span>
                  )}
                </div>

                <div className="mt-2 pt-1.5 border-t border-gray-100 flex items-center justify-between">
                  <span className={`text-[11px] font-bold ${dayClasses.length > 0 ? 'text-[#1a7a35]' : 'text-gray-400'}`}>
                    {topTimetableLoading ? '...' : `${dayClasses.length} ${dayClasses.length === 1 ? 'class' : 'classes'}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-[#1a7a35] font-semibold">
          <span className="flex items-center gap-1">
            <Sparkles size={12} /> Click anywhere on this section to view or print the full weekly timetable
          </span>
          <span className="underline group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
            View detailed timetable →
          </span>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* BATCH SELECTOR & CARDS OVERVIEW */}
      {/* ========================================================================= */}
      <Card className="p-4 md:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-100 dark:border-surface-800 pb-4">
          <div>
            <h2 className="flex items-center gap-2 text-base md:text-lg font-bold text-surface-900 dark:text-white">
              <Users className="text-[#1a7a35]" size={20} /> My Assigned Batches
            </h2>
            <p className="mt-0.5 text-xs text-surface-500">Filter live classes and scheduled sessions by batch.</p>
          </div>

          {selectedBatchId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedBatchId('')}
              className="text-xs"
            >
              <ArrowLeft size={14} className="mr-1.5" /> View All Batches
            </Button>
          )}
        </div>

        {/* Batch Pills / Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-4 pb-2 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedBatchId('')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              !selectedBatchId
                ? 'bg-[#1a7a35] text-white shadow-sm'
                : 'bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-200'
            }`}
          >
            <Users size={14} /> All My Batches ({batches.length})
          </button>

          {batches.map((batch) => {
            const isBatchSelected = selectedBatchId === batch._id;
            const hasOngoingClass = liveClasses.some((lc) => {
              const bId = lc.classScheduleId?.batchId?._id || lc.classScheduleId?.batchId;
              return bId === batch._id && lc.status === 'ONGOING';
            });

            return (
              <button
                key={batch._id}
                type="button"
                onClick={() => setSelectedBatchId(batch._id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                  isBatchSelected
                    ? 'bg-[#1a7a35] text-white shadow-sm'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-200'
                }`}
              >
                <span>{batch.name}{batch.section ? ` · Sec ${batch.section}` : ''}</span>
                {hasOngoingClass && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Batch Quick Cards Grid (When all batches are selected) */}
        {!selectedBatchId && batches.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-4 pt-3 border-t border-surface-100 dark:border-surface-800">
            {batches.map((batch) => {
              const activeInBatch = liveClasses.find((lc) => {
                const bId = lc.classScheduleId?.batchId?._id || lc.classScheduleId?.batchId;
                return bId === batch._id && lc.status === 'ONGOING';
              });

              return (
                <div
                  key={batch._id}
                  onClick={() => setSelectedBatchId(batch._id)}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all hover:shadow-md flex flex-col justify-between ${
                    activeInBatch
                      ? 'border-emerald-300 bg-emerald-50/70 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/20'
                      : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-[#1a7a35]/50'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">
                          {batch.courseId?.name || 'Course'}
                        </span>
                        <h3 className="font-bold text-sm text-surface-900 dark:text-white truncate mt-0.5">
                          {batch.name}{batch.section ? ` · Section ${batch.section}` : ''}
                        </h3>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#1a7a35] dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
                        <GraduationCap size={16} />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-surface-500 font-medium">
                        {(batch.students || []).length} enrolled students
                      </span>
                      {activeInBatch ? (
                        <span className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300 text-[11px] animate-pulse">
                          <Radio size={12} /> LIVE NOW
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1a7a35]">View Batch Classes →</span>
                    {activeInBatch && (
                      <Button
                        size="sm"
                        variant="success"
                        className="text-xs py-1 px-2.5 h-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          rejoin(activeInBatch);
                        }}
                      >
                        <ExternalLink size={12} className="mr-1" /> Rejoin
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ========================================================================= */}
      {/* CLASSES SCHEDULE BY BATCH */}
      {/* ========================================================================= */}
      <Card className="p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-100 dark:border-surface-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-surface-900 dark:text-white">
                {selectedBatchObj ? `${selectedBatchObj.name} Schedule` : 'All Batches Class Schedule'}
              </h2>
              {selectedBatchObj && selectedBatchObj.section && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">
                  Section {selectedBatchObj.section}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-surface-500">
              Only classes scheduled for you in {selectedBatchObj ? selectedBatchObj.name : 'your assigned batches'} are displayed.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle when batch is selected */}
            {selectedBatchId && (
              <div className="flex items-center bg-surface-100 dark:bg-surface-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setViewMode('DAILY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    viewMode === 'DAILY'
                      ? 'bg-white dark:bg-surface-900 text-surface-900 dark:text-white shadow-sm'
                      : 'text-surface-600 dark:text-surface-400'
                  }`}
                >
                  <Calendar size={13} className="inline mr-1" /> Daily
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('WEEKLY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    viewMode === 'WEEKLY'
                      ? 'bg-white dark:bg-surface-900 text-surface-900 dark:text-white shadow-sm'
                      : 'text-surface-600 dark:text-surface-400'
                  }`}
                >
                  <Grid size={13} className="inline mr-1" /> Batch Timetable
                </button>
              </div>
            )}

            {/* Date Navigator */}
            {viewMode === 'DAILY' && (
              <div className="flex items-center gap-1 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => changeDateBy(-1)}
                  className="p-1 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg text-surface-600 dark:text-surface-300 transition"
                  title="Previous Day"
                >
                  <ChevronLeft size={16} />
                </button>
                <input
                  id="class-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-8 rounded-lg bg-transparent px-2 text-xs font-bold text-surface-800 dark:text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => changeDateBy(1)}
                  className="p-1 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg text-surface-600 dark:text-surface-300 transition"
                  title="Next Day"
                >
                  <ChevronRight size={16} />
                </button>
                {!isToday && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate(localDateValue())}
                    className="px-2 py-0.5 text-[11px] font-bold text-[#1a7a35] hover:underline"
                  >
                    Today
                  </button>
                )}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => loadClasses()}
              loading={loading}
            >
              <RefreshCw size={14} className="mr-1.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* VIEW 1: WEEKLY TIMETABLE FOR SELECTED BATCH */}
        {/* ===================================================================== */}
        {selectedBatchId && viewMode === 'WEEKLY' ? (
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-surface-700 dark:text-surface-200">
                Weekly Schedule for {selectedBatchObj?.name} (Teacher: You)
              </h3>
              <button
                onClick={() => openTimetablePage(selectedBatchId)}
                className="text-xs font-bold text-[#1a7a35] hover:underline flex items-center gap-1"
              >
                Open in Full Timetable Page <ArrowUpRight size={13} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {DAYS.map((dayName, dayIdx) => {
                const daySchedules = weeklyBatchSchedule.filter((s) => s.dayOfWeek === dayIdx);
                const isTodayDay = new Date().getDay() === dayIdx;

                return (
                  <div
                    key={dayName}
                    className={`rounded-2xl border p-4 ${
                      isTodayDay
                        ? 'border-[#1a7a35]/40 bg-[#f7fdf9] dark:bg-surface-900 shadow-sm'
                        : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-surface-100 dark:border-surface-800 pb-2">
                      <h4 className="font-bold text-sm text-surface-900 dark:text-white flex items-center gap-1.5">
                        {dayName}
                        {isTodayDay && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#1a7a35] text-white">
                            Today
                          </span>
                        )}
                      </h4>
                      <span className="text-xs font-semibold text-surface-500">
                        {daySchedules.length} {daySchedules.length === 1 ? 'period' : 'periods'}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {daySchedules.length > 0 ? (
                        daySchedules.map((s) => (
                          <div
                            key={s._id}
                            className="rounded-xl border border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 p-3"
                          >
                            <p className="text-xs font-bold text-surface-900 dark:text-white truncate">
                              {s.subjectId?.name || 'Subject'}
                            </p>
                            <p className="text-[11px] font-semibold text-[#1a7a35] mt-1">
                              {displayTime(s.startTime)} – {displayTime(s.endTime)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-surface-400 italic py-4 text-center">
                          No class scheduled
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ===================================================================== */
          /* VIEW 2: DAILY CLASSES ACCORDING TO BATCHES */
          /* ===================================================================== */
          <div className="mt-5 space-y-6">
            {loading ? (
              <div className="rounded-2xl border border-surface-200 p-8 text-center text-sm text-surface-500 dark:border-surface-700">
                Loading assigned batch classes…
              </div>
            ) : classesWithLiveState.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-surface-300 bg-surface-50 p-8 text-center dark:border-surface-700 dark:bg-surface-900/50">
                <CalendarDays className="mx-auto text-surface-400" size={28} aria-hidden="true" />
                <h3 className="mt-3 font-semibold text-surface-800 dark:text-white">
                  No classes assigned for this date {selectedBatchObj ? `in ${selectedBatchObj.name}` : ''}
                </h3>
                <p className="mt-1 text-xs text-surface-500">
                  Select another date or batch, or ask an admin to add you to the timetable if needed.
                </p>
              </div>
            ) : (
              /* Grouped by Batch */
              classesGroupedByBatch.map(([batchId, group]) => (
                <section
                  key={batchId}
                  className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-900/40 p-4 md:p-5 space-y-4"
                >
                  {/* Batch Section Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-200 dark:border-surface-700 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#ecfdf5] text-[#1a7a35] dark:bg-emerald-950/40 flex items-center justify-center font-bold text-xs">
                        <GraduationCap size={16} />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm md:text-base text-surface-900 dark:text-white">
                          {group.batchInfo?.name || 'Batch'} {group.batchInfo?.section ? `· Section ${group.batchInfo.section}` : ''}
                        </h3>
                        <p className="text-[11px] text-surface-500">
                          {group.classes.length} {group.classes.length === 1 ? 'class' : 'classes'} scheduled for you
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openTimetablePage(batchId)}
                        className="text-xs font-semibold text-[#1a7a35] hover:bg-[#ecfdf5]"
                      >
                        <CalendarDays size={13} className="mr-1" /> Batch Timetable
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedBatchId(batchId)}
                        className="text-xs font-semibold text-surface-700 hover:bg-surface-200"
                      >
                        Focus batch →
                      </Button>
                    </div>
                  </div>

                  {/* Scheduled Classes for this Batch */}
                  <div className="grid gap-3.5">
                    {group.classes.map((item) => {
                      const liveClass = item.liveClass;
                      const startsAt = dateTimeFor(selectedDate, item.startTime);
                      const endsAt = dateTimeFor(selectedDate, item.endTime);
                      const beforeStart = !liveClass && (!isToday || now < startsAt);
                      const afterEnd = !liveClass && isToday && now > endsAt;
                      const status = liveClass
                        ? 'LIVE NOW'
                        : afterEnd
                        ? 'WINDOW ENDED'
                        : beforeStart
                        ? 'SCHEDULED'
                        : 'READY TO START';

                      const cardBg = liveClass
                        ? 'border-emerald-300 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/30'
                        : afterEnd
                        ? 'border-surface-200 bg-surface-50/80 dark:border-surface-700 dark:bg-surface-900/50'
                        : 'border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-900 shadow-sm';

                      return (
                        <article
                          key={item._id}
                          className={`rounded-2xl border p-4 md:p-5 transition-all ${cardBg}`}
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                    liveClass
                                      ? 'bg-emerald-600 text-white animate-pulse'
                                      : afterEnd
                                      ? 'bg-surface-200 text-surface-600 dark:bg-surface-800 dark:text-surface-300'
                                      : beforeStart
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200'
                                      : 'bg-[#1a7a35] text-white'
                                  }`}
                                >
                                  {status}
                                </span>
                                {item.isRescheduled && (
                                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                                    RESCHEDULED
                                  </span>
                                )}
                              </div>

                              <h4 className="mt-2.5 text-base md:text-lg font-bold text-surface-900 dark:text-white">
                                {item.subjectId?.name || 'Subject not set'}
                              </h4>

                              <p className="mt-2 flex items-center gap-1.5 text-xs md:text-sm font-semibold text-[#1a7a35] dark:text-emerald-400">
                                <Clock3 size={15} aria-hidden="true" /> {displayTime(item.startTime)} – {displayTime(item.endTime)}
                              </p>

                              {beforeStart && (
                                <p className="mt-1.5 text-xs text-surface-500">
                                  Class opens at {displayTime(item.startTime)} on {new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}.
                                </p>
                              )}
                              {afterEnd && (
                                <p className="mt-1.5 text-xs text-surface-500">
                                  The scheduled class window has ended.
                                </p>
                              )}
                            </div>

                            <div className="flex min-w-[220px] flex-col gap-2">
                              {liveClass ? (
                                <>
                                  <Button
                                    type="button"
                                    variant="success"
                                    onClick={() => rejoin(liveClass)}
                                    className="font-bold"
                                  >
                                    <ExternalLink size={16} className="mr-2" /> Rejoin Zoom Class
                                  </Button>
                                  {endConfirmationId === String(liveClass._id) ? (
                                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                                      <p className="font-semibold">End class for all students?</p>
                                      <div className="mt-2 flex gap-2">
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setEndConfirmationId('')}
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="danger"
                                          loading={endingId === String(liveClass._id)}
                                          onClick={() => endClass(liveClass)}
                                        >
                                          End Class
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant="danger"
                                      size="sm"
                                      onClick={() => setEndConfirmationId(String(liveClass._id))}
                                    >
                                      <StopCircle size={15} className="mr-1.5" /> End Class
                                    </Button>
                                  )}
                                </>
                              ) : afterEnd ? (
                                <div className="flex items-center gap-2 rounded-xl bg-surface-100 px-3 py-2 text-xs font-medium text-surface-600 dark:bg-surface-800 dark:text-surface-300">
                                  <CheckCircle2 size={16} aria-hidden="true" /> Session closed
                                </div>
                              ) : (
                                <Button
                                  type="button"
                                  variant="primary"
                                  disabled={beforeStart}
                                  loading={startingId === String(item._id)}
                                  onClick={() => startClass(item)}
                                  className="font-bold"
                                >
                                  <Play size={16} className="mr-1.5" /> {beforeStart ? 'Starts at scheduled time' : 'Start Zoom Class'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
          </div>
        )}
      </Card>

      <p className="flex items-start gap-2 text-xs text-surface-500">
        <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> Starting a Zoom class notifies enrolled students in that batch and enables their Join button. Ending it locks join access and initiates attendance synchronization.
      </p>
    </div>
  );
}
