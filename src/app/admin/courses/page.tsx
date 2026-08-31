"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BookOpen, Clock, IndianRupee, Pencil, Trash2, X, RefreshCw, Search, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { ActionMenu } from '@/components/ui/index.jsx';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useDeveloperStore } from '@/store';

const EXAM_COLORS: Record<string, string> = {
  'NEET': '#e8470a', 'JEE': '#0033a0', 'Foundation': '#059669',
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
  return fallback || '—';
};


function DeleteConfirm({ course, onClose, onDeleted, token }: { course: any; onClose: () => void; onDeleted: () => void; token: string }) {
  const [loading, setLoading] = useState(false);
  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/courses/${course._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      toast.success('Course deleted'); onDeleted(); onClose();
    } catch { toast.error('Could not delete course'); } finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#fef2f2' }}>
          <Trash2 size={24} className="text-red-500" />
        </div>
        <h3 className="font-bold text-gray-800 mb-1">Move to Recycle Bin?</h3>
        <p className="text-sm text-gray-500 mb-6">Move <span className="font-semibold text-gray-700">"{course.name}"</span> to Recycle Bin?</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border-2 border-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all">Cancel</button>
          <button onClick={handleDelete} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-2">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Move'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  const [deleteCourse, setDeleteCourse] = useState<any>(null);
  const [search, setSearch] = useState('');
  const { isDeveloperMode } = useDeveloperStore();

  useEffect(() => { setToken(localStorage.getItem('token') || ''); }, []);

  const fetchCourses = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/courses', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setCourses(data.data || []);
      else toast.error(data.message || 'Failed to load courses');
    } catch { toast.error('Network error'); } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const handleTogglePublish = async (course: any, e: any) => {
    e.stopPropagation();
    if (!token) return;
    try {
      const updatedStatus = course.isPublished !== false ? false : true;
      const res = await fetch(`/api/v1/courses/${course._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isPublished: updatedStatus })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(updatedStatus ? 'Course published successfully' : 'Course unpublished successfully');
        fetchCourses();
      } else {
        toast.error(data.message || 'Failed to toggle status');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const filtered = courses.filter(c =>
    (c.name.toLowerCase().includes(search.toLowerCase()) || (c.tag || '').toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Courses</h1>
          <p className="text-sm text-gray-400 mt-0.5">{courses.length} course{courses.length !== 1 ? 's' : ''} available</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchCourses} title="Refresh" className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-400 transition-all">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => router.push('/admin/courses/builder')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #0033a0, #7b3fa0)' }}>
            <Plus size={16} /> Create Course
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-gray-100 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-all text-sm" />
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-2/3 mb-3" /><div className="h-3 bg-gray-100 rounded w-1/3 mb-4" />
              <div className="h-12 bg-gray-100 rounded mb-4" /><div className="h-8 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4"><BookOpen size={28} className="text-gray-300" /></div>
          <p className="font-semibold text-gray-500">No courses found</p>
          <p className="text-sm text-gray-400 mt-1">Create your first course to get started</p>
          <button onClick={() => router.push('/admin/courses/builder')} className="mt-4 px-5 py-2.5 rounded-xl text-white text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, #0033a0, #7b3fa0)' }}>+ Create Course</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c, i) => {
            const ec = c.color || '#0033a0';
            return (
              <motion.div key={c._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                onClick={() => router.push(`/admin/courses/${c._id}`)}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all cursor-pointer group flex flex-col h-full relative"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <div className="h-1" style={{ background: `linear-gradient(90deg, ${ec}, #0033a0)` }} />
                
                <div className="absolute top-4 right-4 z-10">
                  <ActionMenu actions={[
                    { label: 'Edit', icon: Pencil, onClick: () => router.push(`/admin/courses/builder?id=${c._id}`) },
                    { 
                      label: c.isPublished !== false ? 'Unpublish' : 'Publish', 
                      icon: c.isPublished !== false ? EyeOff : Eye, 
                      onClick: (e) => handleTogglePublish(c, e) 
                    },
                    { label: 'Move to Recycle Bin', icon: Trash2, danger: true, onClick: () => setDeleteCourse(c) }
                  ]} />
                </div>

                <div className="p-5 flex-1 flex flex-col pt-6">
                  <div className="flex flex-wrap gap-1.5 mb-3 pr-8">
                    {c.tag && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{c.tag}</span>}
                    {c.badge && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-200">{c.badge}</span>}
                    {c.isPublished === false && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">Unpublished (In-House)</span>}
                  </div>
                  <h3 className="font-bold text-gray-800 text-lg mb-2 leading-snug group-hover:text-blue-700 transition-colors">{c.name}</h3>
                  {c.description && <p className="text-xs text-gray-500 leading-relaxed mb-4 line-clamp-2">{c.description}</p>}
                  
                  <div className="mt-auto grid grid-cols-2 gap-2 mb-4 text-center">
                    <div className="rounded-xl py-2 px-1" style={{ background: '#f8faff' }}>
                      <Clock size={13} className="mx-auto mb-0.5" style={{ color: '#7b3fa0' }} />
                      <p className="text-xs font-bold text-gray-700">{calculateDuration(c.startDate, c.endDate, c.duration)}</p>
                      <p className="text-[9px] text-gray-400">Duration</p>
                    </div>
                    <div className="rounded-xl py-2 px-1" style={{ background: '#f8faff' }}>
                      <IndianRupee size={13} className="mx-auto mb-0.5" style={{ color: '#e8470a' }} />
                      <p className="text-xs font-bold text-gray-700">{c.fee ? `${(c.fee/1000).toFixed(0)}K` : '—'}</p>
                      <p className="text-[9px] text-gray-400">Fee/yr</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {deleteCourse && <DeleteConfirm course={deleteCourse} token={token} onClose={() => setDeleteCourse(null)} onDeleted={fetchCourses} />}
    </div>
  );
}
