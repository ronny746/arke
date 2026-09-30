"use client";

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/index.jsx';
import { TopicFlagsPanel } from '@/components/analytics/TopicFlagsPanel';

export default function ParentProgressPage() {
  const [children, setChildren] = useState<Array<{ _id: string; firstName: string; lastName: string }>>([]);
  const [childId, setChildId] = useState('');
  useEffect(() => { const token = localStorage.getItem('token'); fetch('/api/v1/users/me', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(r => { const list = r.data?.childrenIds || []; setChildren(list); setChildId(list[0]?._id || ''); }); }, []);
  return <div className="mx-auto max-w-7xl space-y-6"><PageHeader title="Progress & remedies" subtitle="See each child's topic flags, remedial work and improvement." />
    {children.length > 1 && <label className="block max-w-sm"><span className="form-label">Viewing child</span><select className="form-select" value={childId} onChange={event => setChildId(event.target.value)}>{children.map(child => <option key={child._id} value={child._id}>{child.firstName} {child.lastName}</option>)}</select></label>}
    {childId ? <TopicFlagsPanel childId={childId} /> : <p className="text-surface-500">No child is linked to this account yet.</p>}
  </div>;
}
