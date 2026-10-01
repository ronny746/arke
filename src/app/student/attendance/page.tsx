"use client";

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, CircleX, Clock3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/index.jsx';
import { studentAPI } from '@/api/student';

type AttendanceRecord = {
  status?: 'present' | 'absent' | 'late' | 'leave';
  joinedAt?: string;
  joinEvents?: { joinedAt?: string; leftAt?: string }[];
};

type AttendanceRegister = {
  _id: string;
  date: string;
  batchId?: { name?: string; section?: string };
  subjectId?: { name?: string };
  records?: AttendanceRecord[];
};

const time = (value?: string) => value
  ? new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date(value))
  : '—';

const date = (value: string) => new Intl.DateTimeFormat('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata'
}).format(new Date(value));

const statusStyle: Record<string, string> = {
  present: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  late: 'bg-amber-50 text-amber-700 ring-amber-100',
  absent: 'bg-rose-50 text-rose-700 ring-rose-100',
  leave: 'bg-sky-50 text-sky-700 ring-sky-100'
};

export default function StudentAttendancePage() {
  const [registers, setRegisters] = useState<AttendanceRegister[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    studentAPI.getAttendance({})
      .then(response => {
        if (!alive) return;
        setRegisters(response.data?.data || response.data || []);
      })
      .catch(() => alive && toast.error('Attendance could not be loaded. Please try again.'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const rows = useMemo(() => registers.flatMap(register =>
    (register.records || []).map(record => ({ ...register, record }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [registers]);

  const stats = useMemo(() => rows.reduce((summary, row) => {
    summary.total += 1;
    if (row.record.status === 'present') summary.present += 1;
    if (row.record.status === 'late') summary.late += 1;
    if (row.record.status === 'absent') summary.absent += 1;
    return summary;
  }, { total: 0, present: 0, late: 0, absent: 0 }), [rows]);

  const rate = stats.total ? Math.round((stats.present / stats.total) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="My attendance" subtitle="Your class attendance is recorded when you join a live class." />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Attendance summary">
        <article className="card p-5"><p className="text-sm text-surface-500">Attendance rate</p><p className="mt-1 text-3xl font-display font-semibold text-brand-700">{rate}%</p><p className="mt-1 text-xs text-surface-400">Present in {stats.present} of {stats.total} records</p></article>
        <article className="card p-5"><div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 size={18} /><p className="text-sm font-medium">Present</p></div><p className="mt-2 text-3xl font-display font-semibold">{stats.present}</p><p className="mt-1 text-xs text-surface-400">Joined within the grace period</p></article>
        <article className="card p-5"><div className="flex items-center gap-2 text-amber-700"><Clock3 size={18} /><p className="text-sm font-medium">Late</p></div><p className="mt-2 text-3xl font-display font-semibold">{stats.late}</p><p className="mt-1 text-xs text-surface-400">Recorded as late by the teacher</p></article>
        <article className="card p-5"><div className="flex items-center gap-2 text-rose-700"><CircleX size={18} /><p className="text-sm font-medium">Absent</p></div><p className="mt-2 text-3xl font-display font-semibold">{stats.absent}</p><p className="mt-1 text-xs text-surface-400">Late live joins after 10 minutes are absent</p></article>
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-start gap-3 border-b border-surface-100 p-6">
          <CalendarDays className="mt-0.5 text-brand-600" size={22} />
          <div><h2 className="font-display text-lg font-semibold text-surface-900">Class attendance register</h2><p className="mt-1 text-sm text-surface-500">Each row is a class you attended or were marked for. Join and leave times appear when the class provider reports them.</p></div>
        </div>
        {loading ? <div className="p-10 text-center text-surface-500">Loading your attendance…</div> : rows.length ? (
          <div className="table-wrapper">
            <table className="data-table min-w-[760px]">
              <thead><tr><th>Date</th><th>Class</th><th>Batch</th><th>Status</th><th>First join</th><th>Class activity</th></tr></thead>
              <tbody>{rows.map((row, index) => {
                const events = row.record.joinEvents || [];
                return <tr key={`${row._id}-${index}`}>
                  <td className="whitespace-nowrap font-medium">{date(row.date)}</td>
                  <td>{row.subjectId?.name || 'General class'}</td>
                  <td>{[row.batchId?.name, row.batchId?.section ? `Section ${row.batchId.section}` : ''].filter(Boolean).join(' · ') || '—'}</td>
                  <td><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${statusStyle[row.record.status || 'absent']}`}>{row.record.status || 'absent'}</span></td>
                  <td className="whitespace-nowrap">{time(row.record.joinedAt)}</td>
                  <td className="max-w-xs text-sm text-surface-600">{events.length ? events.map((event, eventIndex) => <span key={eventIndex} className="mr-2 inline-block whitespace-nowrap">Join {time(event.joinedAt)}{event.leftAt ? ` → left ${time(event.leftAt)}` : ''}</span>) : 'No join activity recorded'}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        ) : <div className="p-12 text-center"><p className="font-medium text-surface-700">No attendance recorded yet</p><p className="mt-1 text-sm text-surface-500">Your attendance will appear here after you join an eligible live class or your teacher marks the register.</p></div>}
      </section>
    </div>
  );
}
