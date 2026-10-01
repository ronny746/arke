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
  Tag,
  ListPlus,
  Info,
  Calendar,
  IndianRupee,
  Eye,
  Settings2,
  ChevronRight,
  LayoutGrid
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
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum' | 'access' | 'batches' | 'faqs' | 'all'>('overview');
  const [showPreviewMobile, setShowPreviewMobile] = useState(false);

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
      librarySubjectId: string;
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
      adminAPI.getSubjects({ libraryOnly: true })
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
                librarySubjectId: s.librarySubjectId?._id || s.librarySubjectId || '',
                name: s.librarySubjectId?.name || s.name || '',
                icon: s.librarySubjectId?.icon || s.icon || '📖',
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

  // Keyboard shortcut for saving (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [form, token, editId]);

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
  const addSubject = () => {
    const newSubject = {
      librarySubjectId: '',
      name: '',
      icon: '📖',
      teacherId: '',
      chaptersCount: '',
      dppsCount: '',
      testsCount: '',
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

  const pickLibrarySubject = (index: number, librarySubjectId: string) => {
    const librarySubject = dbSubjects.find((subject: any) => String(subject._id) === librarySubjectId);
    if (!librarySubject) return;
    const updated = [...form.subjects];
    updated[index] = {
      ...updated[index],
      librarySubjectId,
      name: librarySubject.name,
      icon: librarySubject.icon || updated[index].icon,
      teacherId: librarySubject.teacherId?._id || librarySubject.teacherId || '',
      chaptersCount: librarySubject.chaptersCount ?? 0,
      dppsCount: librarySubject.dppsCount ?? 0,
      testsCount: librarySubject.testsCount ?? 0,
      description: librarySubject.description || '',
      topics: Array.isArray(librarySubject.topics) ? librarySubject.topics : []
    };
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

  const loadLibrarySubjects = () => {
    if (dbSubjects.length > 0) {
      const mapped = dbSubjects.map((s: any) => ({
        librarySubjectId: s._id,
        name: s.name,
        icon: s.icon || '📖',
        teacherId: s.teacherId?._id || s.teacherId || '',
        chaptersCount: s.chaptersCount ?? 0,
        dppsCount: s.dppsCount ?? 0,
        testsCount: s.testsCount ?? 0,
        description: s.description || '',
        topics: Array.isArray(s.topics) ? s.topics : []
      }));
      set('subjects', mapped);
      toast.success(`Loaded ${dbSubjects.length} dynamic subjects from database`);
      return;
    }
    toast.error('Add subjects in Subject Library before adding them to a course.');
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
    if (!form.name.trim()) { 
      toast.error('Course name is required'); 
      setActiveTab('overview');
      return; 
    }

    const dateError = validateCourseDates();
    if (dateError) {
      toast.error(dateError);
      setActiveTab('overview');
      return;
    }

    // Validate subjects if any have missing names
    for (let i = 0; i < form.subjects.length; i++) {
      if (!form.subjects[i].librarySubjectId) {
        toast.error(`Select Subject #${i + 1} from the Subject Library`);
        setActiveTab('curriculum');
        return;
      }
    }

    // Validate FAQs if any have empty question/answer
    for (let i = 0; i < form.faqs.length; i++) {
      if (!form.faqs[i].question.trim() || !form.faqs[i].answer.trim()) {
        toast.error(`FAQ #${i + 1} is missing question or answer text`);
        setActiveTab('faqs');
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
          librarySubjectId: s.librarySubjectId,
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
        if (data.success && data.data) {
          toast.success('Batch created!');
          setCourseBatches(prev => [...prev, data.data]);
          set('defaultBatchId', data.data._id);
          setShowBatchModal(false);
          setNewBatchName('');
        } else {
          toast.error(data.message || 'Failed to create batch');
        }
      } else {
        const tempId = 'pending-' + Date.now();
        const mockBatch = { _id: tempId, name: newBatchName.trim(), section: 'New' };
        setCourseBatches(prev => [...prev, mockBatch]);
        set('defaultBatchId', tempId);
        toast.success('Batch added to course draft');
        setShowBatchModal(false);
        setNewBatchName('');
      }
    } catch {
      toast.error('Failed to create batch');
    } finally {
      setSavingBatch(false);
    }
  };

  const tabs = [
    { id: 'overview', label: '1. Basic Info & Pricing', icon: BookOpen, badge: null },
    { id: 'curriculum', label: '2. Subjects & Syllabus', icon: Layers, badge: form.subjects.length ? `${form.subjects.length} Subjects` : null },
    { id: 'access', label: '3. Features & Access', icon: KeyRound, badge: form.features.filter(Boolean).length ? `${form.features.filter(Boolean).length} Highlights` : null },
    { id: 'batches', label: '4. Batches & Faculty', icon: GraduationCap, badge: form.faculties.length ? `${form.faculties.length} Teachers` : null },
    { id: 'faqs', label: '5. Exams & FAQs', icon: HelpCircle, badge: form.faqs.length ? `${form.faqs.length} FAQs` : null },
    { id: 'all', label: 'All Sections', icon: ListPlus, badge: null }
  ];

  if (fetching) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-3">
        <div className="w-10 h-10 border-4 border-[#0B132B] border-t-[#C99A2E] rounded-full animate-spin" />
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Loading Course Configuration...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col selection:bg-[#C99A2E]/20">
      
      {/* Create Batch Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-[#0B132B] text-white">
              <h3 className="font-bold text-sm">Create New Batch</h3>
              <button onClick={() => setShowBatchModal(false)} className="text-white/70 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateBatch} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Batch Name</label>
                <input autoFocus value={newBatchName} onChange={e => setNewBatchName(e.target.value)} placeholder="e.g. Target NEET 2027 Morning"
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

      {/* ── STICKY TOP HEADER (ALWAYS VISIBLE ON SCROLL) ──────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          
          {/* Left: Back & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={() => router.push('/admin/courses')} 
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-600 shrink-0"
              title="Back to Courses"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-black text-[#0B132B] text-base sm:text-lg truncate">
                  {editId ? (form.name || 'Edit Course') : 'Create New Course'}
                </h1>
                {editId && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0B132B] text-[#C99A2E] hidden sm:inline-block">
                    Editing ID: {editId.slice(-6)}
                  </span>
                )}
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  form.isPublished ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30' : 'bg-red-500/15 text-red-700 border border-red-500/30'
                }`}>
                  {form.isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium truncate hidden md:block">
                Press <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-300 font-mono text-[10px] text-gray-700">⌘S</kbd> to save anytime
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowPreviewMobile(!showPreviewMobile)}
              className="lg:hidden p-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold flex items-center gap-1.5"
            >
              <Eye size={16} />
              <span className="hidden sm:inline">Preview</span>
            </button>

            <button 
              onClick={() => router.push('/admin/courses')}
              className="px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs font-bold transition-all hidden sm:inline-block"
            >
              Cancel
            </button>

            <button 
              onClick={handleSubmit} 
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-white font-black text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-70"
              style={{ background: 'linear-gradient(135deg, #0B132B 0%, #1A2752 50%, #C99A2E 100%)' }}
            >
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
              <span>{editId ? 'Save Changes' : 'Publish Course'}</span>
            </button>
          </div>

        </div>

        {/* ── CATEGORIZED TAB NAVIGATION BAR ─────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 border-t border-gray-100 overflow-x-auto scrollbar-hide flex items-center gap-1.5 py-2">
          {tabs.map(t => {
            const Icon = t.icon;
            const isSelected = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-[#0B132B] text-white border-[#C99A2E] shadow-sm'
                    : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-200'
                }`}
              >
                <Icon size={14} className={isSelected ? 'text-[#C99A2E]' : 'text-gray-500'} />
                <span>{t.label}</span>
                {t.badge && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    isSelected ? 'bg-[#C99A2E] text-[#0B132B]' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ── MAIN CONTENT AREA ──────────────────────────────────────────────── */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Form Column */}
        <div className="flex-1 w-full space-y-6">

          {/* TAB 1: OVERVIEW & PRICING */}
          {(activeTab === 'overview' || activeTab === 'all') && (
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-200/80 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#0B132B] text-[#C99A2E] flex items-center justify-center font-bold">
                    <BookOpen size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-[#0B132B] uppercase tracking-wider">Basic Info & Pricing</h2>
                    <p className="text-xs text-gray-500">Core titles, pricing structure, dates, and category targeting</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Course Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    value={form.name} 
                    onChange={e => set('name', e.target.value)} 
                    placeholder="e.g., ARKE NEET Super Prime"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#0B132B] transition-all text-sm font-bold text-gray-900 outline-none" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Subtitle</label>
                  <input 
                    value={form.subtitle} 
                    onChange={e => set('subtitle', e.target.value)} 
                    placeholder="e.g., Complete 1-Year Comprehensive NEET Preparation with Daily DPPs"
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#0B132B] transition-all text-sm font-semibold text-gray-800 outline-none" 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Course Tag</label>
                    <input 
                      value={form.tag} 
                      onChange={e => set('tag', e.target.value)} 
                      placeholder="e.g., NEET 2027"
                      className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#0B132B] transition-all text-sm font-semibold text-gray-800 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Badge Text</label>
                    <input 
                      value={form.badge} 
                      onChange={e => set('badge', e.target.value)} 
                      placeholder="e.g., BEST SELLER / POPULAR"
                      className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#0B132B] transition-all text-sm font-bold text-gray-800 uppercase outline-none" 
                    />
                  </div>
                </div>

                {/* Pricing & Dates */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 p-4 rounded-2xl bg-gray-50/80 border border-gray-200/80">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Offer Fee (₹)</label>
                    <div className="relative">
                      <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="number" 
                        value={form.fee} 
                        onChange={e => set('fee', e.target.value)} 
                        placeholder="9999"
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-900 tabular-nums focus:border-[#0B132B] outline-none" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Actual Fee (₹)</label>
                    <div className="relative">
                      <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="number" 
                        value={form.actualFee} 
                        onChange={e => set('actualFee', e.target.value)} 
                        placeholder="18999"
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-900 tabular-nums focus:border-[#0B132B] outline-none" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Start Date</label>
                    <input 
                      type="date" 
                      value={form.startDate} 
                      onChange={e => set('startDate', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-800 focus:border-[#0B132B] outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">End Date</label>
                    <input 
                      type="date" 
                      value={form.endDate} 
                      onChange={e => set('endDate', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-800 focus:border-[#0B132B] outline-none" 
                    />
                  </div>
                </div>

                {/* Targeting: Goal / Class / Medium */}
                <div className="space-y-4 pt-2">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Description</label>
                  <textarea 
                    value={form.description} 
                    onChange={e => set('description', e.target.value)} 
                    rows={3} 
                    placeholder="Comprehensive description of the course, deliverables, and curriculum..."
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#0B132B] transition-all text-sm font-medium text-gray-800 resize-none outline-none" 
                  />
                </div>

                {/* Display & Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div 
                    className="flex items-center gap-3 bg-[#0B132B]/5 border-2 border-[#0B132B]/15 p-3.5 rounded-xl cursor-pointer hover:bg-[#0B132B]/10 transition-colors"
                    onClick={() => set('popular', !form.popular)}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${form.popular ? 'bg-[#0B132B]' : 'bg-white border-2 border-gray-300'}`}>
                      {form.popular && <Check size={14} className="text-[#C99A2E]" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#0B132B]">Mark as Popular Course</p>
                      <p className="text-[10px] text-gray-500 font-medium">Shows highlighted gold badge & glow</p>
                    </div>
                  </div>
                  
                  <div 
                    className="flex items-center gap-3 bg-emerald-50 border-2 border-emerald-200 p-3.5 rounded-xl cursor-pointer hover:bg-emerald-100/60 transition-colors"
                    onClick={() => set('isPublished', !form.isPublished)}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${form.isPublished ? 'bg-emerald-600' : 'bg-white border-2 border-emerald-300'}`}>
                      {form.isPublished && <Check size={14} className="text-white" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-900">Published Status</p>
                      <p className="text-[10px] text-emerald-700 font-medium">Visible to students on web & app</p>
                    </div>
                  </div>
                </div>
              </div>

              {activeTab !== 'all' && (
                <div className="pt-4 flex justify-end">
                  <button 
                    type="button" 
                    onClick={() => setActiveTab('curriculum')} 
                    className="px-5 py-2.5 rounded-xl bg-[#0B132B] text-[#C99A2E] hover:bg-[#1A2752] text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
                  >
                    Next: Subjects & Syllabus <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CURRICULUM & SUBJECTS */}
          {(activeTab === 'curriculum' || activeTab === 'all') && (
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-200/80 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#0B132B] text-[#C99A2E] flex items-center justify-center font-bold">
                    <Layers size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-[#0B132B] uppercase tracking-wider">Course Subjects & Curriculum</h2>
                    <p className="text-xs text-gray-500">Define subjects, chapter counts, DPPs, mock tests, and key syllabus topics</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={loadLibrarySubjects}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#0B132B] bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1.5"
                  >
                    <Sparkles size={13} className="text-amber-600" /> Load Subject Library
                  </button>
                  <button
                    type="button"
                    onClick={() => addSubject()}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#0B132B] hover:bg-[#1E293B] transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={14} className="text-[#C99A2E]" /> Add Subject
                  </button>
                </div>
              </div>

              {form.subjects.length === 0 ? (
                <div className="p-8 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 text-center space-y-3">
                  <Layers size={32} className="mx-auto text-gray-400" />
                  <p className="text-sm font-bold text-gray-800">No subjects added to this course yet</p>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    Add subjects so students can see their classroom breakdown, chapter syllabus, and DPPs.
                  </p>
                  <button
                    type="button"
                    onClick={loadLibrarySubjects}
                    className="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#0B132B] text-[#C99A2E] hover:bg-[#1C2541] transition-all shadow-sm"
                  >
                    Load subjects from Subject Library
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {form.subjects.map((sub, idx) => (
                    <div key={idx} className="p-4 sm:p-5 rounded-2xl bg-gray-50/80 border-2 border-gray-200/80 space-y-4 transition-all hover:border-[#0B132B]/30">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <select
                            value={sub.icon}
                            onChange={e => updateSubject(idx, 'icon', e.target.value)}
                            className="p-2.5 rounded-xl border border-gray-200 bg-white text-base cursor-pointer focus:outline-none"
                          >
                            {SUBJECT_ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                          </select>
                          <select
                            value={sub.librarySubjectId}
                            onChange={e => pickLibrarySubject(idx, e.target.value)}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white font-bold text-sm text-gray-900 focus:outline-none focus:border-[#0B132B]"
                          >
                            <option value="">Select from Subject Library</option>
                            {dbSubjects.map((dbs: any) => <option key={dbs._id} value={dbs._id}>{dbs.name}</option>)}
                          </select>
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

                      <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">Chapters Count</label>
                          <input
                            type="number"
                            value={sub.chaptersCount}
                            onChange={e => updateSubject(idx, 'chaptersCount', e.target.value)}
                            placeholder="e.g. 28"
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">DPP Sets</label>
                          <input
                            type="number"
                            value={sub.dppsCount}
                            onChange={e => updateSubject(idx, 'dppsCount', e.target.value)}
                            placeholder="e.g. 140"
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">Mock Tests</label>
                          <input
                            type="number"
                            value={sub.testsCount}
                            onChange={e => updateSubject(idx, 'testsCount', e.target.value)}
                            placeholder="e.g. 24"
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">Assigned Subject Teacher</label>
                        <select
                          value={sub.teacherId}
                          onChange={e => assignSubjectTeacher(idx, e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#0B132B]"
                        >
                          <option value="">Select teacher or assign later</option>
                          {allTeachers.map((teacher: any) => (
                            <option key={teacher._id} value={teacher._id}>{teacher.firstName} {teacher.lastName} ({teacher.metadata?.subject || 'Teacher'})</option>
                          ))}
                        </select>
                      </div>

                      {/* Topics / Syllabus List */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Key Syllabus Topics</label>
                          <span className="text-[10px] text-gray-400 font-bold">{sub.topics?.length || 0} topics added</span>
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
                            placeholder="Type topic & press enter (e.g. Thermodynamics, Optics)"
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
                            className="flex-1 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-xs text-gray-800 outline-none focus:border-[#0B132B]"
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
                            className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold transition-colors"
                          >
                            + Add Topic
                          </button>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}

              {activeTab !== 'all' && (
                <div className="pt-4 flex items-center justify-between border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => setActiveTab('overview')} 
                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-bold transition-all"
                  >
                    ← Back: Overview
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setActiveTab('access')} 
                    className="px-5 py-2.5 rounded-xl bg-[#0B132B] text-[#C99A2E] hover:bg-[#1A2752] text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
                  >
                    Next: Features & Access <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ACCESS & HIGHLIGHTS */}
          {(activeTab === 'access' || activeTab === 'all') && (
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-200/80 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#0B132B] text-[#C99A2E] flex items-center justify-center font-bold">
                    <KeyRound size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-[#0B132B] uppercase tracking-wider">Content Access & Key Highlights</h2>
                    <p className="text-xs text-gray-500">Toggle student module permissions, bullet points, and target audience</p>
                  </div>
                </div>
              </div>

              {/* Module Access Checkboxes */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2.5">Included Content Modules</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(form.access).map(([key, val]) => (
                    <label 
                      key={key} 
                      className={`flex items-center gap-2.5 p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                        val ? 'border-[#0B132B] bg-[#0B132B]/5 shadow-xs' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors ${
                        val ? 'bg-[#0B132B]' : 'bg-white border-2 border-gray-300'
                      }`}>
                        {val && <Check size={13} className="text-[#C99A2E]" />}
                      </div>
                      <span className={`text-xs font-bold ${val ? 'text-[#0B132B]' : 'text-gray-500'}`}>
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </span>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={val} 
                        onChange={e => set('access', { ...form.access, [key]: e.target.checked })} 
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Key Highlights */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#0B132B] flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[#C99A2E]" /> Key Features & Inclusions
                  </h3>
                  <span className="text-xs text-gray-400 font-medium">Shown on course card & checkout</span>
                </div>
                <div className="space-y-2.5">
                  {form.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-bold shrink-0">{idx + 1}</div>
                      <input 
                        value={feat} 
                        onChange={e => handleListChange('features', idx, e.target.value)} 
                        placeholder="e.g., Daily LIVE Interactive Classes + Video Recordings"
                        className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#0B132B] transition-all font-medium text-xs outline-none" 
                      />
                      <button 
                        onClick={() => removeListItem('features', idx)} 
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button"
                    onClick={() => addListItem('features')} 
                    className="text-xs font-bold text-[#0B132B] hover:text-[#C99A2E] flex items-center gap-1.5 pt-1"
                  >
                    <Plus size={14} /> Add Another Feature
                  </button>
                </div>
              </div>

              {/* Best For */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#0B132B] flex items-center gap-2">
                    <Trophy size={16} className="text-[#C99A2E]" /> Who is this Course for?
                  </h3>
                  <span className="text-xs text-gray-400 font-medium">Target audience tags</span>
                </div>
                <div className="space-y-2.5">
                  {form.bestFor.map((bf, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input 
                        value={bf} 
                        onChange={e => handleListChange('bestFor', idx, e.target.value)} 
                        placeholder="e.g., Class 11 & 12 Medical Aspirants aiming for AIR Top 1000"
                        className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#0B132B] transition-all font-medium text-xs outline-none" 
                      />
                      <button 
                        onClick={() => removeListItem('bestFor', idx)} 
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button"
                    onClick={() => addListItem('bestFor')} 
                    className="text-xs font-bold text-[#0B132B] hover:text-[#C99A2E] flex items-center gap-1.5 pt-1"
                  >
                    <Plus size={14} /> Add Target Audience
                  </button>
                </div>
              </div>

              {activeTab !== 'all' && (
                <div className="pt-4 flex items-center justify-between border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => setActiveTab('curriculum')} 
                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-bold transition-all"
                  >
                    ← Back: Curriculum
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setActiveTab('batches')} 
                    className="px-5 py-2.5 rounded-xl bg-[#0B132B] text-[#C99A2E] hover:bg-[#1A2752] text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
                  >
                    Next: Batches & Faculty <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BATCHES & FACULTY */}
          {(activeTab === 'batches' || activeTab === 'all') && (
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-200/80 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#0B132B] text-[#C99A2E] flex items-center justify-center font-bold">
                    <GraduationCap size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-[#0B132B] uppercase tracking-wider">Batches & Faculty Mentors</h2>
                    <p className="text-xs text-gray-500">Auto-enrollment batch assignments and assigned teacher mentors</p>
                  </div>
                </div>
              </div>

              {/* Default Batch Selection */}
              <div className="p-5 rounded-2xl bg-gray-50/80 border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                    Default Auto-Enrollment Batch
                  </label>
                  <button 
                    type="button" 
                    onClick={() => setShowBatchModal(true)} 
                    disabled={savingBatch} 
                    className="text-xs font-bold text-[#0B132B] bg-[#C99A2E]/20 hover:bg-[#C99A2E]/30 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Create New Batch
                  </button>
                </div>
                <select 
                  value={form.defaultBatchId} 
                  onChange={e => set('defaultBatchId', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white focus:border-[#0B132B] transition-all text-sm font-semibold text-gray-800 outline-none"
                >
                  <option value="">Select a default batch (Optional)</option>
                  {courseBatches.map(b => (
                    <option key={b._id} value={b._id}>{b.name} {b.section ? `(${b.section})` : ''}</option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500">
                  When students purchase or enroll in this course, they will be automatically added to this batch.
                </p>
              </div>

              {/* Faculty Mentors Picker */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#0B132B]">
                      Course Faculties & Mentors
                    </h3>
                    <p className="text-xs text-gray-500">Select educators highlighted for this course</p>
                  </div>
                  <span className="text-xs font-bold text-[#0B132B] bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                    {form.faculties?.length || 0} selected
                  </span>
                </div>

                {allTeachers.length === 0 ? (
                  <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 text-center">
                    <p className="text-xs font-semibold text-gray-600">No teachers found in institute.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-1">
                    {allTeachers.map(teacher => {
                      const isSelected = (form.faculties || []).includes(teacher._id);
                      const subject = teacher.metadata?.subject || teacher.metadata?.designation || 'Educator';
                      return (
                        <div
                          key={teacher._id}
                          type="button"
                          onClick={() => toggleFaculty(teacher._id)}
                          className={`flex items-center justify-between p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-[#0B132B]/5 border-[#C99A2E] shadow-sm' 
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-[#0B132B] text-[#C99A2E] font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
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
                              <p className="text-[10px] text-[#C99A2E] font-bold truncate">{subject}</p>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
                            isSelected ? 'bg-[#0B132B] border-[#0B132B] text-[#C99A2E]' : 'border-gray-300 bg-white'
                          }`}>
                            {isSelected && <Check size={13} strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {activeTab !== 'all' && (
                <div className="pt-4 flex items-center justify-between border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => setActiveTab('access')} 
                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-bold transition-all"
                  >
                    ← Back: Features
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setActiveTab('faqs')} 
                    className="px-5 py-2.5 rounded-xl bg-[#0B132B] text-[#C99A2E] hover:bg-[#1A2752] text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
                  >
                    Next: Exams & FAQs <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: EXAMS & FAQS */}
          {(activeTab === 'faqs' || activeTab === 'all') && (
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-200/80 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#0B132B] text-[#C99A2E] flex items-center justify-center font-bold">
                    <HelpCircle size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-[#0B132B] uppercase tracking-wider">Exams & Frequently Asked Questions</h2>
                    <p className="text-xs text-gray-500">Linked real mock test series and course student FAQs</p>
                  </div>
                </div>
              </div>

              {/* Linked Real Exams */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#0B132B] flex items-center gap-2">
                      <FileCheck size={16} className="text-[#C99A2E]" /> Real Linked Exams & Test Series
                    </h3>
                    <p className="text-xs text-gray-500">
                      Real online exams created in the Exams module for this course are automatically linked.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push('/admin/exams/create')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#0B132B] hover:bg-[#1E293B] transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={13} className="text-[#C99A2E]" /> Create New Exam
                  </button>
                </div>

                {loadingExams ? (
                  <div className="py-6 flex justify-center">
                    <div className="w-6 h-6 border-2 border-[#0B132B] border-t-[#C99A2E] rounded-full animate-spin" />
                  </div>
                ) : linkedExams.length === 0 ? (
                  <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 text-center space-y-2">
                    <FileCheck size={24} className="mx-auto text-gray-400" />
                    <p className="text-xs font-bold text-gray-700">No online exams assigned to this course yet</p>
                    <p className="text-[11px] text-gray-400">
                      Create an exam in the Online Exams module and assign it to this course.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {linkedExams.map((exam, exIdx) => (
                      <div key={exam._id || exIdx} className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
              </div>

              {/* FAQs Section */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#0B132B] flex items-center gap-2">
                      <HelpCircle size={16} className="text-[#C99A2E]" /> Course FAQs
                    </h3>
                    <p className="text-xs text-gray-500">Provide clear answers to questions before students enroll</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={loadStandardFaqs}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#0B132B] bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1.5"
                    >
                      <Sparkles size={13} className="text-amber-600" /> Standard FAQs
                    </button>
                    <button
                      type="button"
                      onClick={() => addFaq()}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#0B132B] hover:bg-[#1E293B] transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus size={14} className="text-[#C99A2E]" /> Add FAQ
                    </button>
                  </div>
                </div>

                {form.faqs.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 text-center space-y-2">
                    <HelpCircle size={28} className="mx-auto text-gray-400" />
                    <p className="text-xs font-bold text-gray-700">No FAQs configured yet</p>
                    <button
                      type="button"
                      onClick={loadStandardFaqs}
                      className="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#0B132B] text-[#C99A2E] hover:bg-[#1C2541] transition-all"
                    >
                      + Load Standard Batch FAQs
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {form.faqs.map((faq, fIdx) => (
                      <div key={fIdx} className="p-4 rounded-2xl bg-gray-50/80 border-2 border-gray-200/80 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <span className="w-6 h-6 rounded-full bg-[#0B132B] text-[#C99A2E] text-xs font-black flex items-center justify-center shrink-0 mt-1">
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
              </div>

              {activeTab !== 'all' && (
                <div className="pt-4 flex items-center justify-between border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => setActiveTab('batches')} 
                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-bold transition-all"
                  >
                    ← Back: Batches & Faculty
                  </button>
                  <button 
                    type="button" 
                    onClick={handleSubmit} 
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 transition-all shadow-md"
                  >
                    <Save size={15} /> Save & Finish
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Column: Sticky Live Preview */}
        <div className={`w-full lg:w-96 shrink-0 lg:sticky lg:top-24 space-y-4 ${showPreviewMobile ? 'block' : 'hidden lg:block'}`}>
          <div className="flex items-center justify-between px-3 py-1.5 bg-white rounded-2xl shadow-xs border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-700">Live Course Card</span>
            </div>
            <span className="text-[10px] font-bold text-gray-400">Real-time Preview</span>
          </div>

          <motion.div
            initial={false}
            animate={{ 
              y: form.popular ? -2 : 0, 
              boxShadow: form.popular ? `0 16px 40px ${form.color}25` : '0 10px 30px rgba(0,0,0,0.06)',
              borderColor: form.popular ? '#C99A2E' : '#e5e7eb'
            }}
            className="flex flex-col rounded-3xl overflow-hidden border-2 bg-white transition-all duration-300 w-full shadow-lg"
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
              <h3 className="font-black text-lg leading-tight mb-1">{form.name || 'Course Name'}</h3>
              <p className="text-white/80 text-xs line-clamp-2">{form.subtitle || 'Course subtitle will appear here'}</p>
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
                      <span key={sIdx} className="px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 text-[11px] font-bold text-gray-800 flex items-center gap-1">
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
                <button className="w-full py-2.5 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-1.5 shadow-md"
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
                <span className="text-base font-black text-[#0B132B]">₹{form.fee ? Number(form.fee).toLocaleString() : '0'}</span>
              </div>
            </div>
          </motion.div>
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
