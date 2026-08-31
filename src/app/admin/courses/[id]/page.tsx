"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, Pencil, Trash2, X, ArrowLeft, Layers, BookOpen } from 'lucide-react';
import { ActionMenu } from '@/components/ui/index.jsx';
import { DeleteModal } from '@/components/modals/index.jsx';
import toast from 'react-hot-toast';
import { useRouter, useParams } from 'next/navigation';
import { useDeveloperStore } from '@/store';

const TYPE_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  hybrid:  { label: 'Hybrid',  color: '#7b3fa0', bg: '#f5f3ff' },
  offline: { label: 'Offline', color: '#0033a0', bg: '#eef2ff' },
  online:  { label: 'Online',  color: '#059669', bg: '#ecfdf5' },
};

const calculateDuration = (start: any, end: any, fallback: string) => {
  if (start && end) {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 30) {
      const months = Math.round(diffDays / 30);
      return `${months} Month${months !== 1 ? 's' : ''}`;
    }
    return `${diffDays} Day${diffDays !== 1 ? 's' : ''}`;
  }
  return fallback || 'N/A';
};

// ── Create/Edit Batch Modal ─────────────────────────────────────────────────────────
function BatchModal({ batch, courseId, onClose, onSaved, token }: { batch?: any; courseId: string; onClose: () => void; onSaved: () => void; token: string }) {
  const isEdit = !!batch;
  const [loading, setLoading] = useState(false);
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: batch?.name || '', section: batch?.section || '',
    type: batch?.type || 'offline', description: batch?.description || '',
    courseId: courseId,
    teachers: batch?.teachers?.map((t: any) => t._id || t) || (batch?.batchTeacherId ? [batch.batchTeacherId._id || batch.batchTeacherId] : []),
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    // Fetch teachers
    fetch('/api/v1/users?role=teacher', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { if (data.success) setAllTeachers(data.data || []); })
      .catch(() => {});
  }, [token]);

  const toggleTeacher = (teacherId: string) => {
    const isSelected = form.teachers.includes(teacherId);
    if (isSelected) {
      set('teachers', form.teachers.filter((id: string) => id !== teacherId));
    } else {
      set('teachers', [...form.teachers, teacherId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Batch name is required'); return; }
    setLoading(true);
    try {
      const url = isEdit ? `/api/v1/batches/${batch._id}` : '/api/v1/batches';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      toast.success(isEdit ? 'Batch updated!' : 'Batch created!');
      onSaved(); onClose();
    } catch (err: any) { toast.error(err.message || 'Something went wrong'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 20 }} transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="h-1" style={{ background: 'linear-gradient(90deg, #059669, #0033a0)' }} />
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#ecfdf5' }}>
              <Layers size={18} style={{ color: '#059669' }} />
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-sm">{isEdit ? 'Edit Batch' : 'Create New Batch'}</h2>
              <p className="text-[11px] text-gray-400">Manage batch for this course</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Batch Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g., Morning Batch"
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:bg-white transition-all text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Section</label>
              <input value={form.section} onChange={e => set('section', e.target.value)} placeholder="A, B, D..."
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:bg-white transition-all text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-800 focus:outline-none focus:border-green-500 focus:bg-white transition-all text-sm">
                <option value="offline">Offline</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Description (Optional)</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
              placeholder="Brief info about this batch..."
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:bg-white transition-all text-sm resize-none" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Assign Teachers</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border-2 border-gray-100 rounded-xl bg-gray-50">
              {allTeachers.map(teacher => {
                const isSelected = form.teachers.includes(teacher._id);
                return (
                  <button
                    key={teacher._id}
                    type="button"
                    onClick={() => toggleTeacher(teacher._id)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                      isSelected 
                        ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm' 
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {teacher.firstName} {teacher.lastName}
                  </button>
                );
              })}
              {allTeachers.length === 0 && <span className="text-xs text-gray-400 p-1">No teachers found. Add teachers first.</span>}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border-2 border-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: '#059669' }}>
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : isEdit ? 'Save Changes' : 'Create Batch'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function DeleteConfirm({ batch, onClose, onDeleted, token }: { batch: any; onClose: () => void; onDeleted: () => void; token: string }) {
  const [loading, setLoading] = useState(false);
  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/batches/${batch._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      toast.success('Batch moved to Recycle Bin'); onDeleted(); onClose();
    } catch { toast.error('Could not move batch'); } finally { setLoading(false); }
  };
  return (
    <DeleteModal 
      isOpen={true} 
      onClose={onClose} 
      onConfirm={handleDelete} 
      itemName={`Batch "${batch.name}"`} 
      loading={loading}
    />
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CourseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id as string;

  const { isDeveloperMode } = useDeveloperStore();
  const [course, setCourse] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  
  const [showCreate, setShowCreate] = useState(false);
  const [editBatch, setEditBatch] = useState<any>(null);
  const [deleteBatch, setDeleteBatch] = useState<any>(null);
  const [bulkAssignBatch, setBulkAssignBatch] = useState<any>(null);

  useEffect(() => { setToken(localStorage.getItem('token') || ''); }, []);

  const fetchData = useCallback(async () => {
    if (!token || !courseId) return;
    setLoading(true);
    try {
      const [cRes, bRes] = await Promise.all([
        fetch(`/api/v1/courses/${courseId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/v1/batches?courseId=${courseId}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const cData = await cRes.json();
      const bData = await bRes.json();
      
      if (cData.success) setCourse(cData.data);
      if (bData.success) setBatches(bData.data || []);
    } catch { toast.error('Network error'); } finally { setLoading(false); }
  }, [token, courseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-6 max-w-7xl mx-auto text-center py-20">
        <h2 className="text-xl font-bold text-gray-800">Course Not Found</h2>
        <button onClick={() => router.push('/admin/courses')} className="mt-4 text-blue-500 font-medium flex items-center justify-center gap-2 mx-auto">
          <ArrowLeft size={16} /> Back to Courses
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Back & Header */}
      <div className="mb-6">
        <button onClick={() => router.push('/admin/courses')} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors mb-4">
          <ArrowLeft size={16} /> Back to Courses
        </button>
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {course.tag && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">{course.tag}</span>}
            </div>
            <h1 className="text-2xl font-black text-gray-800">{course.name}</h1>
            <p className="text-sm text-gray-500 mt-2 max-w-2xl">{course.description || 'No description available.'}</p>
          </div>
          <div className="flex flex-col gap-2 min-w-[200px] border-l border-gray-100 pl-6">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Duration</p>
              <p className="text-sm font-semibold text-gray-800">{calculateDuration(course.startDate, course.endDate, course.duration)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Fee</p>
              <p className="text-sm font-semibold text-gray-800">₹{course.fee?.toLocaleString() || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Batches Section */}
      <div className="flex items-center justify-between gap-4 mb-6 mt-10">
        <div>
          <h2 className="text-xl font-black text-gray-800">Course Batches</h2>
          <p className="text-sm text-gray-400 mt-0.5">{batches.length} batch{batches.length !== 1 ? 'es' : ''} in this course</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 active:scale-95"
          style={{ background: '#059669' }}>
          <Plus size={16} /> Add Batch
        </button>
      </div>

      {batches.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4"><Layers size={28} className="text-gray-300" /></div>
          <p className="font-semibold text-gray-500">No batches created yet</p>
          <p className="text-sm text-gray-400 mt-1">Students need a batch to enroll in this course.</p>
          <button onClick={() => setShowCreate(true)} className="mt-4 px-5 py-2.5 rounded-xl text-white text-sm font-bold"
            style={{ background: '#059669' }}>+ Add First Batch</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map((b, i) => {
            const ts = TYPE_COLORS[b.type] || TYPE_COLORS.offline;
            return (
              <motion.div key={b._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <div className="p-5 relative group">
                  <div className="absolute top-4 right-4 z-10">
                    <ActionMenu actions={[
                      { label: 'Edit', icon: Pencil, onClick: () => setEditBatch(b) },
                      { label: 'Assign Students', icon: Users, onClick: () => setBulkAssignBatch(b) },
                      { label: 'Move to Recycle Bin', icon: Trash2, danger: true, onClick: () => setDeleteBatch(b) }
                    ]} />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3 pr-8">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: ts.bg, color: ts.color }}>{ts.label}</span>
                    {b.section && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">Sec {b.section}</span>}
                  </div>
                  <h3 className="font-bold text-gray-800 text-base mb-1 leading-snug group-hover:text-blue-700 transition-colors pr-6">{b.name}</h3>
                  {b.description && <p className="text-xs text-gray-500 leading-relaxed mb-4 line-clamp-2">{b.description}</p>}
                  
                  <div className="flex items-center gap-2 mb-5">
                    <Users size={14} className="text-gray-400" />
                    <p className="text-xs font-semibold text-gray-600">{b.students?.length || 0} students enrolled</p>
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <Users size={14} className="text-gray-400" />
                    <p className="text-xs font-semibold text-gray-600">{b.students?.length || 0} students enrolled</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {showCreate && <BatchModal courseId={courseId} token={token} onClose={() => setShowCreate(false)} onSaved={fetchData} />}
      {editBatch  && <BatchModal batch={editBatch} courseId={courseId} token={token} onClose={() => setEditBatch(null)} onSaved={fetchData} />}
      {deleteBatch && <DeleteConfirm batch={deleteBatch} token={token} onClose={() => setDeleteBatch(null)} onDeleted={fetchData} />}
      {bulkAssignBatch && <BulkAssignModal batch={bulkAssignBatch} token={token} onClose={() => setBulkAssignBatch(null)} onAssigned={fetchData} />}
    </div>
  );
}

function BulkAssignModal({ batch, token, onClose, onAssigned }: { batch: any, token: string, onClose: () => void, onAssigned: () => void }) {
  const [classes, setClasses] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetch('/api/v1/users/classes', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setClasses(data.data || []);
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!selectedClass) {
      setSections([]);
      setSelectedSection('');
      return;
    }
    fetch(`/api/v1/users/classes/sections?className=${encodeURIComponent(selectedClass)}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSections(data.data || []);
        }
      });
  }, [selectedClass, token]);

  const handleAssign = async () => {
    if (!selectedClass) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/v1/batches/${batch._id}/bulk-assign-class`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetClass: selectedClass, targetSection: selectedSection })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Successfully assigned ${data.data?.assignedCount || 0} students!`);
        onAssigned();
        onClose();
      } else {
        toast.error(data.message || 'Failed to assign students');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error assigning students');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Bulk Assign to {batch.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500 font-medium">No offline imported classes found.</p>
              <p className="text-xs text-gray-400 mt-1">Make sure you have imported students via CSV with a 'class' assigned.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Select Class</label>
                <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSection(''); }}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 transition-all text-sm font-semibold text-gray-700">
                  <option value="">-- Select Class --</option>
                  {classes.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {selectedClass && sections.length > 0 && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Select Section (Optional)</label>
                  <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 transition-all text-sm font-semibold text-gray-700">
                    <option value="">-- All Sections --</option>
                    {sections.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}

              <p className="text-[10px] text-gray-400 font-medium mt-1.5 leading-relaxed">
                Students matching this selection will be automatically added to the batch. You can also assign individual students from the Students page.
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleAssign}
            disabled={!selectedClass || assigning}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {assigning ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Users size={16} />
            )}
            Assign Now
          </button>
        </div>
      </motion.div>
    </div>
  );
}
