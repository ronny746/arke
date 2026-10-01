"use client";

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, CircleX, Clock3, GraduationCap, UsersRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/index.jsx';
import { parentAPI } from '@/api/parent';

type AttendanceRecord = { studentId?: { _id?: string; firstName?: string; lastName?: string }; status?: string; joinedAt?: string; joinEvents?: { joinedAt?: string; leftAt?: string }[] };
type Register = { _id: string; date: string; batchId?: { name?: string; section?: string; courseId?: { name?: string } }; subjectId?: { name?: string }; teacherId?: { firstName?: string; lastName?: string }; records?: AttendanceRecord[] };

const formatTime = (value?: string) => value ? new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date(value)) : '—';
const formatDate = (value: string) => new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(value));
const statusClass: Record<string, string> = { present: 'bg-emerald-50 text-emerald-700 ring-emerald-100', late: 'bg-amber-50 text-amber-800 ring-amber-100', absent: 'bg-rose-50 text-rose-700 ring-rose-100', leave: 'bg-sky-50 text-sky-700 ring-sky-100' };

export default function ParentAttendancePage() {
  const [registers, setRegisters] = useState<Register[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentFilter, setStudentFilter] = useState('all');

  useEffect(() => {
    let active = true;
    parentAPI.getChildrenAttendance({})
      .then(response => active && setRegisters(response.data?.data || response.data || []))
      .catch(() => active && toast.error('Child attendance could not be loaded.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const rows = useMemo(() => registers.flatMap(register => (register.records || []).map(record => ({ ...register, record }))).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [registers]);
  const children = useMemo(() => Array.from(new Map(rows.map(row => [row.record.studentId?._id, `${row.record.studentId?.firstName || ''} ${row.record.studentId?.lastName || ''}`.trim() || 'Linked child'])).entries()).filter(([id]) => id), [rows]);
  const filtered = studentFilter === 'all' ? rows : rows.filter(row => row.record.studentId?._id === studentFilter);
  const stats = useMemo(() => filtered.reduce((summary, row) => ({ total: summary.total + 1, present: summary.present + Number(row.record.status === 'present'), late: summary.late + Number(row.record.status === 'late'), absent: summary.absent + Number(row.record.status === 'absent') }), { total: 0, present: 0, late: 0, absent: 0 }), [filtered]);

  return <div className="mx-auto max-w-7xl space-y-6">
    <PageHeader title="Child attendance" subtitle="Review each class record, including course, subject, teacher, late arrival and class activity." />
    <section className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><UsersRound className="text-brand-600" /><div><p className="font-semibold text-surface-900">Linked child</p><p className="text-sm text-surface-500">Choose a child to focus the class register.</p></div></div><label className="sr-only" htmlFor="parent-attendance-child">Choose child</label><select id="parent-attendance-child" value={studentFilter} onChange={event => setStudentFilter(event.target.value)} className="rounded-xl border border-surface-200 bg-white px-3 py-2 text-sm font-medium text-surface-800 focus:border-brand-600 focus:outline-none"><option value="all">All linked children</option>{children.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Attendance summary">
      <article className="card p-5"><p className="text-sm text-surface-500">Class records</p><p className="mt-1 text-3xl font-display font-semibold">{stats.total}</p><p className="mt-1 text-xs text-surface-400">Across the selected child</p></article>
      <article className="card p-5"><div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 size={18} /><p className="text-sm font-medium">Present</p></div><p className="mt-2 text-3xl font-display font-semibold">{stats.present}</p></article>
      <article className="card p-5"><div className="flex items-center gap-2 text-amber-700"><Clock3 size={18} /><p className="text-sm font-medium">Late</p></div><p className="mt-2 text-3xl font-display font-semibold">{stats.late}</p><p className="mt-1 text-xs text-surface-400">Late class arrival</p></article>
      <article className="card p-5"><div className="flex items-center gap-2 text-rose-700"><CircleX size={18} /><p className="text-sm font-medium">Absent</p></div><p className="mt-2 text-3xl font-display font-semibold">{stats.absent}</p><p className="mt-1 text-xs text-surface-400">Includes joins after the 10-minute grace period</p></article>
    </section>
    <section className="card overflow-hidden"><div className="flex items-start gap-3 border-b border-surface-100 p-6"><GraduationCap className="mt-0.5 text-brand-600" size={22} /><div><h2 className="font-display text-lg font-semibold">Class attendance record</h2><p className="mt-1 text-sm text-surface-500">Late and absent events generate a parent notification and remain in this register.</p></div></div>{loading ? <p className="p-10 text-center text-surface-500">Loading attendance…</p> : filtered.length ? <div className="table-wrapper"><table className="data-table min-w-[980px]"><thead><tr><th>Date</th><th>Child</th><th>Course / batch</th><th>Subject</th><th>Teacher</th><th>Status</th><th>First join</th><th>Class activity</th></tr></thead><tbody>{filtered.map((row, index) => <tr key={`${row._id}-${index}`}><td className="whitespace-nowrap font-medium">{formatDate(row.date)}</td><td>{row.record.studentId?.firstName} {row.record.studentId?.lastName}</td><td><p>{row.batchId?.courseId?.name || 'Course not assigned'}</p><p className="text-xs text-surface-500">{[row.batchId?.name, row.batchId?.section ? `Section ${row.batchId.section}` : ''].filter(Boolean).join(' · ') || '—'}</p></td><td>{row.subjectId?.name || 'General class'}</td><td>{[row.teacherId?.firstName, row.teacherId?.lastName].filter(Boolean).join(' ') || 'Teacher not assigned'}</td><td><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${statusClass[row.record.status || 'absent']}`}>{row.record.status || 'absent'}</span></td><td className="whitespace-nowrap">{formatTime(row.record.joinedAt)}</td><td className="text-sm text-surface-600">{row.record.joinEvents?.length ? row.record.joinEvents.map((event, eventIndex) => <span key={eventIndex} className="mr-2 inline-block whitespace-nowrap">Join {formatTime(event.joinedAt)}{event.leftAt ? ` → left ${formatTime(event.leftAt)}` : ''}</span>) : 'No join activity recorded'}</td></tr>)}</tbody></table></div> : <div className="p-12 text-center"><CalendarDays className="mx-auto mb-3 text-surface-300" size={32} /><p className="font-medium text-surface-700">No class attendance record yet</p><p className="mt-1 text-sm text-surface-500">Attendance will appear when the linked child joins an eligible live class or is marked by the teacher.</p></div>}</section>
  </div>;
}
