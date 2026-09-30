"use client";

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/index.jsx';
import { teacherAPI } from '@/api/teacher';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function TeacherFlagsPage() {
  const [batches, setBatches] = useState<Array<{ _id: string; name: string; section?: string }>>([]); const [batchId, setBatchId] = useState(''); const [flags, setFlags] = useState<Array<{ _id: string; flag: 'RED' | 'YELLOW' | 'GREEN'; percentage: number; subjectName: string; topicName: string; studentId?: { firstName: string; lastName: string; metadata?: { rollNo?: string } }; remedialSessionId?: { _id: string } }>>([]); const [loading, setLoading] = useState(false);
  useEffect(() => { teacherAPI.getViewBatches().then(res => { const list = res.data?.data || []; setBatches(list); setBatchId(list[0]?._id || ''); }).catch(() => setBatches([])); }, []);
  // Loading changes only in response to the selected batch's asynchronous request.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (!batchId) return; setLoading(true); teacherAPI.getBatchTopicFlags(batchId).then(res => setFlags(res.data?.data || [])).catch(() => setFlags([])).finally(() => setLoading(false)); }, [batchId]);
  return <div className="mx-auto max-w-7xl space-y-6"><PageHeader title="Batch topic analysis" subtitle="Open red topics to see which students need remedial work." />
    <label className="block max-w-sm"><span className="form-label">Batch</span><select className="form-select" value={batchId} onChange={e => setBatchId(e.target.value)}>{batches.map(batch => <option key={batch._id} value={batch._id}>{batch.name} {batch.section && `- ${batch.section}`}</option>)}</select></label>
    {loading ? <p className="text-surface-500">Loading topic analysis…</p> : <div className="table-wrapper"><table className="data-table"><thead><tr><th>Student</th><th>Subject</th><th>Topic</th><th>Score</th><th>Action</th></tr></thead><tbody>{flags.map(flag => <tr key={flag._id}><td>{flag.studentId?.firstName} {flag.studentId?.lastName}<span className="ml-2 text-xs text-surface-400">{flag.studentId?.metadata?.rollNo}</span></td><td>{flag.subjectName}</td><td>{flag.topicName}</td><td><span className={`badge ${flag.flag === 'RED' ? 'badge-danger' : flag.flag === 'YELLOW' ? 'badge-warning' : 'badge-success'}`}>{flag.flag} · {flag.percentage}%</span></td><td>{flag.flag === 'RED' ? <span className="text-xs font-semibold text-danger-700 flex items-center gap-1"><AlertTriangle size={14} /> {flag.remedialSessionId ? 'Remedy assigned' : 'Question bank needed'}</span> : <CheckCircle2 className="text-success-600" size={18} />}</td></tr>)}{!flags.length && <tr><td colSpan={5} className="text-center text-surface-500 py-8">No submitted topic results for this batch yet.</td></tr>}</tbody></table></div>}
  </div>;
}
