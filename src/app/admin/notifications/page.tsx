"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { BellRing, CheckCircle2, Megaphone, Send, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/index.jsx';
import { Button } from '@/components/ui/Button';
import { adminAPI } from '@/api/admin';

type UserOption = { _id: string; firstName: string; lastName?: string; phone?: string };
type BatchOption = { _id: string; name: string; students?: unknown[] };
type Audience = 'all_students' | 'all_parents' | 'batch_students' | 'batch_families' | 'student' | 'parent';

const audienceLabels: Record<Audience, string> = {
  all_students: 'All students', all_parents: 'All parents', batch_students: 'One batch — students', batch_families: 'One batch — students and parents', student: 'One student', parent: 'One parent'
};

export default function AdminNotificationsPage() {
  const [audience, setAudience] = useState<Audience>('all_students');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('INFO');
  const [batchId, setBatchId] = useState('');
  const [userId, setUserId] = useState('');
  const [students, setStudents] = useState<UserOption[]>([]);
  const [parents, setParents] = useState<UserOption[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [studentResponse, parentResponse, batchResponse] = await Promise.all([
        adminAPI.getUsers({ role: 'student' }), adminAPI.getUsers({ role: 'parent' }), adminAPI.getBatches()
      ]);
      setStudents(studentResponse.data?.data || []);
      setParents(parentResponse.data?.data || []);
      setBatches(batchResponse.data?.data || []);
    } catch { toast.error('Could not load notification recipients.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const needsBatch = audience === 'batch_students' || audience === 'batch_families';
  const needsUser = audience === 'student' || audience === 'parent';
  const people = useMemo(() => audience === 'parent' ? parents : students, [audience, parents, students]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (title.trim().length < 3 || message.trim().length < 3) return setError('Enter a title and message of at least 3 characters.');
    if (needsBatch && !batchId) return setError('Select a batch.');
    if (needsUser && !userId) return setError(`Select a ${audience}.`);
    setSending(true);
    try {
      const response = await adminAPI.broadcastNotification({ audience, title: title.trim(), message: message.trim(), type, ...(needsBatch ? { batchId } : {}), ...(needsUser ? { userId } : {}) });
      toast.success(response.data?.message || 'Announcement sent.');
      setTitle(''); setMessage(''); setBatchId(''); setUserId('');
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Announcement could not be sent.');
    } finally { setSending(false); }
  };

  return <div className="mx-auto max-w-5xl space-y-6"><PageHeader title="Announcements" subtitle="Send an immediate in-app and mobile push notification to the exact learner audience." />
    <section className="grid gap-5 md:grid-cols-[1fr_auto] card p-5"><div className="flex gap-3"><div className="h-fit rounded-xl bg-amber-50 p-3 text-[#C99A2E]"><Megaphone size={22} /></div><div><p className="font-semibold text-[#0B132B]">Delivery channel</p><p className="mt-1 text-sm text-surface-500">Every send creates an inbox notification, emits a realtime update to open apps, and sends FCM push to opted-in Android/iOS devices.</p></div></div><div className="flex items-center gap-2 text-sm font-medium text-emerald-700"><CheckCircle2 size={18} />Persistent delivery</div></section>
    <section className="card p-6"><div className="flex items-start gap-3"><div className="rounded-xl bg-blue-50 p-3 text-blue-700"><BellRing size={21} /></div><div><h2 className="font-display text-lg font-semibold text-[#0B132B]">Create announcement</h2><p className="mt-1 text-sm text-surface-500">Target selection is checked on the server before any notification is sent.</p></div></div>
      <form className="mt-6 grid gap-4 md:grid-cols-2" noValidate onSubmit={submit}>
        <label><span className="form-label">Audience</span><select className="form-input" value={audience} onChange={e => { setAudience(e.target.value as Audience); setBatchId(''); setUserId(''); }}>{Object.entries(audienceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span className="form-label">Notification style</span><select className="form-input" value={type} onChange={e => setType(e.target.value)}><option value="INFO">Information</option><option value="SUCCESS">Success</option><option value="ALERT">Urgent alert</option></select></label>
        {needsBatch && <label className="md:col-span-2"><span className="form-label">Batch</span><select className="form-input" value={batchId} onChange={e => setBatchId(e.target.value)} disabled={loading}><option value="">Select batch</option>{batches.map(batch => <option key={batch._id} value={batch._id}>{batch.name}{batch.students ? ` (${batch.students.length} students)` : ''}</option>)}</select></label>}
        {needsUser && <label className="md:col-span-2"><span className="form-label">{audience === 'parent' ? 'Parent' : 'Student'}</span><select className="form-input" value={userId} onChange={e => setUserId(e.target.value)} disabled={loading}><option value="">Select recipient</option>{people.map(person => <option key={person._id} value={person._id}>{[person.firstName, person.lastName].filter(Boolean).join(' ')}{person.phone ? ` · ${person.phone}` : ''}</option>)}</select></label>}
        <label className="md:col-span-2"><span className="form-label">Title</span><input className="form-input" maxLength={100} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Tomorrow's class timing" required /></label>
        <label className="md:col-span-2"><span className="form-label">Message</span><textarea className="form-input min-h-28 resize-none" maxLength={1000} value={message} onChange={e => setMessage(e.target.value)} placeholder="Write the exact update students and parents should receive." required /></label>
        {error && <p role="alert" className="md:col-span-2 text-sm text-red-600">{error}</p>}
        <div className="md:col-span-2 flex items-center justify-between gap-4"><p className="text-xs text-surface-500"><Users className="mr-1 inline" size={14} />{audienceLabels[audience]}</p><Button type="submit" icon={Send} loading={sending}>Send announcement</Button></div>
      </form>
    </section>
  </div>;
}
