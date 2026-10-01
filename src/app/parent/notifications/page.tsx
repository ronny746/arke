"use client";

import { useEffect, useState } from 'react';
import { BellRing, CheckCheck, Clock3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/index.jsx';
import { parentAPI } from '@/api/parent';

type Notification = { _id: string; title: string; message: string; type?: string; isRead?: boolean; createdAt: string; metadata?: { entityType?: string } };
const timestamp = (value: string) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value));

export default function ParentNotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const load = () => parentAPI.getNotifications().then(response => setItems(response.data?.data || response.data || [])).catch(() => toast.error('Notifications could not be loaded.')).finally(() => setLoading(false));
  useEffect(() => { void load(); }, []);
  const markAllRead = async () => { try { await parentAPI.markAllNotificationsRead(); setItems(current => current.map(item => ({ ...item, isRead: true }))); toast.success('All notifications marked as read.'); } catch { toast.error('Notifications could not be updated.'); } };
  return <div className="mx-auto max-w-4xl space-y-6"><PageHeader title="Notifications" subtitle="Class attendance, late-arrival and institute updates for your linked child." actions={<button type="button" onClick={markAllRead} disabled={!items.some(item => !item.isRead)} className="inline-flex items-center gap-2 rounded-xl border border-surface-200 bg-white px-3 py-2 text-sm font-semibold text-surface-700 hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-50"><CheckCheck size={16} />Mark all read</button>} /><section className="card overflow-hidden">{loading ? <p className="p-10 text-center text-surface-500">Loading notifications…</p> : items.length ? <ul className="divide-y divide-surface-100">{items.map(item => <li key={item._id} className={`flex gap-4 p-5 ${item.isRead ? 'bg-white' : 'bg-amber-50/40'}`}><div className="mt-0.5 rounded-xl bg-brand-50 p-2 text-brand-700"><BellRing size={18} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-surface-900">{item.title}</p>{!item.isRead && <span className="rounded-full bg-brand-700 px-2 py-0.5 text-[10px] font-bold text-white">New</span>}</div><p className="mt-1 text-sm leading-6 text-surface-600">{item.message}</p><p className="mt-2 flex items-center gap-1 text-xs text-surface-400"><Clock3 size={13} />{timestamp(item.createdAt)}</p></div></li>)}</ul> : <div className="p-12 text-center"><BellRing className="mx-auto mb-3 text-surface-300" size={32} /><p className="font-medium text-surface-700">No notifications yet</p><p className="mt-1 text-sm text-surface-500">Class attendance alerts and institute updates will appear here.</p></div>}</section></div>;
}
