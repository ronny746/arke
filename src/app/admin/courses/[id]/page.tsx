"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, Pencil, Trash2, X, ArrowLeft, Layers, BookOpen, GraduationCap, UserPlus, Mail, Phone, Search, Check, Sparkles, UserCheck } from 'lucide-react';
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

// ── Assign Faculties Modal ────────────────────────────────────────────────────────
function AssignFacultiesModal({ 
  course, 
  token, 
  onClose, 
  onSaved 
}: { 
  course: any; 
  token: string; 
  onClose: () => void; 
  onSaved: () => void; 
}) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(
    course.faculties?.map((f: any) => f._id || f) || []
  );

  useEffect(() => {
    fetch('/api/v1/users?role=teacher', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTeachers(data.data || []);
        }
      })
      .catch(() => toast.error('Failed to load teachers'))
      .finally(() => setFetching(false));
  }, [token]);

  const toggleTeacher = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const filteredTeachers = teachers.filter(t => {
    const full = `${t.firstName || ''} ${t.lastName || ''}`.toLowerCase();
    const mail = (t.email || '').toLowerCase();
    const subj = (t.metadata?.subject || t.metadata?.designation || '').toLowerCase();
    const q = search.toLowerCase();
    return full.includes(q) || mail.includes(q) || subj.includes(q);
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/courses/${course._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ faculties: selectedIds })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update faculties');
      toast.success('Course faculties updated successfully!');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error updating faculties');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }} 
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #0B132B, #C99A2E)' }} />
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#0B132B', color: '#C99A2E' }}>
              <GraduationCap size={20} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">Assign Course Faculties</h2>
              <p className="text-xs text-gray-500">Select faculty members and educators for this course</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search faculty by name, email, or subject..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#C99A2E] focus:bg-white text-sm transition-all"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 font-medium px-1">
            <span>{selectedIds.length} faculty selected</span>
            {selectedIds.length > 0 && (
              <button 
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-xs text-red-500 hover:underline font-semibold"
              >
                Clear Selection
              </button>
            )}
          </div>

          {fetching ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-[#0B132B] border-t-[#C99A2E] rounded-full animate-spin" />
              <p className="text-xs text-gray-400">Loading institute faculties...</p>
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="text-center py-10 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <GraduationCap className="mx-auto text-gray-400 mb-2" size={28} />
              <p className="text-sm font-semibold text-gray-700">No faculties found</p>
              <p className="text-xs text-gray-400 mt-1">
                {search ? 'Try a different search query' : 'Add teachers first in the Teachers section.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredTeachers.map(teacher => {
                const isSelected = selectedIds.includes(teacher._id);
                const subject = teacher.metadata?.subject || teacher.metadata?.designation || teacher.metadata?.specialization || 'Educator';
                return (
                  <div
                    key={teacher._id}
                    onClick={() => toggleTeacher(teacher._id)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-[#0B132B]/5 border-[#C99A2E] shadow-sm' 
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0B132B] to-[#1E293B] text-[#C99A2E] font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                        {teacher.profilePictureUrl ? (
                          <img src={teacher.profilePictureUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          `${teacher.firstName?.[0] || 'T'}${teacher.lastName?.[0] || ''}`
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900 text-sm truncate">
                            {teacher.firstName} {teacher.lastName}
                          </p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 shrink-0">
                            {subject}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{teacher.email}</p>
                      </div>
                    </div>

                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                      isSelected 
                        ? 'bg-[#0B132B] border-[#0B132B] text-[#C99A2E]' 
                        : 'border-gray-300 bg-white'
                    }`}>
                      {isSelected && <Check size={13} strokeWidth={3} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-bold flex items-center gap-2 transition-all shadow-md hover:opacity-95 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #0B132B, #1E293B)' }}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <UserCheck size={16} className="text-[#C99A2E]" />
            )}
            Save Faculties ({selectedIds.length})
          </button>
        </div>
      </motion.div>
    </div>
  );
}

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
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  
  const [showCreate, setShowCreate] = useState(false);
  const [showAssignFaculties, setShowAssignFaculties] = useState(false);
  const [editBatch, setEditBatch] = useState<any>(null);
  const [deleteBatch, setDeleteBatch] = useState<any>(null);
  const [bulkAssignBatch, setBulkAssignBatch] = useState<any>(null);

  useEffect(() => { setToken(localStorage.getItem('token') || ''); }, []);

  const fetchData = useCallback(async () => {
    if (!token || !courseId) return;
    setLoading(true);
    try {
      const [cRes, bRes, eRes] = await Promise.all([
        fetch(`/api/v1/courses/${courseId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/v1/batches?courseId=${courseId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/v1/courses/${courseId}/exams`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const cData = await cRes.json();
      const bData = await bRes.json();
      const eData = await eRes.json();
      
      if (cData.success) setCourse(cData.data);
      if (bData.success) setBatches(bData.data || []);
      if (eData.success && Array.isArray(eData.data)) setExams(eData.data);
    } catch { toast.error('Network error'); } finally { setLoading(false); }
  }, [token, courseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRemoveFaculty = async (facultyId: string, facultyName: string) => {
    if (!confirm(`Are you sure you want to remove ${facultyName} from this course?`)) return;
    try {
      const currentIds = (course.faculties || []).map((f: any) => f._id || f);
      const updatedIds = currentIds.filter((id: string) => id !== facultyId);
      const res = await fetch(`/api/v1/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ faculties: updatedIds })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${facultyName} removed from course`);
        fetchData();
      } else {
        toast.error(data.message || 'Failed to remove faculty');
      }
    } catch {
      toast.error('Network error while removing faculty');
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#C99A2E] rounded-full animate-spin" />
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
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-8">
      {/* Back & Header */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-4">
          <button onClick={() => router.push('/admin/courses')} className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16} /> Back to Courses
          </button>
          <button 
            onClick={() => router.push(`/admin/courses/builder?id=${course._id}`)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-all"
          >
            <Pencil size={14} /> Edit Course Details
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {course.tag && (
                <span className="text-[11px] font-black px-3 py-1 rounded-full bg-[#0B132B] text-[#C99A2E]">
                  {course.tag}
                </span>
              )}
              {course.targetExam && course.targetExam !== 'ALL' && (
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  {course.targetExam}
                </span>
              )}
              {course.targetClass && course.targetClass !== 'ALL' && (
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {course.targetClass}
                </span>
              )}
              {course.medium && course.medium !== 'ALL' && (
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                  {course.medium} Medium
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">{course.name}</h1>
            {course.subtitle && <p className="text-sm font-medium text-gray-600 mt-1">{course.subtitle}</p>}
            <p className="text-sm text-gray-500 mt-3 max-w-3xl leading-relaxed">{course.description || 'No description provided.'}</p>
          </div>
          <div className="flex md:flex-col gap-4 min-w-[200px] border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Duration</p>
              <p className="text-base font-bold text-gray-800">{calculateDuration(course.startDate, course.endDate, course.duration)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Course Fee</p>
              <p className="text-2xl font-black text-gray-900">₹{course.fee?.toLocaleString() || '0'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Course Faculties Section */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#0B132B] text-[#C99A2E] flex items-center justify-center font-bold">
                <GraduationCap size={18} />
              </div>
              <h2 className="text-xl font-black text-gray-900">Course Faculties & Mentors</h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {course.faculties?.length || 0} assigned educator{(course.faculties?.length || 0) !== 1 ? 's' : ''} for this course
            </p>
          </div>
          <button 
            onClick={() => setShowAssignFaculties(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-xs shadow-md transition-all hover:opacity-95 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #0B132B, #1E293B)' }}
          >
            <UserPlus size={15} className="text-[#C99A2E]" />
            Assign / Manage Faculties
          </button>
        </div>

        {!course.faculties || course.faculties.length === 0 ? (
          <div className="text-center py-10 px-4 bg-gray-50/70 rounded-2xl border border-dashed border-gray-200">
            <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mx-auto mb-3 text-gray-400">
              <GraduationCap size={28} />
            </div>
            <h3 className="text-sm font-bold text-gray-700">No faculties assigned yet</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
              Assign top educators to this course so students know who will be teaching them and leading the sessions.
            </p>
            <button 
              onClick={() => setShowAssignFaculties(true)}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-95 transition-all"
              style={{ background: '#0B132B' }}
            >
              + Assign First Faculty
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {course.faculties.map((f: any) => {
              const name = `${f.firstName || ''} ${f.lastName || ''}`.trim() || 'Faculty';
              const subject = f.metadata?.subject || f.metadata?.designation || f.metadata?.specialization || 'Educator';
              const bio = f.metadata?.bio || f.metadata?.experience || '';
              return (
                <div 
                  key={f._id}
                  className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200 hover:shadow-md transition-all relative group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0B132B] to-[#1E293B] text-[#C99A2E] font-black text-sm flex items-center justify-center shadow-md overflow-hidden shrink-0">
                          {f.profilePictureUrl ? (
                            <img src={f.profilePictureUrl} alt={name} className="w-full h-full object-cover" />
                          ) : (
                            `${f.firstName?.[0] || 'T'}${f.lastName?.[0] || ''}`
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm">{name}</h4>
                          <span className="inline-block mt-0.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60">
                            {subject}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveFaculty(f._id, name)}
                        title="Remove from course"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {bio && (
                      <p className="text-xs text-gray-500 line-clamp-2 mt-2 leading-relaxed">
                        {bio}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-gray-100 flex flex-col gap-1 text-[11px] text-gray-500">
                    {f.email && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail size={12} className="text-gray-400 shrink-0" />
                        <span className="truncate">{f.email}</span>
                      </div>
                    )}
                    {f.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={12} className="text-gray-400 shrink-0" />
                        <span>{f.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Course Subjects & Curriculum */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#0B132B] text-[#C99A2E] flex items-center justify-center font-bold">
                <Layers size={18} />
              </div>
              <h2 className="text-xl font-black text-gray-900">Course Subjects & Curriculum</h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {course.subjects?.length || 0} configured subject{(course.subjects?.length || 0) !== 1 ? 's' : ''} for this course
            </p>
          </div>
          <button 
            onClick={() => router.push(`/admin/courses/builder?id=${course._id}`)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all self-start sm:self-auto"
          >
            <Pencil size={14} /> Manage Subjects
          </button>
        </div>

        {!course.subjects || course.subjects.length === 0 ? (
          <div className="text-center py-8 px-4 bg-gray-50/70 rounded-2xl border border-dashed border-gray-200">
            <Layers className="mx-auto text-gray-400 mb-2" size={28} />
            <h3 className="text-sm font-bold text-gray-700">No subjects configured yet</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
              Add subjects and syllabus chapters in the course builder so students can view their detailed curriculum.
            </p>
            <button 
              onClick={() => router.push(`/admin/courses/builder?id=${course._id}`)}
              className="mt-3 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-95 transition-all"
              style={{ background: '#0B132B' }}
            >
              + Configure Subjects
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {course.subjects.map((sub: any, sIdx: number) => (
              <div key={sIdx} className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200 hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-xl">{sub.icon || '📖'}</span>
                    <h4 className="font-bold text-gray-900 text-base">{sub.name}</h4>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 font-medium mb-3">
                    <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200 font-bold text-gray-700">
                      {sub.chaptersCount || 0} Chapters
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200 font-bold text-gray-700">
                      {sub.dppsCount || 0} DPPs
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200 font-bold text-gray-700">
                      {sub.testsCount || 0} Tests
                    </span>
                  </div>

                  {sub.topics?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Key Topics</p>
                      <div className="flex flex-wrap gap-1">
                        {sub.topics.slice(0, 4).map((top: string, tIdx: number) => (
                          <span key={tIdx} className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-gray-200/80 text-gray-600">
                            {top}
                          </span>
                        ))}
                        {sub.topics.length > 4 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded text-gray-400 font-semibold">
                            +{sub.topics.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Real Linked Online Exams & Test Series */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#0B132B] text-[#C99A2E] flex items-center justify-center font-bold">
                <FileCheck size={18} />
              </div>
              <h2 className="text-xl font-black text-gray-900">Linked Online Exams / Test Series</h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {exams.length} real online exam{(exams.length !== 1 ? 's' : '')} assigned to this course's batches
            </p>
          </div>
          <button 
            onClick={() => router.push('/admin/exams/create')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all hover:opacity-95 self-start sm:self-auto"
            style={{ background: '#0B132B' }}
          >
            <Plus size={14} className="text-[#C99A2E]" /> Create New Exam
          </button>
        </div>

        {exams.length === 0 ? (
          <div className="text-center py-8 px-4 bg-gray-50/70 rounded-2xl border border-dashed border-gray-200">
            <FileCheck className="mx-auto text-gray-400 mb-2" size={28} />
            <h3 className="text-sm font-bold text-gray-700">No real exams linked to this course yet</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
              Create exams in the Online Exams module and assign them to this course's batches. They will automatically be available to students in the Test Series tab.
            </p>
            <button 
              onClick={() => router.push('/admin/exams/create')}
              className="mt-3 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-95 transition-all"
              style={{ background: '#0B132B' }}
            >
              + Create Exam in Exam Module
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((exam: any) => (
              <div key={exam._id} className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200 hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#0B132B] text-[#C99A2E]">
                      {exam.status || 'PUBLISHED'}
                    </span>
                    <span className="text-[11px] font-semibold text-gray-500">
                      {exam.settings?.durationMinutes || 180} mins
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-base leading-snug mb-2">{exam.title}</h4>
                  
                  <div className="space-y-1 text-xs text-gray-600 font-medium">
                    <p>📊 Total Marks: <strong className="text-gray-900">{exam.totalMarks || 300}</strong></p>
                    <p>❓ Questions: <strong className="text-gray-900">{exam.totalQuestions || 0}</strong></p>
                    {exam.settings?.startTime && (
                      <p className="text-[11px] text-gray-400 pt-1">
                        Starts: {new Date(exam.settings.startTime).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-500">
                    {exam.assignedBatches?.length || 0} batch{(exam.assignedBatches?.length || 0) !== 1 ? 'es' : ''} assigned
                  </span>
                  <button
                    onClick={() => router.push(`/admin/exams/${exam._id}/edit`)}
                    className="px-3 py-1 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-100 border border-gray-200"
                  >
                    Edit Exam
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Course FAQs Section */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#0B132B] text-[#C99A2E] flex items-center justify-center font-bold">
                <HelpCircle size={18} />
              </div>
              <h2 className="text-xl font-black text-gray-900">Course FAQs</h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {course.faqs?.length || 0} FAQ item{(course.faqs?.length || 0) !== 1 ? 's' : ''} shown to students
            </p>
          </div>
          <button 
            onClick={() => router.push(`/admin/courses/builder?id=${course._id}`)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all self-start sm:self-auto"
          >
            <Pencil size={14} /> Manage FAQs
          </button>
        </div>

        {!course.faqs || course.faqs.length === 0 ? (
          <div className="text-center py-8 px-4 bg-gray-50/70 rounded-2xl border border-dashed border-gray-200">
            <HelpCircle className="mx-auto text-gray-400 mb-2" size={28} />
            <h3 className="text-sm font-bold text-gray-700">No FAQs configured yet</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
              Add clear FAQs in the course builder to address student queries regarding batch access and recordings.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {course.faqs.map((faq: any, fIdx: number) => (
              <div key={fIdx} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1.5">
                <h4 className="font-bold text-gray-900 text-sm flex items-start gap-2">
                  <span className="text-[#C99A2E] font-black">Q.</span>
                  <span>{faq.question}</span>
                </h4>
                <p className="text-xs text-gray-600 pl-4 font-medium leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Batches Section */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-black text-gray-900">Course Batches</h2>
            <p className="text-xs text-gray-500 mt-0.5">{batches.length} batch{batches.length !== 1 ? 'es' : ''} in this course</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white text-xs transition-all hover:opacity-90 active:scale-95 shadow-sm"
            style={{ background: '#059669' }}>
            <Plus size={16} /> Add Batch
          </button>
        </div>

        {batches.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3"><Layers size={26} className="text-gray-300" /></div>
            <p className="font-bold text-gray-700 text-sm">No batches created yet</p>
            <p className="text-xs text-gray-400 mt-1">Students need a batch to enroll in this course.</p>
            <button onClick={() => setShowCreate(true)} className="mt-4 px-4 py-2 rounded-xl text-white text-xs font-bold"
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
                    
                    <div className="flex items-center gap-2 mb-2 pt-2 border-t border-gray-100">
                      <Users size={14} className="text-gray-400" />
                      <p className="text-xs font-semibold text-gray-600">{b.students?.length || 0} students enrolled</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {showAssignFaculties && (
        <AssignFacultiesModal 
          course={course} 
          token={token} 
          onClose={() => setShowAssignFaculties(false)} 
          onSaved={fetchData} 
        />
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
