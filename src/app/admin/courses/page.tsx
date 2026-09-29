"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  BookOpen,
  Clock,
  IndianRupee,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  Eye,
  EyeOff,
  Compass,
  Layers,
  Globe
} from 'lucide-react';
import { ActionMenu } from '@/components/ui/index.jsx';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const EXAM_TABS = [
  { id: 'ALL', label: 'All Courses' },
  { id: 'NEET', label: 'NEET UG' },
  { id: 'IIT-JEE', label: 'IIT JEE' },
  { id: 'BOARDS-11-12', label: 'Class 11 & 12' },
  { id: 'FOUNDATION-9-10', label: 'Class 9 & 10' },
  { id: 'CUET-GOVT', label: 'CUET & Govt' }
];

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center border border-gray-100">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-red-50 text-red-500">
          <Trash2 size={24} />
        </div>
        <h3 className="font-bold text-gray-900 mb-1">Delete Course?</h3>
        <p className="text-xs text-gray-500 mb-6">Are you sure you want to remove <span className="font-semibold text-gray-800">"{course.name}"</span>?</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border-2 border-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-50 transition-all">Cancel</button>
          <button onClick={handleDelete} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-2">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Delete'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  const [deleteCourse, setDeleteCourse] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [selectedExamTab, setSelectedExamTab] = useState('ALL');

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

  const filtered = courses.filter(c => {
    const matchesSearch = (c.name.toLowerCase().includes(search.toLowerCase()) || 
      (c.tag || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.targetExam || '').toLowerCase().includes(search.toLowerCase()));
    
    if (!matchesSearch) return false;
    if (selectedExamTab === 'ALL') return true;
    return c.targetExam === selectedExamTab || c.targetExam === 'ALL' || !c.targetExam;
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#0B132B]">Course Management</h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#C99A2E]/20 text-[#9A6E1C] border border-[#C99A2E]/30">
              {courses.length} Courses
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Create, categorize, and target courses to students based on their goals and preferences.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchCourses} title="Refresh" className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 transition-all">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => router.push('/admin/courses/builder')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-xs sm:text-sm transition-all shadow-md hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #0B132B 0%, #1A2752 50%, #C99A2E 100%)' }}>
            <Plus size={16} /> Create Course
          </button>
        </div>
      </div>

      {/* Target Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {EXAM_TABS.map(tab => {
          const isSelected = selectedExamTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedExamTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                isSelected
                  ? 'bg-[#0B132B] text-white border-[#C99A2E] shadow-sm'
                  : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, exam tag, or target..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#0B132B] transition-all text-xs sm:text-sm font-medium" />
        </div>
      </div>

      {/* Course Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-3xl p-6 border border-gray-100 animate-pulse space-y-4">
              <div className="h-4 bg-gray-100 rounded w-2/3" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
              <div className="h-16 bg-gray-100 rounded-xl" />
              <div className="h-10 bg-gray-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-200 p-8">
          <div className="w-16 h-16 rounded-2xl bg-[#0B132B]/5 flex items-center justify-center mx-auto mb-4 text-[#0B132B]">
            <BookOpen size={28} />
          </div>
          <p className="font-bold text-[#0B132B] text-base">No courses found</p>
          <p className="text-xs text-gray-400 mt-1">No courses match the selected category or search query</p>
          <button onClick={() => router.push('/admin/courses/builder')} className="mt-4 px-5 py-2.5 rounded-xl text-white text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #0B132B 0%, #C99A2E 100%)' }}>+ Create New Course</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c, i) => {
            const cardColor = c.color || '#0B132B';
            return (
              <motion.div key={c._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                onClick={() => router.push(`/admin/courses/${c._id}`)}
                className="bg-white rounded-3xl border-2 border-gray-200 overflow-hidden hover:border-[#0B132B] hover:shadow-xl transition-all cursor-pointer group flex flex-col h-full relative"
              >
                {/* Top Banner Stripe */}
                <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${cardColor}, #C99A2E)` }} />
                
                {/* Actions Dropdown */}
                <div className="absolute top-4 right-4 z-10">
                  <ActionMenu actions={[
                    { label: 'Edit Course', icon: Pencil, onClick: () => router.push(`/admin/courses/builder?id=${c._id}`) },
                    { 
                      label: c.isPublished !== false ? 'Unpublish' : 'Publish', 
                      icon: c.isPublished !== false ? EyeOff : Eye, 
                      onClick: (e) => handleTogglePublish(c, e) 
                    },
                    { label: 'Move to Recycle Bin', icon: Trash2, danger: true, onClick: () => setDeleteCourse(c) }
                  ]} />
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  {/* Targeting & Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3 pr-8">
                    {c.targetExam && (
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#0B132B] text-white flex items-center gap-1">
                        <Compass size={10} className="text-[#C99A2E]" /> {c.targetExam}
                      </span>
                    )}
                    {c.targetClass && c.targetClass !== 'ALL' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                        <Layers size={10} /> {c.targetClass}
                      </span>
                    )}
                    {c.medium && c.medium !== 'ALL' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <Globe size={10} /> {c.medium}
                      </span>
                    )}
                    {c.badge && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#C99A2E]/20 text-[#9A6E1C] border border-[#C99A2E]/30">
                        {c.badge}
                      </span>
                    )}
                    {c.isPublished === false && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                        Unpublished
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-[#0B132B] text-base sm:text-lg mb-1 leading-snug group-hover:text-[#059669] transition-colors">{c.name}</h3>
                  {c.subtitle && <p className="text-xs text-gray-500 font-medium mb-3 line-clamp-1">{c.subtitle}</p>}
                  {c.description && <p className="text-xs text-gray-400 leading-relaxed mb-4 line-clamp-2">{c.description}</p>}
                  
                  {/* Duration & Fee info */}
                  <div className="mt-auto grid grid-cols-2 gap-2 pt-3 border-t border-gray-100 text-center">
                    <div className="rounded-xl py-2 px-1 bg-gray-50">
                      <Clock size={13} className="mx-auto mb-0.5 text-gray-500" />
                      <p className="text-xs font-bold text-gray-800">{calculateDuration(c.startDate, c.endDate, c.duration)}</p>
                      <p className="text-[9px] text-gray-400">Duration</p>
                    </div>
                    <div className="rounded-xl py-2 px-1 bg-[#0B132B]/5">
                      <IndianRupee size={13} className="mx-auto mb-0.5 text-[#C99A2E]" />
                      <p className="text-xs font-black text-[#0B132B]">{c.fee ? `₹${c.fee.toLocaleString()}` : 'Free'}</p>
                      <p className="text-[9px] text-gray-400">Course Fee</p>
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
