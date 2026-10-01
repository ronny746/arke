"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, Clock3, ExternalLink, Play, RefreshCw, StopCircle, Video } from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card } from '@/components/ui/index.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { teacherAPI } from '@/api/index.js';
import toast from 'react-hot-toast';

const localDateValue = (date = new Date()) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
};

const classIdentity = (liveClass) => String(liveClass?.classScheduleId?._id || liveClass?.classScheduleId || '');
const hostUrl = (liveClass) => liveClass?.startUrl || liveClass?.meetingLink || null;

const displayTime = (time) => {
  if (!time) return 'Time not set';
  const [hours, minutes] = time.split(':').map(Number);
  return `${((hours + 11) % 12) + 1}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
};

const dateTimeFor = (date, time) => new Date(`${date}T${time || '00:00'}:00`);

export default function TeacherLiveClassesPage() {
  const [selectedDate, setSelectedDate] = useState(localDateValue());
  const [schedule, setSchedule] = useState([]);
  const [liveClasses, setLiveClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState('');
  const [endingId, setEndingId] = useState('');
  const [endConfirmationId, setEndConfirmationId] = useState('');
  const [now, setNow] = useState(new Date());

  const loadClasses = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const [scheduleResponse, liveResponse] = await Promise.all([
        teacherAPI.getCalculatedSchedule({ date: selectedDate }),
        teacherAPI.getLiveClasses(),
      ]);
      setSchedule(scheduleResponse.data?.data || []);
      setLiveClasses(liveResponse.data?.data || []);
    } catch (error) {
      if (!quiet) toast.error(error.response?.data?.message || 'Could not load your classes. Please try again.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { loadClasses(); }, [loadClasses]);
  useEffect(() => {
    const refresh = window.setInterval(() => loadClasses({ quiet: true }), 30_000);
    return () => window.clearInterval(refresh);
  }, [loadClasses]);
  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(tick);
  }, []);

  const classes = useMemo(() => schedule.map((item) => ({
    ...item,
    liveClass: liveClasses.find((liveClass) => liveClass.status === 'ONGOING' && classIdentity(liveClass) === String(item._id)),
  })), [schedule, liveClasses]);

  const startClass = async (item) => {
    setStartingId(String(item._id));
    try {
      const response = await teacherAPI.createLiveClass({ classScheduleId: item._id, platform: 'zoom' });
      const liveClass = response.data?.data;
      toast.success('Class is live. Students can join now.');
      const url = hostUrl(liveClass);
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      await loadClasses({ quiet: true });
    } catch (error) {
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

  const rejoin = (liveClass) => {
    const url = hostUrl(liveClass);
    if (!url) return toast.error('The meeting link is not available. Contact an admin.');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const endClass = async (liveClass) => {
    setEndingId(String(liveClass._id));
    try {
      await teacherAPI.endLiveClass(liveClass._id);
      toast.success('Class ended. Attendance will now be synced.');
      setEndConfirmationId('');
      await loadClasses({ quiet: true });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not end the class.');
    } finally {
      setEndingId('');
    }
  };

  const isToday = selectedDate === localDateValue();

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="My live classes" subtitle="Start only the classes assigned to you. The admin manages the timetable and student access." breadcrumbs={['Home', 'Live Classes']} />

      <section className="rounded-2xl border border-primary-200 bg-primary-50/70 p-4 md:p-5 dark:border-primary-900/60 dark:bg-primary-950/20">
        <div className="flex gap-3">
          <div className="mt-0.5 rounded-xl bg-primary-600 p-2 text-white"><Video size={18} aria-hidden="true" /></div>
          <div><h2 className="font-bold text-surface-900 dark:text-white">How live classes work</h2><p className="mt-1 text-sm text-surface-600 dark:text-surface-300">1. Admin assigns batch, subject and time. 2. You start it at the scheduled time. 3. Students receive Join only after it is live. 4. End the class here after Zoom ends.</p></div>
        </div>
      </section>

      <Card className="p-4 md:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="flex items-center gap-2 text-lg font-bold text-surface-900 dark:text-white"><CalendarDays className="text-primary-600" size={20} /> My class schedule</h2><p className="mt-1 text-sm text-surface-500">Only classes assigned to you are shown.</p></div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-sm font-semibold text-surface-700 dark:text-surface-200" htmlFor="class-date">Date<input id="class-date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="h-10 rounded-xl border border-surface-200 bg-white px-3 text-sm font-normal text-surface-800 dark:border-surface-700 dark:bg-surface-900 dark:text-white" /></label>
            <Button type="button" variant="outline" size="sm" onClick={() => loadClasses()} loading={loading}><RefreshCw size={16} className="mr-1.5" /> Refresh</Button>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          {loading ? <div className="rounded-2xl border border-surface-200 p-8 text-center text-sm text-surface-500 dark:border-surface-700">Loading your assigned classes…</div> : classes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-surface-300 bg-surface-50 p-8 text-center dark:border-surface-700 dark:bg-surface-900/50"><CalendarDays className="mx-auto text-surface-400" size={24} aria-hidden="true" /><h3 className="mt-3 font-semibold text-surface-800 dark:text-white">No class assigned for this date</h3><p className="mt-1 text-sm text-surface-500">Ask an admin to add you to a batch timetable if this looks incorrect.</p></div>
          ) : classes.map((item) => {
            const liveClass = item.liveClass;
            const startsAt = dateTimeFor(selectedDate, item.startTime);
            const endsAt = dateTimeFor(selectedDate, item.endTime);
            const beforeStart = !liveClass && (!isToday || now < startsAt);
            const afterEnd = !liveClass && isToday && now > endsAt;
            const status = liveClass ? 'LIVE NOW' : afterEnd ? 'WINDOW ENDED' : beforeStart ? 'SCHEDULED' : 'READY TO START';
            const tone = liveClass ? 'border-success-200 bg-success-50/70 dark:border-success-900/50 dark:bg-success-950/20' : afterEnd ? 'border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-900/50' : 'border-primary-200 bg-white dark:border-primary-900/50 dark:bg-surface-900';

            return <article key={item._id} className={`rounded-2xl border p-4 md:p-5 ${tone}`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${liveClass ? 'bg-success-600 text-white' : afterEnd ? 'bg-surface-200 text-surface-600 dark:bg-surface-800 dark:text-surface-300' : 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-200'}`}>{status}</span>{item.isRescheduled && <span className="rounded-full bg-warning-100 px-2.5 py-1 text-xs font-bold text-warning-800">RESCHEDULED</span>}</div><h3 className="mt-3 text-lg font-bold text-surface-900 dark:text-white">{item.subjectId?.name || 'Subject not set'}</h3><p className="mt-1 text-sm text-surface-600 dark:text-surface-300">{item.batchId?.name || 'Batch'}{item.batchId?.section ? ` · Section ${item.batchId.section}` : ''}</p><p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-surface-700 dark:text-surface-200"><Clock3 size={16} aria-hidden="true" /> {displayTime(item.startTime)} – {displayTime(item.endTime)}</p>{beforeStart && <p className="mt-2 text-sm text-surface-500">Start opens at {displayTime(item.startTime)} on the selected date.</p>}{afterEnd && <p className="mt-2 text-sm text-surface-500">The scheduled class window has ended. Contact the admin to reschedule if needed.</p>}</div>
                <div className="flex min-w-[220px] flex-col gap-2">
                  {liveClass ? <>{<Button type="button" variant="success" onClick={() => rejoin(liveClass)}><ExternalLink size={17} className="mr-2" /> Rejoin Zoom class</Button>}{endConfirmationId === String(liveClass._id) ? <div className="rounded-xl border border-danger-200 bg-danger-50 p-3 text-sm text-danger-800"><p className="font-semibold">End this class for everyone?</p><div className="mt-2 flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setEndConfirmationId('')}>Keep live</Button><Button type="button" size="sm" variant="danger" loading={endingId === String(liveClass._id)} onClick={() => endClass(liveClass)}>End class</Button></div></div> : <Button type="button" variant="danger" onClick={() => setEndConfirmationId(String(liveClass._id))}><StopCircle size={17} className="mr-2" /> End class</Button>}</> : afterEnd ? <div className="flex items-center gap-2 rounded-xl bg-surface-100 px-3 py-2.5 text-sm font-medium text-surface-600 dark:bg-surface-800 dark:text-surface-300"><CheckCircle2 size={17} aria-hidden="true" /> No live session open</div> : <Button type="button" variant="primary" disabled={beforeStart} loading={startingId === String(item._id)} onClick={() => startClass(item)}><Play size={17} className="mr-2" /> {beforeStart ? 'Starts at scheduled time' : 'Start Zoom class'}</Button>}
                </div>
              </div>
            </article>;
          })}
        </div>
      </Card>
      <p className="flex items-start gap-2 text-xs text-surface-500"><AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> Starting a class makes it visible to enrolled students immediately. Ending it closes student join access and begins attendance sync.</p>
    </div>
  );
}
