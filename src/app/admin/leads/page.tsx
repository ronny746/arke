"use client";

import { useCallback, useEffect, useState } from 'react';
import { Clock3, GraduationCap, Mail, Phone, RefreshCw, UserRoundSearch } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/index.jsx';
import { Button } from '@/components/ui/Button';
import { adminAPI } from '@/api/admin';

type BehaviourLead = {
  _id: string;
  displayName: string;
  email?: string;
  phone?: string;
  lastLoginAt?: string;
  createdAt?: string;
  metadata?: { targetExam?: string; class?: string };
};

const formatDate = (date?: string) => date ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date)) : 'Not available';

export default function LeadsPage() {
  const [leads, setLeads] = useState<BehaviourLead[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getLoggedInWithoutCourseLeads();
      setLeads(response.data?.data || []);
    } catch {
      toast.error('Could not load behavioural leads. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Leads" subtitle="Students who signed in but are not enrolled in any course yet." />
      <section className="grid gap-4 md:grid-cols-[1fr_auto] card p-5">
        <div className="flex gap-3">
          <div className="mt-0.5 rounded-xl bg-amber-50 p-3 text-[#C99A2E]"><UserRoundSearch size={22} /></div>
          <div>
            <p className="text-sm font-semibold text-[#0B132B]">Intent-based follow-up queue</p>
            <p className="mt-1 max-w-2xl text-sm text-surface-500">Only active student accounts with a successful sign-in are shown. The lead disappears automatically after the student is assigned to a course batch.</p>
          </div>
        </div>
        <div className="self-center rounded-lg bg-[#0B132B] px-4 py-3 text-center text-white">
          <p className="text-2xl font-bold">{loading ? '—' : leads.length}</p><p className="text-xs text-white/70">Awaiting enrollment</p>
        </div>
      </section>
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between gap-4 p-5">
          <div><h2 className="font-display text-lg font-semibold text-[#0B132B]">Logged in, no course</h2><p className="mt-1 text-sm text-surface-500">Use the contact details to help the student select and enroll in the right course.</p></div>
          <Button variant="outline" size="sm" icon={RefreshCw} loading={loading} onClick={() => void load()}>Refresh</Button>
        </div>
        <div className="table-wrapper border-x-0 border-b-0 rounded-none">
          <table className="data-table">
            <thead><tr><th>Student</th><th>Goal / class</th><th>Contact</th><th>Last sign-in</th><th>State</th></tr></thead>
            <tbody>
              {leads.map(lead => <tr key={lead._id}>
                <td><div className="font-semibold text-[#0B132B]">{lead.displayName}</div><div className="text-xs text-surface-500">Account created {formatDate(lead.createdAt)}</div></td>
                <td><div>{lead.metadata?.targetExam || 'Goal not set'}</div><div className="text-xs text-surface-500">{lead.metadata?.class ? `Class ${lead.metadata.class}` : 'Class not set'}</div></td>
                <td><div className="space-y-1 text-sm">{lead.phone && <div className="flex items-center gap-1.5"><Phone size={13} />{lead.phone}</div>}{lead.email && <div className="flex items-center gap-1.5"><Mail size={13} />{lead.email}</div>}</div></td>
                <td><div className="flex items-center gap-1.5 text-sm"><Clock3 size={14} />{formatDate(lead.lastLoginAt)}</div></td>
                <td><span className="badge badge-warning">Needs course</span></td>
              </tr>)}
              {!loading && !leads.length && <tr><td colSpan={5} className="py-14 text-center"><GraduationCap className="mx-auto mb-3 text-surface-300" size={28} /><p className="font-medium text-[#0B132B]">No behavioural leads right now</p><p className="mt-1 text-sm text-surface-500">Students will appear here after signing in without an enrollment.</p></td></tr>}
              {loading && <tr><td colSpan={5} className="py-14 text-center text-sm text-surface-500">Loading leads…</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
