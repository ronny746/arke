"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Link as LinkIcon, Plus, UsersRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/index.jsx';
import { Button } from '@/components/ui/Button';
import { adminAPI } from '@/api/admin';

type Mentor = { _id: string; name: string; email?: string; phone?: string };
type Target = { _id: string; name: string; courseId?: string | { _id: string; name: string } };
type MentorSession = { _id: string; startAt: string; endAt: string; status: string; meetingLink?: string; mentorId?: Mentor; batchId?: { name: string } | null; courseId?: { name: string } | null };

const initialMentor = { name: '', email: '', phone: '' };
const initialSession = { mentorId: '', audience: 'course', audienceId: '', startAt: '', meetingLink: '' };
const responseData = (response: { data?: { data?: unknown } }) => response.data?.data;

function inThirtyMinutes(startAt: string) {
  const start = new Date(startAt);
  return Number.isNaN(start.getTime()) ? '' : new Date(start.getTime() + 30 * 60 * 1000).toISOString();
}

export default function MentorSessionsPage() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [courses, setCourses] = useState<Target[]>([]);
  const [batches, setBatches] = useState<Target[]>([]);
  const [sessions, setSessions] = useState<MentorSession[]>([]);
  const [mentorForm, setMentorForm] = useState(initialMentor);
  const [sessionForm, setSessionForm] = useState(initialSession);
  const [loading, setLoading] = useState(true);
  const [savingMentor, setSavingMentor] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [mentorError, setMentorError] = useState('');
  const [sessionError, setSessionError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mentorResponse, courseResponse, batchResponse, sessionResponse] = await Promise.all([
        adminAPI.getMentors(), adminAPI.getCourses(), adminAPI.getBatches(), adminAPI.getMentorSessions()
      ]);
      setMentors((responseData(mentorResponse) as Mentor[]) || []);
      setCourses((responseData(courseResponse) as Target[]) || []);
      setBatches((responseData(batchResponse) as Target[]) || []);
      setSessions((responseData(sessionResponse) as MentorSession[]) || []);
    } catch {
      toast.error('Could not load mentor session data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const targets = useMemo(() => sessionForm.audience === 'course' ? courses : batches, [sessionForm.audience, courses, batches]);

  const createMentor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMentorError('');
    if (!mentorForm.name.trim()) return setMentorError('Mentor name is required.');
    setSavingMentor(true);
    try {
      await adminAPI.createMentors([{ ...mentorForm, name: mentorForm.name.trim() }]);
      toast.success('Mentor added.');
      setMentorForm(initialMentor);
      await load();
    } catch (error: unknown) {
      setMentorError(error instanceof Error ? error.message : 'Could not add mentor.');
    } finally { setSavingMentor(false); }
  };

  const schedule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSessionError('');
    if (!sessionForm.mentorId || !sessionForm.audienceId || !sessionForm.startAt) return setSessionError('Choose a mentor, audience, and start time.');
    const endAt = inThirtyMinutes(sessionForm.startAt);
    if (!endAt) return setSessionError('Enter a valid start time.');
    setSavingSession(true);
    try {
      await adminAPI.scheduleMentorSession({
        mentorId: sessionForm.mentorId,
        [sessionForm.audience === 'course' ? 'courseId' : 'batchId']: sessionForm.audienceId,
        startAt: new Date(sessionForm.startAt).toISOString(),
        endAt,
        meetingLink: sessionForm.meetingLink.trim()
      });
      toast.success('Mentor session scheduled and students notified.');
      setSessionForm(initialSession);
      await load();
    } catch (error: unknown) {
      setSessionError(error instanceof Error ? error.message : 'Could not schedule mentor session.');
    } finally { setSavingSession(false); }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Mentor sessions" subtitle="Bring alumni and experts into a course or an individual batch, with one notification flow for enrolled students." />
      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <section className="card p-6">
          <div className="flex items-start gap-3"><div className="rounded-xl bg-amber-50 p-3 text-[#C99A2E]"><UsersRound size={21} /></div><div><h2 className="font-display text-lg font-semibold text-[#0B132B]">Mentor directory</h2><p className="mt-1 text-sm text-surface-500">Add a former student, counsellor, or subject expert before scheduling.</p></div></div>
          <form className="mt-6 space-y-4" noValidate onSubmit={createMentor}>
            <label><span className="form-label">Full name</span><input className="form-input" value={mentorForm.name} onChange={e => setMentorForm(v => ({ ...v, name: e.target.value }))} required /></label>
            <label><span className="form-label">Email <span className="text-surface-400">(optional)</span></span><input className="form-input" type="email" value={mentorForm.email} onChange={e => setMentorForm(v => ({ ...v, email: e.target.value }))} /></label>
            <label><span className="form-label">Phone <span className="text-surface-400">(optional)</span></span><input className="form-input" inputMode="tel" value={mentorForm.phone} onChange={e => setMentorForm(v => ({ ...v, phone: e.target.value }))} /></label>
            {mentorError && <p role="alert" className="text-sm text-red-600">{mentorError}</p>}
            <Button type="submit" icon={Plus} loading={savingMentor}>Add mentor</Button>
          </form>
          <div className="mt-7 border-t pt-5"><p className="text-xs font-semibold uppercase tracking-wide text-surface-500">Available mentors ({mentors.length})</p><div className="mt-3 space-y-2">{mentors.length ? mentors.map(mentor => <div key={mentor._id} className="rounded-lg border border-surface-200 px-3 py-2"><p className="font-medium text-[#0B132B]">{mentor.name}</p><p className="text-xs text-surface-500">{mentor.email || mentor.phone || 'No contact detail'}</p></div>) : <p className="text-sm text-surface-500">No mentors added yet.</p>}</div></div>
        </section>

        <section className="card p-6">
          <div className="flex items-start gap-3"><div className="rounded-xl bg-blue-50 p-3 text-blue-700"><CalendarClock size={21} /></div><div><h2 className="font-display text-lg font-semibold text-[#0B132B]">Schedule a 30-minute session</h2><p className="mt-1 text-sm text-surface-500">Course selection notifies every student enrolled across its active batches; batch selection notifies only that batch.</p></div></div>
          <form className="mt-6 grid gap-4 md:grid-cols-2" noValidate onSubmit={schedule}>
            <label><span className="form-label">Mentor</span><select className="form-input" value={sessionForm.mentorId} onChange={e => setSessionForm(v => ({ ...v, mentorId: e.target.value }))} required><option value="">Select mentor</option>{mentors.map(mentor => <option key={mentor._id} value={mentor._id}>{mentor.name}</option>)}</select></label>
            <label><span className="form-label">Audience</span><select className="form-input" value={sessionForm.audience} onChange={e => setSessionForm(v => ({ ...v, audience: e.target.value, audienceId: '' }))}><option value="course">Entire course</option><option value="batch">One batch</option></select></label>
            <label><span className="form-label">{sessionForm.audience === 'course' ? 'Course' : 'Batch'}</span><select className="form-input" value={sessionForm.audienceId} onChange={e => setSessionForm(v => ({ ...v, audienceId: e.target.value }))} required><option value="">Select {sessionForm.audience}</option>{targets.map(target => <option key={target._id} value={target._id}>{target.name}</option>)}</select></label>
            <label><span className="form-label">Start (IST)</span><input className="form-input" type="datetime-local" value={sessionForm.startAt} onChange={e => setSessionForm(v => ({ ...v, startAt: e.target.value }))} required /></label>
            <label className="md:col-span-2"><span className="form-label">Meeting link <span className="text-surface-400">(optional)</span></span><div className="relative"><LinkIcon className="absolute left-3 top-3 text-surface-400" size={16} /><input className="form-input pl-10" type="url" placeholder="https://…" value={sessionForm.meetingLink} onChange={e => setSessionForm(v => ({ ...v, meetingLink: e.target.value }))} /></div></label>
            <div className="md:col-span-2 rounded-lg bg-surface-50 p-3 text-sm text-surface-600">Duration is fixed at <strong>30 minutes</strong>. The server prevents mentor time conflicts and sends students an in-app notification immediately.</div>
            {sessionError && <p role="alert" className="md:col-span-2 text-sm text-red-600">{sessionError}</p>}
            <div className="md:col-span-2"><Button type="submit" icon={CalendarClock} loading={savingSession}>Schedule & notify students</Button></div>
          </form>
        </section>
      </div>

      <section className="card overflow-hidden"><div className="p-5"><h2 className="font-display text-lg font-semibold text-[#0B132B]">Upcoming and past sessions</h2></div><div className="table-wrapper border-x-0 border-b-0 rounded-none"><table className="data-table"><thead><tr><th>When</th><th>Mentor</th><th>Audience</th><th>Meeting</th><th>Status</th></tr></thead><tbody>{sessions.map(session => <tr key={session._id}><td>{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(session.startAt))}</td><td>{session.mentorId?.name || 'Unknown mentor'}</td><td>{session.courseId?.name || session.batchId?.name || 'Unknown audience'}</td><td>{session.meetingLink ? <a className="text-blue-700 underline" href={session.meetingLink} target="_blank" rel="noreferrer">Open link</a> : 'To be shared'}</td><td><span className="badge badge-surface">{session.status}</span></td></tr>)}{!loading && !sessions.length && <tr><td colSpan={5} className="py-12 text-center text-sm text-surface-500">No mentor sessions have been scheduled yet.</td></tr>}{loading && <tr><td colSpan={5} className="py-12 text-center text-sm text-surface-500">Loading sessions…</td></tr>}</tbody></table></div></section>
    </div>
  );
}
