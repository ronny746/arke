"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  HelpCircle,
  FileCheck,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Tag,
  ListPlus,
  Info
} from 'lucide-react';
import { adminAPI } from '@/api/index.js';
import toast from 'react-hot-toast';

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

const SUBJECT_ICONS = ['📖', '⚡', '🧪', '📐', '🌿', '🧬', '🔬', '🏛️', '⚖️', '📊', '📈', '🧠', '🧩', '🎯', '📚'];

const PRESET_SUBJECTS: Record<string, Array<{ name: string; icon: string; chaptersCount: number; dppsCount: number; testsCount: number }>> = {
  'NEET': [
    { name: 'Physics', icon: '⚡', chaptersCount: 28, dppsCount: 140, testsCount: 24 },
    { name: 'Chemistry', icon: '🧪', chaptersCount: 30, dppsCount: 150, testsCount: 26 },
    { name: 'Botany', icon: '🌿', chaptersCount: 22, dppsCount: 110, testsCount: 18 },
    { name: 'Zoology', icon: '🧬', chaptersCount: 20, dppsCount: 100, testsCount: 18 },
  ],
  'IIT-JEE': [
    { name: 'Physics', icon: '⚡', chaptersCount: 32, dppsCount: 160, testsCount: 28 },
    { name: 'Chemistry', icon: '🧪', chaptersCount: 30, dppsCount: 150, testsCount: 26 },
    { name: 'Mathematics', icon: '📐', chaptersCount: 34, dppsCount: 170, testsCount: 30 },
  ],
  'CUET-GOVT': [
    { name: 'General Test', icon: '🧩', chaptersCount: 20, dppsCount: 100, testsCount: 15 },
    { name: 'Language & English', icon: '📚', chaptersCount: 18, dppsCount: 90, testsCount: 15 },
    { name: 'Accountancy & Commerce', icon: '📊', chaptersCount: 24, dppsCount: 120, testsCount: 20 },
    { name: 'Economics & Business', icon: '📈', chaptersCount: 22, dppsCount: 110, testsCount: 18 },
  ]
};

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
  const [linkedExams, setLinkedExams] = useState<any[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);

  // Form State
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
    faculties: [] as string[],
    subjects: [] as Array<{
      name: string;
      icon: string;
      teacherId: string;
      chaptersCount: number | '';
      dppsCount: number | '';
      testsCount: number | '';
      description: string;
      topics: string[];
    }>,
    faqs: [] as Array<{
      question: string;
      answer: string;
    }>
  });

  const [dbSubjects, setDbSubjects] = useState<any[]>([]);

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

      // Fetch dynamic database subjects
      adminAPI.getSubjects()
        .then(res => {
          if (res.data?.data) setDbSubjects(res.data.data);
        })
        .catch(console.error);
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
              faculties: (c.faculties || []).map((f: any) => f._id || f),
              subjects: Array.isArray(c.subjects) ? c.subjects.map((s: any) => ({
                name: s.name || '',
                icon: s.icon || '📖',
                teacherId: s.teacherId?._id || s.teacherId || '',
                chaptersCount: s.chaptersCount ?? '',
                dppsCount: s.dppsCount ?? '',
                testsCount: s.testsCount ?? '',
                description: s.description || '',
                topics: Array.isArray(s.topics) ? s.topics : []
              })) : [],
              faqs: Array.isArray(c.faqs) ? c.faqs.map((f: any) => ({
                question: f.question || '',
                answer: f.answer || ''
              })) : []
            });

            // Fetch batches for this course
            fetch(`/api/v1/batches?courseId=${c._id}`, { headers: { Authorization: `Bearer ${t}` } })
              .then(r => r.json())
              .then(bData => { if (bData.success) setCourseBatches(bData.data || []); });

            // Fetch real exams linked to this course
            setLoadingExams(true);
            fetch(`/api/v1/courses/${c._id}/exams`, { headers: { Authorization: `Bearer ${t}` } })
              .then(r => r.json())
              .then(eData => {
                if (eData.success && Array.isArray(eData.data)) {
                  setLinkedExams(eData.data);
                }
              })
              .catch(console.error)
              .finally(() => setLoadingExams(false));
          }
        })
        .finally(() => setFetching(false));
    }
  }, [editId]);

  // Features and BestFor Handlers
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

  // Subject Handlers
  const addSubject = (preset?: { name: string; icon: string; chaptersCount?: number; dppsCount?: number; testsCount?: number }) => {
    const newSubject = {
      name: preset?.name || '',
      icon: preset?.icon || '📖',
      teacherId: '',
      chaptersCount: preset?.chaptersCount ?? '',
      dppsCount: preset?.dppsCount ?? '',
      testsCount: preset?.testsCount ?? '',
      description: '',
      topics: [] as string[]
    };
    set('subjects', [...form.subjects, newSubject]);
  };

  const updateSubject = (index: number, field: string, value: any) => {
    const updated = [...form.subjects];
    updated[index] = { ...updated[index], [field]: value };
    set('subjects', updated);
  };

  const assignSubjectTeacher = (index: number, teacherId: string) => {
    updateSubject(index, 'teacherId', teacherId);
    if (teacherId && !form.faculties.includes(teacherId)) {
      set('faculties', [...form.faculties, teacherId]);
    }
  };

  const removeSubject = (index: number) => {
    const updated = [...form.subjects];
    updated.splice(index, 1);
    set('subjects', updated);
  };

  const addSubjectTopic = (subIndex: number, topicText: string) => {
    if (!topicText.trim()) return;
    const updated = [...form.subjects];
    const topics = updated[subIndex].topics || [];
    updated[subIndex] = { ...updated[subIndex], topics: [...topics, topicText.trim()] };
    set('subjects', updated);
  };

  const removeSubjectTopic = (subIndex: number, topicIndex: number) => {
    const updated = [...form.subjects];
    const topics = [...(updated[subIndex].topics || [])];
    topics.splice(topicIndex, 1);
    updated[subIndex] = { ...updated[subIndex], topics };
    set('subjects', updated);
  };

  const applyPresetSubjects = (goal: string) => {
    if (dbSubjects && dbSubjects.length > 0) {
      const mapped = dbSubjects.map((s: any) => ({
        name: s.name,
        icon: s.icon || '📖',
        teacherId: '',
        chaptersCount: s.chaptersCount || 20,
        dppsCount: s.dppsCount || 100,
        testsCount: s.testsCount || 15,
        description: s.description || '',
        topics: Array.isArray(s.topics) ? s.topics : []
      }));
      set('subjects', mapped);
      toast.success(`Loaded ${dbSubjects.length} dynamic subjects from database`);
      return;
    }

    const presets = PRESET_SUBJECTS[goal] || PRESET_SUBJECTS['NEET'];
    if (!presets) return;
    const mapped = presets.map(p => ({
      name: p.name,
      icon: p.icon,
      teacherId: '',
      chaptersCount: p.chaptersCount,
      dppsCount: p.dppsCount,
      testsCount: p.testsCount,
      description: '',
      topics: []
    }));
    set('subjects', mapped);
    toast.success(`Loaded standard subjects for ${goal}`);
  };

  // FAQ Handlers
  const addFaq = (question = '', answer = '') => {
    set('faqs', [...form.faqs, { question, answer }]);
  };

  const updateFaq = (index: number, field: 'question' | 'answer', value: string) => {
    const updated = [...form.faqs];
    updated[index] = { ...updated[index], [field]: value };
    set('faqs', updated);
  };

  const removeFaq = (index: number) => {
    const updated = [...form.faqs];
    updated.splice(index, 1);
    set('faqs', updated);
  };

  const loadStandardFaqs = () => {
    const standard = [
      {
        question: `Who can enroll in ${form.name || 'this course'} and what are the prerequisites?`,
        answer: `This batch is tailored for students preparing for ${form.targetExam || 'competitive exams'}. All fundamental concepts are taught comprehensively from scratch.`
      },
      {
        question: 'How do I access live classes, recorded sessions, and study material?',
        answer: 'Once enrolled, all live sessions, HD video lecture recordings, daily notes, and DPPs are immediately accessible inside your Student Dashboard.'
      },
      {
        question: 'Will Daily Practice Problems (DPP) with solutions be provided?',
        answer: 'Yes! After every single lecture, a curated DPP set with step-by-step video solutions and instant performance analytics is provided.'
      },
      {
        question: 'How does the Doubt Engine support work?',
        answer: 'Students can ask doubts live during sessions, or upload questions 24/7 on the dedicated Doubt Portal for quick turnaround by verified faculty mentors.'
      },
      {
        question: 'Until when will course access and video recordings remain valid?',
        answer: 'All lecture recordings and study modules remain accessible in your student library throughout your active academic cycle.'
      }
    ];
    set('faqs', standard);
    toast.success('Loaded standard FAQ template');
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
    if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime()) && start > end) {
      return 'Course start date must be on or before the end date.';
    }
    if (end && !isNaN(end.getTime()) && end < new Date(new Date().setHours(0, 0, 0, 0))) {
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

    // Validate subjects if any have missing names
    for (let i = 0; i < form.subjects.length; i++) {
      if (!form.subjects[i].name.trim()) {
        toast.error(`Subject #${i + 1} is missing a name`);
        return;
      }
    }

    // Validate FAQs if any have empty question/answer
    for (let i = 0; i < form.faqs.length; i++) {
      if (!form.faqs[i].question.trim() || !form.faqs[i].answer.trim()) {
        toast.error(`FAQ #${i + 1} is missing question or answer text`);
        return;
      }
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
        faculties: form.faculties || [],
        subjects: form.subjects.map(s => ({
          name: s.name.trim(),
          icon: s.icon || '📖',
          teacherId: s.teacherId || null,
          chaptersCount: s.chaptersCount !== '' ? Number(s.chaptersCount) : 0,
          dppsCount: s.dppsCount !== '' ? Number(s.dppsCount) : 0,
          testsCount: s.testsCount !== '' ? Number(s.testsCount) : 0,
          description: s.description || '',
          topics: (s.topics || []).filter(Boolean)
        })),
        faqs: form.faqs.map(f => ({
          question: f.question.trim(),
          answer: f.answer.trim()
        }))
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
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error');
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
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0 z-10 relative shadow-sm">
        <div className="flex items-center gap-3 sm:gap-4">
          <button onClick={() => router.push('/admin/courses')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-[#0B132B] text-base sm:text-lg">{editId ? 'Edit Course' : 'Create Course'}</h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#C99A2E]/15 text-[#9A6E1C] border border-[#C99A2E]/30 hidden sm:inline-block">
                Full Configuration
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium hidden sm:block">Configure course subjects, real exams, dynamic FAQs, and targeting</p>
          </div>
        </div>
        <button onClick={handleSubmit} disabled={loading}
          className="px-4 sm:px-6 py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md hover:bg-[#047857] active:scale-95 disabled:opacity-70 bg-[#059669]">
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
          <span>{editId ? 'Save Changes' : 'Publish Course'}</span>
        </button>
      </header>

      {/* Main Split Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Side: Editor Form */}
        <div className="w-full lg:w-3/5 bg-white overflow-y-auto border-r border-gray-100 p-4 sm:p-6 lg:p-10">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                  <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Comprehensive description of the batch deliverables..."
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#0B132B] transition-all text-sm font-medium text-gray-800 resize-none" />
                </div>
              </div>
            </section>

            <hr className="border-gray-100 border-2" />

            {/* 2. Target Preferences */}
            <section className="p-5 rounded-2xl bg-[#0B132B]/[0.03] border-2 border-[#0B132B]/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-black uppercase tracking-widest text-[#0B132B] flex items-center gap-2">
                  <Compass size={16} className="text-[#C99A2E]" /> 2. Target Student Preferences
                </h2>
                <span className="text-[11px] font-bold text-[#9A6E1C] bg-[#C99A2E]/15 px-2.5 py-0.5 rounded-full">
                  Target Matching
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-5">
                Targeting filters will recommend this course to students matching their preferences.
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

            {/* 3. Dynamic Course Subjects */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-[#0B132B] flex items-center gap-2">
                    <Layers size={16} className="text-[#C99A2E]" /> 3. Course Subjects & Curriculum
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Define the real subjects, chapter counts, and syllabus roadmap for this course.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => applyPresetSubjects(form.targetExam)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-[#0B132B] bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1"
                  >
                    <Sparkles size={12} className="text-amber-600" /> Auto-fill {form.targetExam}
                  </button>
                  <button
                    type="button"
                    onClick={() => addSubject()}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-[#0B132B] hover:bg-[#1E293B] transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <Plus size={13} className="text-[#C99A2E]" /> Add Subject
                  </button>
                </div>
              </div>

              {form.subjects.length === 0 ? (
                <div className="p-6 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 text-center space-y-2">
                  <Layers size={28} className="mx-auto text-gray-400" />
                  <p className="text-xs font-bold text-gray-700">No subjects added yet</p>
                  <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                    Add subjects so students can see their classroom breakdown, chapter syllabus, and DPPs.
                  </p>
                  <button
                    type="button"
                    onClick={() => applyPresetSubjects(form.targetExam)}
                    className="mt-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#0B132B] text-[#C99A2E] hover:bg-[#1C2541] transition-all"
                  >
                    + Quick Add Standard Subjects
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {form.subjects.map((sub, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-gray-50/80 border-2 border-gray-200/80 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <select
                            value={sub.icon}
                            onChange={e => updateSubject(idx, 'icon', e.target.value)}
                            className="p-2 rounded-xl border border-gray-200 bg-white text-base cursor-pointer focus:outline-none"
                          >
                            {SUBJECT_ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                          </select>
                          <input
                            type="text"
                            list="db-subjects-list"
                            value={sub.name}
                            onChange={e => updateSubject(idx, 'name', e.target.value)}
                            placeholder="Subject Name (e.g. Physics)"
                            className="flex-1 px-3.5 py-2 rounded-xl border border-gray-200 bg-white font-bold text-sm text-gray-900 focus:outline-none focus:border-[#0B132B]"
                          />
                          <datalist id="db-subjects-list">
                            {dbSubjects.map((dbs: any) => (
                              <option key={dbs._id} value={dbs.name} />
                            ))}
                          </datalist>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSubject(idx)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          title="Remove Subject"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Chapters</label>
                          <input
                            type="number"
                            value={sub.chaptersCount}
                            onChange={e => updateSubject(idx, 'chaptersCount', e.target.value)}
                            placeholder="e.g. 28"
                            className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">DPP Sets</label>
                          <input
                            type="number"
                            value={sub.dppsCount}
                            onChange={e => updateSubject(idx, 'dppsCount', e.target.value)}
                            placeholder="e.g. 140"
                            className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Mock Tests</label>
                          <input
                            type="number"
                            value={sub.testsCount}
                            onChange={e => updateSubject(idx, 'testsCount', e.target.value)}
                            placeholder="e.g. 24"
                            className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-800"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Subject Teacher</label>
                        <select
                          value={sub.teacherId}
                          onChange={e => assignSubjectTeacher(idx, e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#0B132B]"
                        >
                          <option value="">Assign later</option>
                          {allTeachers.map((teacher: any) => (
                            <option key={teacher._id} value={teacher._id}>{teacher.firstName} {teacher.lastName}</option>
                          ))}
                        </select>
                        <p className="mt-1 text-[10px] text-gray-400">Selecting a teacher also adds them to this course&apos;s faculty list.</p>
                      </div>

                      {/* Topics / Syllabus List */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Key Syllabus Topics</label>
                          <span className="text-[10px] text-gray-400">{sub.topics?.length || 0} topics</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {(sub.topics || []).map((top, tIdx) => (
                            <span key={tIdx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-700 shadow-2xs">
                              <span>{top}</span>
                              <button type="button" onClick={() => removeSubjectTopic(idx, tIdx)} className="text-gray-400 hover:text-red-500">
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <input
                            id={`topic-input-${idx}`}
                            type="text"
                            placeholder="Type topic & press enter or click Add (e.g. Kinematics & Motion)"
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const val = (e.target as HTMLInputElement).value;
                                if (val.trim()) {
                                  addSubjectTopic(idx, val);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }
                            }}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-800"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const el = document.getElementById(`topic-input-${idx}`) as HTMLInputElement;
                              if (el && el.value.trim()) {
                                addSubjectTopic(idx, el.value);
                                el.value = '';
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold transition-colors"
                          >
                            + Topic
                          </button>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </section>

            <hr className="border-gray-100 border-2" />

            {/* 4. Real Linked Online Exams / Test Series */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-[#0B132B] flex items-center gap-2">
                    <FileCheck size={16} className="text-[#C99A2E]" /> 4. Real Exams & Test Series
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Real exams created in the Exams module for this course's batches are automatically linked.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/admin/exams/create')}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-[#0B132B] hover:bg-[#1E293B] transition-colors flex items-center gap-1 self-start sm:self-auto shadow-sm"
                >
                  <Plus size={13} className="text-[#C99A2E]" /> Create New Online Exam
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/60 flex items-start gap-3 text-xs text-blue-900">
                <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Automated Test Series Integration:</strong> You do not need to add dummy tests manually. Whenever you create an exam in the Exams module and assign it to any batch belonging to this course, it will automatically show here and to enrolled students in real-time.
                </div>
              </div>

              {loadingExams ? (
                <div className="py-6 flex justify-center">
                  <div className="w-6 h-6 border-2 border-[#0B132B] border-t-[#C99A2E] rounded-full animate-spin" />
                </div>
              ) : linkedExams.length === 0 ? (
                <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 text-center space-y-2">
                  <FileCheck size={24} className="mx-auto text-gray-400" />
                  <p className="text-xs font-bold text-gray-700">No online exams assigned to this course yet</p>
                  <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                    Create an exam in the Online Exams module and assign it to this course's batches.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push('/admin/exams/create')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-800 hover:bg-gray-100 transition-all shadow-xs"
                  >
                    Go to Exam Creator →
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {linkedExams.map((exam, exIdx) => (
                    <div key={exam._id || exIdx} className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#0B132B] text-[#C99A2E]">
                            {exam.status || 'PUBLISHED'}
                          </span>
                          <span className="text-xs font-bold text-gray-900">{exam.title}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">
                          ⏱ {exam.settings?.durationMinutes || 180} Mins • 📊 {exam.totalMarks || 300} Marks • ❓ {exam.totalQuestions || 0} Questions
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push(`/admin/exams/${exam._id}/edit`)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-bold transition-all shadow-xs self-start sm:self-center"
                      >
                        Edit Exam
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <hr className="border-gray-100 border-2" />

            {/* 5. Frequently Asked Questions (FAQs) */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-[#0B132B] flex items-center gap-2">
                    <HelpCircle size={16} className="text-[#C99A2E]" /> 5. Frequently Asked Questions (FAQs)
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Add clear answers to questions students might have before enrolling.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={loadStandardFaqs}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-[#0B132B] bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1"
                  >
                    <Sparkles size={12} className="text-amber-600" /> Load Templates
                  </button>
                  <button
                    type="button"
                    onClick={() => addFaq()}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-[#0B132B] hover:bg-[#1E293B] transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <Plus size={13} className="text-[#C99A2E]" /> Add FAQ
                  </button>
                </div>
              </div>

              {form.faqs.length === 0 ? (
                <div className="p-6 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 text-center space-y-2">
                  <HelpCircle size={28} className="mx-auto text-gray-400" />
                  <p className="text-xs font-bold text-gray-700">No FAQs configured yet</p>
                  <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                    Provide real answers for eligibility, batch start dates, recordings, and mock test schedules.
                  </p>
                  <button
                    type="button"
                    onClick={loadStandardFaqs}
                    className="mt-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#0B132B] text-[#C99A2E] hover:bg-[#1C2541] transition-all"
                  >
                    + Load Standard Batch FAQs
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {form.faqs.map((faq, fIdx) => (
                    <div key={fIdx} className="p-4 rounded-2xl bg-gray-50/80 border-2 border-gray-200/80 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <span className="w-5 h-5 rounded-full bg-[#0B132B] text-[#C99A2E] text-[10px] font-black flex items-center justify-center shrink-0 mt-2">
                          Q{fIdx + 1}
                        </span>
                        <div className="flex-1 space-y-2.5">
                          <input
                            type="text"
                            value={faq.question}
                            onChange={e => updateFaq(fIdx, 'question', e.target.value)}
                            placeholder="Question (e.g. How can I access class recordings?)"
                            className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-white font-bold text-sm text-gray-900 focus:outline-none focus:border-[#0B132B]"
                          />
                          <textarea
                            rows={2}
                            value={faq.answer}
                            onChange={e => updateFaq(fIdx, 'answer', e.target.value)}
                            placeholder="Answer details..."
                            className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-700 focus:outline-none focus:border-[#0B132B] resize-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFaq(fIdx)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                          title="Remove FAQ"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <hr className="border-gray-100 border-2" />

            {/* 6. Access & Enrollment Batch */}
            <section>
              <h2 className="text-xs font-black uppercase tracking-widest text-[#0B132B] mb-4 flex items-center gap-2">
                <KeyRound size={16} className="text-[#C99A2E]" /> 6. Content Access & Auto-Enrollment
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

            {/* 7. Course Faculties & Mentors */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-[#0B132B] flex items-center gap-2">
                  <GraduationCap size={16} className="text-[#C99A2E]" /> 7. Course Faculties & Mentors
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

            {/* 8. Visual Display & Features */}
            <section className="pb-16 space-y-6">
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-[#0B132B] mb-4 flex items-center gap-2">
                  <Sparkles size={16} className="text-[#C99A2E]" /> 8. Display & Features
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
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
              </div>

              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-[#0B132B] mb-3 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#C99A2E]" /> Key Inclusions / Features
                </h3>
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
                <h3 className="text-xs font-black uppercase tracking-widest text-[#0B132B] mb-3 flex items-center gap-2">
                  <Trophy size={16} className="text-[#C99A2E]" /> Best For
                </h3>
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
        <div className="w-full lg:w-2/5 bg-slate-50 overflow-y-auto flex flex-col items-center pt-12 pb-12 px-4 sm:px-6 lg:px-8 relative border-t lg:border-t-0"
             style={{ backgroundImage: 'radial-gradient(#e5e7eb 1.5px, transparent 1.5px)', backgroundSize: '22px 22px' }}>
          
          <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full shadow-sm border border-gray-200 mb-6">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-700">Live Card & Curriculum Preview</span>
          </div>

          <div className="w-full max-w-sm space-y-4">
            <motion.div
              initial={false}
              animate={{ 
                y: form.popular ? -4 : 0, 
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
                <p className="text-white/80 text-xs mb-2 line-clamp-2">{form.subtitle || 'Course subtitle will appear here'}</p>
              </div>

              {/* Card Body */}
              <div className="flex-1 flex flex-col p-5 space-y-4">
                {/* Subjects Preview */}
                {form.subjects.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-2 text-gray-500">
                      Curriculum Subjects ({form.subjects.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {form.subjects.map((sub, sIdx) => (
                        <span key={sIdx} className="px-2 py-1 rounded-md bg-gray-50 border border-gray-200 text-[11px] font-bold text-gray-800 flex items-center gap-1">
                          <span>{sub.icon}</span>
                          <span>{sub.name || 'Subject'}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Features Preview */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-2 text-gray-500">
                    Included Features
                  </p>
                  <ul className="space-y-1.5">
                    {form.features.filter(Boolean).slice(0, 3).map((f, fi) => (
                      <li key={fi} className="flex items-start gap-2 text-xs text-gray-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto pt-2">
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
