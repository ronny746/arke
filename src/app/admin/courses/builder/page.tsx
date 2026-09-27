"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BookOpen,
  ArrowLeft,
  Save,
  Plus,
  CheckCircle2,
  Trophy,
  ArrowRight,
  Trash2,
  KeyRound,
  X,
  Compass,
  Layers,
  Globe,
  Check,
  Sparkles,
  GraduationCap,
  UserPlus
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const EXAM_OPTIONS = [
  { id: 'ALL', label: 'All Exams (Global)', tagline: 'Visible to all students' },
  { id: 'NEET', label: 'NEET UG', tagline: 'Medical Entrance' },
  { id: 'IIT-JEE', label: 'IIT JEE', tagline: 'Mains & Advanced' },
  { id: 'BOARDS-11-12', label: 'Class 11 & 12', tagline: 'Boards & Foundation' },
  { id: 'FOUNDATION-9-10', label: 'Class 9 & 10', tagline: 'Foundation & Olympiads' },
  { id: 'CUET-GOVT', label: 'CUET & Govt', tagline: 'Central Univ & Aptitude' }
];

const CLASS_OPTIONS = [
  { id: 'ALL', label: 'All Classes' },
  { id: 'Class 9', label: 'Class 9' },
  { id: 'Class 10', label: 'Class 10' },
  { id: 'Class 11', label: 'Class 11' },
  { id: 'Class 12', label: 'Class 12' },
  { id: 'Dropper', label: '12th Pass / Dropper' }
];

const MEDIUM_OPTIONS = [
  { id: 'ALL', label: 'All Languages' },
  { id: 'Hinglish', label: 'Hinglish (Mix)' },
  { id: 'English', label: 'English' },
  { id: 'Hindi', label: 'Hindi' }
];

function CourseBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const [loading, setLoading] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [savingBatch, setSavingBatch] = useState(false);
  const [fetching, setFetching] = useState(!!editId);
  const [token, setToken] = useState('');
  const [courseBatches, setCourseBatches] = useState<any[]>([]);
  const [allTeachers, setAllTeachers] = useState<any[]>([]);

  const [form, setForm] = useState({
    name: '',
    subtitle: '',
    tag: 'NEET 2027',
    fee: '',
    actualFee: '',
    duration: '',
    startDate: '',
    endDate: '',
    badge: '',
    color: '#0B132B',
    popular: false,
    isPublished: true,
    targetExam: 'NEET',
    targetClass: 'ALL',
    medium: 'Hinglish',
    description: '',
    features: [''],
    bestFor: [''],
    access: { liveClasses: true, studyMaterials: true, dpps: true, testSeries: true },
    defaultBatchId: '',
    faculties: [] as string[]
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const t = localStorage.getItem('token') || '';
    setToken(t);

    if (t) {
      // Fetch teachers
      fetch('/api/v1/users?role=teacher', { headers: { Authorization: `Bearer ${t}` } })
        .then(r => r.json())
        .then(data => { if (data.success) setAllTeachers(data.data || []); })
        .catch(() => {});
    }

    if (editId && t) {
      fetch(`/api/v1/courses/${editId}`, { headers: { Authorization: `Bearer ${t}` } })
        .then(r => r.json())
        .then(data => {
          if (data.success && data.data) {
            const c = data.data;
            setForm({
              name: c.name || '',
              subtitle: c.subtitle || '',
              tag: c.tag || 'NEET 2027',
              fee: c.fee?.toString() || '',
              actualFee: c.actualFee?.toString() || '',
              duration: c.duration || '',
              startDate: c.startDate ? new Date(c.startDate).toISOString().split('T')[0] : '',
              endDate: c.endDate ? new Date(c.endDate).toISOString().split('T')[0] : '',
              badge: c.badge || '',
              color: c.color || '#0B132B',
              popular: c.popular || false,
              isPublished: c.isPublished ?? true,
              targetExam: c.targetExam || 'NEET',
              targetClass: c.targetClass || 'ALL',
              medium: c.medium || 'Hinglish',
              description: c.description || '',
              features: c.features?.length ? c.features : [''],
              bestFor: c.bestFor?.length ? c.bestFor : [''],
              access: c.access || { liveClasses: true, studyMaterials: true, dpps: true, testSeries: true },
              defaultBatchId: c.defaultBatchId || '',
              faculties: (c.faculties || []).map((f: any) => f._id || f)
            });

            // Fetch batches for this course
            fetch(`/api/v1/batches?courseId=${c._id}`, { headers: { Authorization: `Bearer ${t}` } })
              .then(r => r.json())
              .then(bData => { if (bData.success) setCourseBatches(bData.data || []); });
          }
        })
        .finally(() => setFetching(false));
    }
  }, [editId]);

  const handleListChange = (key: 'features' | 'bestFor', index: number, value: string) => {
    const newList = [...form[key]];
    newList[index] = value;
    set(key, newList);
  };

  const addListItem = (key: 'features' | 'bestFor') => {
    set(key, [...form[key], '']);
  };

  const removeListItem = (key: 'features' | 'bestFor', index: number) => {
    const newList = [...form[key]];
    newList.splice(index, 1);
    if (newList.length === 0) newList.push('');
    set(key, newList);
  };

  const toggleFaculty = (teacherId: string) => {
    const current = form.faculties || [];
    if (current.includes(teacherId)) {
      set('faculties', current.filter(id => id !== teacherId));
    } else {
      set('faculties', [...current, teacherId]);
    }
  };

  const validateCourseDates = () => {
    if (!form.startDate && !form.endDate) return null;

    const start = form.startDate ? new Date(form.startDate) : null;
    const end = form.endDate ? new Date(form.endDate) : null;

    if (start && end && isNaN(start.getTime()) === false && isNaN(end.getTime()) === false && start > end) {
      return 'Course start date must be on or before the end date.';
    }

    if (end && isNaN(end.getTime()) === false && end < new Date(new Date().setHours(0, 0, 0, 0))) {
      return 'Course end date cannot be in the past.';
    }

    return null;
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Course name is required'); return; }

    const dateError = validateCourseDates();
    if (dateError) {
      toast.error(dateError);
      return;
    }

    if (!token) return;
    setLoading(true);
    try {
      const payload: any = {
        ...form,
        fee: form.fee !== '' && form.fee !== null && !isNaN(Number(form.fee)) ? Number(form.fee) : null,
        actualFee: form.actualFee !== '' && form.actualFee !== null && !isNaN(Number(form.actualFee)) ? Number(form.actualFee) : null,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        features: form.features.map(s => s.trim()).filter(Boolean),
        bestFor: form.bestFor.map(s => s.trim()).filter(Boolean),
        faculties: form.faculties || []
      };
      if (!payload.defaultBatchId || payload.defaultBatchId.toString().startsWith('pending-')) {
        delete payload.defaultBatchId;
      }

      const url = editId ? `/api/v1/courses/${editId}` : '/api/v1/courses';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(editId ? 'Course updated successfully!' : 'Course published successfully!');
        router.push('/admin/courses');
      } else {
        const errorMsg = data.message || data.error || (typeof data.details === 'string' ? data.details : '') || 'Failed to save course';
        toast.error(errorMsg);
        console.error('Course save failed:', { status: res.status, data });
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error');
      console.error('Course save exception:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async (e: any) => {
    e.preventDefault();
    if (!newBatchName.trim() || !token) return;
    setSavingBatch(true);
    try {
      if (editId) {
        const res = await fetch('/api/v1/batches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: newBatchName.trim(), courseId: editId, type: 'online' })
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Batch created successfully');
          setCourseBatches(prev => [...prev, data.data]);
          set('defaultBatchId', data.data._id);
          setShowBatchModal(false);
          setNewBatchName('');
        } else {
          toast.error(data.message || 'Failed to create batch');
        }
      } else {
        const tempId = `pending-${Date.now()}`;
        const tempBatch = { _id: tempId, name: newBatchName.trim() };
        setCourseBatches(prev => [...prev, tempBatch]);
        set('defaultBatchId', tempId);
        setShowBatchModal(false);
        setNewBatchName('');
        toast.success('Batch added to form');
      }
    } catch {
      toast.error('Failed to create batch');
    } finally {
      setSavingBatch(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-[#0B132B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col h-screen overflow-hidden">
      {/* Create Batch Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-[#0B132B] text-white">
              <h3 className="font-bold text-sm">Create New Batch</h3>
              <button onClick={() => setShowBatchModal(false)} className="text-white/70 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateBatch} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Batch Name</label>
                <input autoFocus value={newBatchName} onChange={e => setNewBatchName(e.target.value)} placeholder="e.g. Target NEET 2027"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-[#0B132B] transition-all text-sm font-semibold" />
              </div>
              <button type="submit" disabled={savingBatch || !newBatchName.trim()}
                className="w-full py-2.5 rounded-xl text-white font-bold text-sm flex justify-center items-center gap-2 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #0B132B 0%, #C99A2E 100%)' }}>
                {savingBatch ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={16} />}
                Create Batch
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between shrink-0 z-10 relative shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/admin/courses')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-[#0B132B] text-lg">{editId ? 'Edit Course' : 'Create Course'}</h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#C99A2E]/15 text-[#9A6E1C] border border-[#C99A2E]/30">
                Targeting Enabled
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium">Configure course details, pricing, and student preference targeting</p>
          </div>
        </div>
        <button onClick={handleSubmit} disabled={loading}
          className="px-6 py-2.5 rounded-xl text-white font-bold text-sm flex items-center gap-2 transition-all shadow-md hover:opacity-90 active:scale-95 disabled:opacity-70"
          style={{ background: 'linear-gradient(135deg, #0B132B 0%, #1A2752 50%, #C99A2E 100%)' }}>
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
          {editId ? 'Save Changes' : 'Publish Course'}
        </button>
      </header>

      {/* Main Split Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Side: Editor Form */}
        <div className="w-full lg:w-3/5 bg-white overflow-y-auto border-r border-gray-100 p-6 lg:p-10">
          <div className="max-w-2xl mx-auto space-y-9">
            
            {/* 1. Basic Details */}
            <section>
              <h2 className="text-xs font-black uppercase tracking-widest text-[#0B132B] mb-4 flex items-center gap-2">
                <BookOpen size={16} className="text-[#C99A2E]" /> 1. Basic Course Details
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Course Name *</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g., ARKE NEET Super Prime"
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#0B132B] transition-all text-sm font-bold text-gray-900" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Subtitle</label>
                  <input value={form.subtitle} onChange={e => set('subtitle', e.target.value)} placeholder="e.g., Complete 1-Year Comprehensive NEET Preparation"
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#0B132B] transition-all text-sm font-semibold text-gray-800" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Course Tag</label>
                    <input value={form.tag} onChange={e => set('tag', e.target.value)} placeholder="e.g., NEET 2027"
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#0B132B] transition-all text-sm font-semibold text-gray-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Badge Text</label>
                    <input value={form.badge} onChange={e => set('badge', e.target.value)} placeholder="e.g., BEST SELLER"
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#0B132B] transition-all text-sm font-bold text-gray-800 uppercase" />
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Offer Fee (₹)</label>
                    <input type="number" value={form.fee} onChange={e => set('fee', e.target.value)} placeholder="9999"
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#0B132B] transition-all text-sm font-bold text-gray-900 tabular-nums" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Actual Fee (₹)</label>
                    <input type="number" value={form.actualFee} onChange={e => set('actualFee', e.target.value)} placeholder="18999"
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#0B132B] transition-all text-sm font-bold text-gray-900 tabular-nums" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Start Date</label>
                    <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#0B132B] transition-all text-xs font-semibold text-gray-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">End Date</label>
                    <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#0B132B] transition-all text-xs font-semibold text-gray-800" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Description</label>
                  <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Brief summary of syllabus and advantages..."
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#0B132B] transition-all text-sm font-medium text-gray-800 resize-none" />
                </div>
              </div>
            </section>

            <hr className="border-gray-100 border-2" />

            {/* 2. Target Preferences & Audience Matching */}
            <section className="p-5 rounded-2xl bg-[#0B132B]/[0.03] border-2 border-[#0B132B]/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-black uppercase tracking-widest text-[#0B132B] flex items-center gap-2">
                  <Compass size={16} className="text-[#C99A2E]" /> 2. Target Student Preferences
                </h2>
                <span className="text-[11px] font-bold text-[#9A6E1C] bg-[#C99A2E]/15 px-2.5 py-0.5 rounded-full">
                  PW-Style Matching
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-5">
                Select which students will see this course automatically recommended on their dashboard based on their login preferences.
              </p>

              <div className="space-y-4">
                {/* Target Exam */}
                <div>
                  <label className="block text-[10px] font-bold text-[#0B132B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Trophy size={14} className="text-[#C99A2E]" /> Target Exam / Goal
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {EXAM_OPTIONS.map(exam => {
                      const isSelected = form.targetExam === exam.id;
                      return (
                        <button
                          key={exam.id}
                          type="button"
                          onClick={() => set('targetExam', exam.id)}
                          className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                            isSelected
                              ? 'border-[#0B132B] bg-[#0B132B] text-white shadow-sm'
                              : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-xs">{exam.label}</p>
                            {isSelected && <Check size={14} className="text-[#C99A2E]" />}
                          </div>
                          <p className={`text-[10px] truncate ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>{exam.tagline}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Target Class */}
                <div>
                  <label className="block text-[10px] font-bold text-[#0B132B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Layers size={14} className="text-[#C99A2E]" /> Target Class / Grade
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {CLASS_OPTIONS.map(cls => {
                      const isSelected = form.targetClass === cls.id;
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => set('targetClass', cls.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            isSelected
                              ? 'bg-[#0B132B] text-white border-[#C99A2E] shadow-sm'
                              : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          {cls.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Medium / Language */}
                <div>
                  <label className="block text-[10px] font-bold text-[#0B132B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Globe size={14} className="text-[#C99A2E]" /> Medium / Language
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {MEDIUM_OPTIONS.map(med => {
                      const isSelected = form.medium === med.id;
                      return (
                        <button
                          key={med.id}
                          type="button"
                          onClick={() => set('medium', med.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            isSelected
                              ? 'bg-[#0B132B] text-[#C99A2E] border-[#C99A2E] shadow-sm'
                              : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          {isSelected ? `✓ ${med.label}` : med.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <hr className="border-gray-100 border-2" />

            {/* 3. Access & Enrollment Batch */}
            <section>
              <h2 className="text-xs font-black uppercase tracking-widest text-[#0B132B] mb-4 flex items-center gap-2">
                <KeyRound size={16} className="text-[#C99A2E]" /> 3. Content Access & Auto-Enrollment
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-2.5">Included Content Access</label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(form.access).map(([key, val]) => (
                      <label key={key} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${val ? 'border-[#0B132B] bg-[#0B132B]/5' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}>
                        <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${val ? 'bg-[#0B132B]' : 'bg-white border-2 border-gray-200'}`}>
                          {val && <Check size={14} className="text-[#C99A2E]" />}
                        </div>
                        <span className={`text-xs font-bold ${val ? 'text-[#0B132B]' : 'text-gray-500'}`}>
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </span>
                        <input type="checkbox" className="hidden" checked={val} onChange={e => set('access', { ...form.access, [key]: e.target.checked })} />
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider">
                      Default Enrollment Batch
                    </label>
                    <button type="button" onClick={() => setShowBatchModal(true)} disabled={savingBatch} className="text-[10px] font-bold text-[#0B132B] bg-[#C99A2E]/20 hover:bg-[#C99A2E]/30 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 disabled:opacity-50">
                      {savingBatch ? <div className="w-3 h-3 border-2 border-navy/30 border-t-navy rounded-full animate-spin" /> : <Plus size={12} />}
                      Create New Batch
                    </button>
                  </div>
                  <select value={form.defaultBatchId} onChange={e => set('defaultBatchId', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#0B132B] transition-all text-sm font-semibold text-gray-800">
                    <option value="">Select a batch (Optional)</option>
                    {courseBatches.map(b => (
                      <option key={b._id} value={b._id}>{b.name} {b.section ? `(${b.section})` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <hr className="border-gray-100 border-2" />

            {/* 4. Course Faculties & Mentors */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-[#0B132B] flex items-center gap-2">
                  <GraduationCap size={16} className="text-[#C99A2E]" /> 4. Course Faculties & Mentors
                </h2>
                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {form.faculties?.length || 0} selected
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Select top educators who will teach and lead this course.
              </p>

              {allTeachers.length === 0 ? (
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-center">
                  <p className="text-xs font-semibold text-gray-600">No teachers found in the institute.</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">You can add teachers from the Teachers section in Admin.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1">
                  {allTeachers.map(teacher => {
                    const isSelected = (form.faculties || []).includes(teacher._id);
                    const subject = teacher.metadata?.subject || teacher.metadata?.designation || 'Educator';
                    return (
                      <div
                        key={teacher._id}
                        type="button"
                        onClick={() => toggleFaculty(teacher._id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-[#0B132B]/5 border-[#C99A2E] shadow-sm' 
                            : 'bg-gray-50/50 border-gray-200 hover:bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0B132B] to-[#1E293B] text-[#C99A2E] font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                            {teacher.profilePictureUrl ? (
                              <img src={teacher.profilePictureUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              `${teacher.firstName?.[0] || 'T'}${teacher.lastName?.[0] || ''}`
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate">
                              {teacher.firstName} {teacher.lastName}
                            </p>
                            <p className="text-[10px] text-[#C99A2E] font-semibold truncate">{subject}</p>
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${
                          isSelected ? 'bg-[#0B132B] border-[#0B132B] text-[#C99A2E]' : 'border-gray-300 bg-white'
                        }`}>
                          {isSelected && <Check size={11} strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <hr className="border-gray-100 border-2" />

            {/* 5. Visual Color & Toggles */}
            <section>
              <h2 className="text-xs font-black uppercase tracking-widest text-[#0B132B] mb-4 flex items-center gap-2">
                <Sparkles size={16} className="text-[#C99A2E]" /> 5. Display & Visibility
              </h2>
              <div className="grid grid-cols-2 gap-4 items-end mb-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Theme Card Color</label>
                  <div className="flex items-center gap-3 bg-gray-50 border-2 border-gray-200 p-2 rounded-xl">
                    <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
                      className="w-9 h-9 rounded-lg cursor-pointer border-none p-0 bg-transparent" />
                    <span className="font-mono text-xs font-bold text-gray-800 uppercase">{form.color}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {['#0B132B', '#0033a0', '#059669', '#7C3AED', '#e8470a'].map(c => (
                    <button key={c} type="button" onClick={() => set('color', c)}
                      className="w-9 h-9 rounded-xl border-2 transition-transform hover:scale-110"
                      style={{ backgroundColor: c, borderColor: form.color === c ? '#C99A2E' : 'transparent' }} />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 bg-[#0B132B]/5 border-2 border-[#0B132B]/15 p-3.5 rounded-xl cursor-pointer hover:bg-[#0B132B]/10 transition-colors"
                  onClick={() => set('popular', !form.popular)}>
                  <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${form.popular ? 'bg-[#0B132B]' : 'bg-white border-2 border-gray-300'}`}>
                    {form.popular && <Check size={14} className="text-[#C99A2E]" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#0B132B]">Mark as Popular Course</p>
                    <p className="text-[10px] text-gray-500 font-medium">Shows highlighted badge & border glow</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 bg-emerald-50 border-2 border-emerald-200 p-3.5 rounded-xl cursor-pointer hover:bg-emerald-100/60 transition-colors"
                  onClick={() => set('isPublished', !form.isPublished)}>
                  <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${form.isPublished ? 'bg-emerald-600' : 'bg-white border-2 border-emerald-300'}`}>
                    {form.isPublished && <Check size={14} className="text-white" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-900">Published (Visible on Portal)</p>
                    <p className="text-[10px] text-emerald-700 font-medium">Students can browse & enroll</p>
                  </div>
                </div>
              </div>
            </section>

            <hr className="border-gray-100 border-2" />

            {/* 5. Features & Audience */}
            <section className="pb-16 space-y-6">
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-[#0B132B] mb-3 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#C99A2E]" /> Course Features
                </h2>
                <div className="space-y-2">
                  {form.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-[10px] font-bold shrink-0">{idx + 1}</div>
                      <input value={feat} onChange={e => handleListChange('features', idx, e.target.value)} placeholder="e.g., Daily LIVE Interactive Classes"
                        className="flex-1 px-3.5 py-2 rounded-xl border-2 border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#0B132B] transition-all font-medium text-xs" />
                      <button onClick={() => removeListItem('features', idx)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => addListItem('features')} className="text-xs font-bold text-[#0B132B] hover:text-[#C99A2E] flex items-center gap-1.5 pt-1">
                    <Plus size={14} /> Add Feature
                  </button>
                </div>
              </div>

              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-[#0B132B] mb-3 flex items-center gap-2">
                  <Trophy size={16} className="text-[#C99A2E]" /> Best For
                </h2>
                <div className="space-y-2">
                  {form.bestFor.map((bf, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input value={bf} onChange={e => handleListChange('bestFor', idx, e.target.value)} placeholder="e.g., Class 11 & 12 NEET Aspirants"
                        className="flex-1 px-3.5 py-2 rounded-xl border-2 border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#0B132B] transition-all font-medium text-xs" />
                      <button onClick={() => removeListItem('bestFor', idx)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => addListItem('bestFor')} className="text-xs font-bold text-[#0B132B] hover:text-[#C99A2E] flex items-center gap-1.5 pt-1">
                    <Plus size={14} /> Add Audience
                  </button>
                </div>
              </div>
            </section>

          </div>
        </div>

        {/* Right Side: Live Card Preview */}
        <div className="w-full lg:w-2/5 bg-slate-50 overflow-y-auto flex flex-col items-center pt-16 pb-12 px-6 lg:px-8 relative border-t lg:border-t-0"
             style={{ backgroundImage: 'radial-gradient(#e5e7eb 1.5px, transparent 1.5px)', backgroundSize: '22px 22px' }}>
          
          <div className="absolute top-4 left-6 flex items-center gap-2 px-3 py-1 bg-white rounded-full shadow-sm border border-gray-200">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-700">Live Card Preview</span>
          </div>

          <div className="w-full max-w-sm mt-4">
            <motion.div
              initial={false}
              animate={{ 
                y: form.popular ? -6 : 0, 
                boxShadow: form.popular ? `0 16px 40px ${form.color}25` : '0 10px 30px rgba(0,0,0,0.06)',
                borderColor: form.popular ? '#C99A2E' : '#e5e7eb'
              }}
              className="flex flex-col rounded-3xl overflow-hidden border-2 bg-white transition-all duration-300 w-full"
            >
              {/* Card Header */}
              <div className="px-6 pt-6 pb-5 text-white transition-colors duration-300" style={{ background: `linear-gradient(145deg, ${form.color} 0%, ${form.color}dd 100%)` }}>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 uppercase tracking-wider">
                    {form.targetExam}
                  </span>
                  {form.targetClass !== 'ALL' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/15 border border-white/25">
                      {form.targetClass}
                    </span>
                  )}
                  {form.medium !== 'ALL' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C99A2E] text-[#0B132B]">
                      {form.medium}
                    </span>
                  )}
                  {form.badge && (
                    <span className="ml-auto text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#C99A2E] text-[#0B132B]">
                      {form.badge}
                    </span>
                  )}
                </div>
                <h3 className="font-black text-xl leading-tight mb-1">{form.name || 'Course Name'}</h3>
                <p className="text-white/80 text-xs mb-2">{form.subtitle || 'Course subtitle will appear here'}</p>
              </div>

              {/* Card Body */}
              <div className="flex-1 flex flex-col p-5">
                <div className="mb-4">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-2.5 text-gray-500">
                    Included Features
                  </p>
                  <ul className="space-y-1.5">
                    {form.features.filter(Boolean).slice(0, 4).map((f, fi) => (
                      <li key={fi} className="flex items-start gap-2 text-xs text-gray-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto pt-3">
                  <button className="w-full py-3 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-1.5 shadow-md"
                    style={{ background: `linear-gradient(135deg, ${form.color} 0%, #C99A2E 100%)` }}>
                    Enroll Now <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Fee Footer */}
              <div className="px-5 py-3 flex items-center justify-between border-t border-gray-100 bg-gray-50/80">
                <span className="text-[10px] font-bold text-gray-500 uppercase">Course Fee</span>
                <div className="flex items-center gap-2">
                  {form.actualFee && (
                    <span className="text-xs text-gray-400 line-through font-bold">₹{Number(form.actualFee).toLocaleString()}</span>
                  )}
                  <span className="text-lg font-black text-[#0B132B]">₹{form.fee ? Number(form.fee).toLocaleString() : '0'}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function CourseBuilderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <CourseBuilderContent />
    </Suspense>
  );
}
