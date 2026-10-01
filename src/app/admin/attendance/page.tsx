"use client";

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/index.jsx';
import { adminAPI } from '@/api/admin';

export default function AdminAttendancePage() {
  const [items, setItems] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { adminAPI.getAttendance({}).then(r => setItems(r.data?.data || r.data || [])).catch(() => toast.error('Attendance could not be loaded.')).finally(() => setLoading(false)); }, []);
  return <div className="mx-auto max-w-7xl space-y-6"><PageHeader title="Student attendance" subtitle="Review recorded attendance across every class, batch and teacher." /><section className="card overflow-hidden"><div className="table-wrapper border-x-0 border-b-0 rounded-none"><table className="data-table"><thead><tr><th>Date</th><th>Batch</th><th>Subject</th><th>Teacher</th><th>Students</th><th>Present / late</th></tr></thead><tbody>{items.map(item => { const records = item.records || []; const present = records.filter((record: any) => ['present', 'late'].includes(record.status)).length; return <tr key={item._id}><td>{new Date(item.date).toLocaleDateString('en-IN')}</td><td>{item.batchId?.name || '—'}</td><td>{item.subjectId?.name || 'General'}</td><td>{[item.teacherId?.firstName, item.teacherId?.lastName].filter(Boolean).join(' ') || '—'}</td><td>{records.length}</td><td>{present}</td></tr>; })}{!loading && !items.length && <tr><td colSpan={6} className="py-10 text-center text-surface-500">No attendance records yet.</td></tr>}</tbody></table></div></section></div>;
}
