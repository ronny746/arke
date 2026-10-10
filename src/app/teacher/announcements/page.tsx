"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { BellRing, CheckCircle2, Megaphone, Send, Users, AlertCircle, Info, Sparkles, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/index.jsx';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/index.jsx';
import { teacherAPI } from '@/api/teacher';

type UserOption = { _id: string; firstName: string; lastName?: string; rollNo?: string };
type BatchOption = { _id: string; name: string; section?: string; students?: unknown[] };
type Audience = 'batch_students' | 'batch_families' | 'student';

const audienceLabels: Record<Audience, string> = {
  batch_students: 'Assigned Batch — Students',
  batch_families: 'Assigned Batch — Students & Parents',
  student: 'Specific Student'
};

export default function TeacherAnnouncementsPage() {
  const [audience, setAudience] = useState<Audience>('batch_students');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('INFO');
  const [batchId, setBatchId] = useState('');
  const [userId, setUserId] = useState('');
  const [students, setStudents] = useState<UserOption[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [batchRes, dashboardRes] = await Promise.all([
        teacherAPI.getViewBatches().catch(() => ({ data: { data: [] } })),
        teacherAPI.getDashboard().catch(() => ({ data: { data: {} } })),
      ]);
      const fetchedBatches = batchRes.data?.data || [];
      setBatches(fetchedBatches);
      if (fetchedBatches.length > 0 && !batchId) {
        setBatchId(fetchedBatches[0]._id);
      }

      // Collect assigned students
      const assignedStudents = dashboardRes.data?.data?.assignedStudents || [];
      setStudents(assignedStudents);
    } catch {
      toast.error('Could not load assigned batches.');
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const needsBatch = audience === 'batch_students' || audience === 'batch_families';
  const needsUser = audience === 'student';

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (title.trim().length < 3 || message.trim().length < 3) {
      return setError('Please enter a title and message of at least 3 characters.');
    }
    if (needsBatch && !batchId) {
      return setError('Please select a batch.');
    }
    if (needsUser && !userId) {
      return setError('Please select a student.');
    }

    setSending(true);
    try {
      const payload: any = {
        audience,
        title: title.trim(),
        message: message.trim(),
        type,
        ...(needsBatch ? { batchId } : {}),
        ...(needsUser ? { userId } : {})
      };

      const response = await teacherAPI.broadcastNotification(payload);
      toast.success(response.data?.message || 'Announcement broadcasted successfully!');
      setTitle('');
      setMessage('');
      if (batches.length > 0) setBatchId(batches[0]._id);
      setUserId('');
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Announcement could not be sent.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in pb-10">
      <PageHeader 
        title="Class Announcements" 
        subtitle="Broadcast announcements, updates, and homework reminders directly to your assigned batches and students." 
        breadcrumbs={['Home', 'Announcements']}
      />

      {/* Info Banner */}
      <section className="grid gap-5 md:grid-cols-[1fr_auto] rounded-2xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="flex gap-3.5">
          <div className="h-fit rounded-xl bg-amber-100 dark:bg-amber-900/50 p-3 text-amber-700 dark:text-amber-300 shrink-0">
            <Megaphone size={22} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white text-sm md:text-base">Instant Multi-Channel Delivery</h2>
            <p className="mt-1 text-xs md:text-sm text-gray-600 dark:text-gray-300">
              Announcements instantly notify students in their in-app inbox, trigger a realtime dashboard toast, and send mobile push notifications to registered devices.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 size={18} /> Active Delivery
        </div>
      </section>

      {/* Form Card */}
      <Card className="p-5 md:p-7 shadow-sm">
        <div className="flex items-start gap-3.5 border-b border-surface-100 dark:border-surface-800 pb-4">
          <div className="rounded-xl bg-[#ecfdf5] dark:bg-emerald-950/40 p-3 text-[#1a7a35] shrink-0">
            <BellRing size={22} />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold text-surface-900 dark:text-white">
              Create Class Announcement
            </h2>
            <p className="mt-0.5 text-xs text-surface-500">
              Only learners enrolled in your assigned batches are eligible recipients.
            </p>
          </div>
        </div>

        <form className="mt-6 grid gap-5 md:grid-cols-2" noValidate onSubmit={submit}>
          {/* Target Audience */}
          <div>
            <label className="block text-xs font-bold text-surface-700 dark:text-surface-300 mb-1.5">
              Recipient Audience
            </label>
            <select
              className="w-full p-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1a7a35]"
              value={audience}
              onChange={(e) => {
                setAudience(e.target.value as Audience);
                setUserId('');
              }}
            >
              {Object.entries(audienceLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Style */}
          <div>
            <label className="block text-xs font-bold text-surface-700 dark:text-surface-300 mb-1.5">
              Notification Style
            </label>
            <select
              className="w-full p-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1a7a35]"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="INFO">Information (Standard)</option>
              <option value="SUCCESS">Positive Update / Milestone</option>
              <option value="ALERT">Urgent Alert / Schedule Change</option>
            </select>
          </div>

          {/* Batch Selector */}
          {needsBatch && (
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Target Assigned Batch
              </label>
              <select
                className="w-full p-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1a7a35]"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                disabled={loading}
              >
                <option value="">Select a batch</option>
                {batches.map((batch) => (
                  <option key={batch._id} value={batch._id}>
                    {batch.name}{batch.section ? ` · Section ${batch.section}` : ''}{batch.students ? ` (${(batch.students || []).length} students)` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Student Selector */}
          {needsUser && (
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Select Student
              </label>
              <select
                className="w-full p-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1a7a35]"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={loading}
              >
                <option value="">Select recipient student</option>
                {students.map((person) => (
                  <option key={person._id} value={person._id}>
                    {[person.firstName, person.lastName].filter(Boolean).join(' ')}{person.rollNo ? ` · Roll: ${person.rollNo}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-surface-700 dark:text-surface-300">
                Announcement Title
              </label>
              <span className="text-[10px] text-surface-400">{title.length} / 100</span>
            </div>
            <input
              className="w-full p-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1a7a35]"
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Extra class tomorrow morning at 09:00 AM"
              required
            />
          </div>

          {/* Message */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-surface-700 dark:text-surface-300">
                Announcement Message
              </label>
              <span className="text-[10px] text-surface-400">{message.length} / 1000</span>
            </div>
            <textarea
              className="w-full p-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-[#1a7a35] min-h-32 resize-none"
              maxLength={1000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write the message details here..."
              required
            />
          </div>

          {error && (
            <div className="md:col-span-2 flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/40 p-3 rounded-xl border border-red-200">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-surface-100 dark:border-surface-800">
            <p className="text-xs text-surface-500 flex items-center gap-1.5">
              <Users size={14} className="text-[#1a7a35]" />
              Targeting: <span className="font-bold text-surface-700 dark:text-surface-200">{audienceLabels[audience]}</span>
            </p>
            <Button type="submit" variant="primary" loading={sending} className="font-bold shadow-sm">
              <Send size={15} className="mr-1.5" /> Broadcast Announcement
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
