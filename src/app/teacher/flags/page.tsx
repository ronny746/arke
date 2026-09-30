"use client";

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/index.jsx';
import { teacherAPI } from '@/api/teacher';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock3, 
  Search, 
  Sparkles, 
  BookOpen, 
  User, 
  Layers, 
  Plus, 
  Trash2, 
  X, 
  Check, 
  Loader2,
  GraduationCap,
  ListFilter,
  CheckSquare,
  Square,
  FileText,
  Clock,
  Eye,
  Award,
  Calendar,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface TopicFlag {
  _id: string;
  flag: 'RED' | 'YELLOW' | 'GREEN';
  percentage: number;
  subjectName: string;
  topicName: string;
  studentId?: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
    metadata?: { rollNo?: string };
  };
  examId?: {
    _id: string;
    title: string;
  };
  remedialSessionId?: {
    _id: string;
    title?: string;
    status?: string;
  };
}

export default function TeacherFlagsPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get('tab') === 'dpps' ? 'ASSIGNED_DPPS' : 'FLAGS';
  const [activeViewTab, setActiveViewTab] = useState<'FLAGS' | 'ASSIGNED_DPPS'>(initialTab);

  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam === 'dpps') {
      setActiveViewTab('ASSIGNED_DPPS');
    } else if (tabParam === 'flags') {
      setActiveViewTab('FLAGS');
    }
  }, [searchParams]);

  const [batches, setBatches] = useState<Array<{ _id: string; name: string; section?: string }>>([]);
  const [batchId, setBatchId] = useState('');
  const [flags, setFlags] = useState<TopicFlag[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters State for Topic Flags
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('ALL');
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [selectedFlag, setSelectedFlag] = useState<'ALL' | 'RED' | 'YELLOW' | 'GREEN'>('ALL');
  const [sortBy, setSortBy] = useState<'score_asc' | 'score_desc' | 'student_name' | 'topic_name'>('score_asc');

  // Multi-Topic Selection from Table
  const [selectedFlagIds, setSelectedFlagIds] = useState<string[]>([]);

  // Modal / DPP Creator State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetStudent, setTargetStudent] = useState<{ _id: string; firstName: string; lastName: string } | null>(null);
  const [selectedTopicsForDPP, setSelectedTopicsForDPP] = useState<string[]>([]);
  const [targetSubject, setTargetSubject] = useState<string>('General');
  const [dppMode, setDppMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  
  // Auto Mode State
  const [autoDifficulty, setAutoDifficulty] = useState('Easy');
  const [autoNumQuestions, setAutoNumQuestions] = useState<number>(10);
  const [generatingAuto, setGeneratingAuto] = useState(false);

  // Manual Mode State
  const [manualSubTab, setManualSubTab] = useState<'BANK' | 'CUSTOM'>('BANK');
  const [dppTitle, setDppTitle] = useState('');
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [loadingBankQuestions, setLoadingBankQuestions] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [customQuestions, setCustomQuestions] = useState<Array<{
    questionText: string;
    type: string;
    difficulty: string;
    marks: number;
    negativeMarks: number;
    options: Array<{ text: string; isCorrect: boolean }>;
    explanation: string;
  }>>([]);
  const [savingManual, setSavingManual] = useState(false);

  // Assigned DPPs Tab State
  const [assignedDpps, setAssignedDpps] = useState<any[]>([]);
  const [loadingAssignedDpps, setLoadingAssignedDpps] = useState(false);
  const [dppFilterStudentId, setDppFilterStudentId] = useState('ALL');
  const [dppFilterStatus, setDppFilterStatus] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [dppSearchQuery, setDppSearchQuery] = useState('');

  // Result & Question Analysis Modal State
  const [reviewSession, setReviewSession] = useState<any | null>(null);
  const [loadingReviewSession, setLoadingReviewSession] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Load Batches on Mount
  useEffect(() => {
    teacherAPI.getViewBatches()
      .then(res => {
        const list = res.data?.data || [];
        setBatches(list);
        if (list.length > 0) {
          setBatchId(list[0]._id);
        }
      })
      .catch(() => setBatches([]));
  }, []);

  // Fetch Topic Flags when Batch changes
  const fetchFlags = () => {
    if (!batchId) return;
    setLoading(true);
    teacherAPI.getBatchTopicFlags(batchId)
      .then(res => setFlags(res.data?.data || []))
      .catch(() => setFlags([]))
      .finally(() => setLoading(false));
  };

  // Fetch Assigned DPPs
  const fetchAssignedDpps = () => {
    setLoadingAssignedDpps(true);
    teacherAPI.getAssignedDPPs({ sessionType: 'DPP' })
      .then(res => {
        setAssignedDpps(res.data?.data || []);
      })
      .catch(() => setAssignedDpps([]))
      .finally(() => setLoadingAssignedDpps(false));
  };

  useEffect(() => {
    fetchFlags();
    fetchAssignedDpps();
    setSelectedStudentId('ALL');
    setSelectedFlagIds([]);
  }, [batchId]);

  // Open Full DPP Result Modal for Teacher
  const handleOpenDppResultReview = async (sessionId: string) => {
    if (!sessionId) return;
    try {
      setLoadingReviewSession(true);
      setIsReviewModalOpen(true);
      const res = await teacherAPI.getDPPSession(sessionId);
      setReviewSession(res.data?.data || null);
    } catch (error: any) {
      toast.error('Failed to load DPP result analysis');
      setIsReviewModalOpen(false);
    } finally {
      setLoadingReviewSession(false);
    }
  };

  // Unique Students List for Filtering Flags
  const uniqueStudents = useMemo(() => {
    const map = new Map<string, { _id: string; name: string; rollNo?: string }>();
    flags.forEach(f => {
      if (f.studentId?._id) {
        map.set(f.studentId._id, {
          _id: f.studentId._id,
          name: `${f.studentId.firstName || ''} ${f.studentId.lastName || ''}`.trim() || 'Student',
          rollNo: f.studentId.metadata?.rollNo
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [flags]);

  // Unique Students for Assigned DPPs Filter
  const uniqueDppStudents = useMemo(() => {
    const map = new Map<string, { _id: string; name: string; rollNo?: string }>();
    assignedDpps.forEach(d => {
      if (d.student?._id) {
        map.set(d.student._id, {
          _id: d.student._id,
          name: `${d.student.firstName || ''} ${d.student.lastName || ''}`.trim() || 'Student',
          rollNo: d.student.metadata?.rollNo
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [assignedDpps]);

  // Unique Subjects List for Filtering Flags
  const availableSubjects = useMemo(() => {
    const subs = new Set<string>();
    flags.forEach(f => {
      if (f.subjectName) subs.add(f.subjectName);
    });
    return Array.from(subs).sort();
  }, [flags]);

  // Filtered & Sorted Flags
  const filteredFlags = useMemo(() => {
    return flags.filter(flag => {
      // Student filter
      if (selectedStudentId !== 'ALL' && flag.studentId?._id !== selectedStudentId) return false;

      // Flag type filter
      if (selectedFlag !== 'ALL' && flag.flag !== selectedFlag) return false;
      
      // Subject filter
      if (selectedSubject !== 'ALL' && flag.subjectName !== selectedSubject) return false;
      
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const fullName = `${flag.studentId?.firstName || ''} ${flag.studentId?.lastName || ''}`.toLowerCase();
        const roll = (flag.studentId?.metadata?.rollNo || '').toLowerCase();
        const topic = (flag.topicName || '').toLowerCase();
        const subject = (flag.subjectName || '').toLowerCase();
        if (!fullName.includes(query) && !roll.includes(query) && !topic.includes(query) && !subject.includes(query)) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'score_asc') return a.percentage - b.percentage;
      if (sortBy === 'score_desc') return b.percentage - a.percentage;
      if (sortBy === 'student_name') {
        const nameA = `${a.studentId?.firstName || ''} ${a.studentId?.lastName || ''}`;
        const nameB = `${b.studentId?.firstName || ''} ${b.studentId?.lastName || ''}`;
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'topic_name') {
        return (a.topicName || '').localeCompare(b.topicName || '');
      }
      return 0;
    });
  }, [flags, selectedStudentId, selectedFlag, selectedSubject, searchQuery, sortBy]);

  // Filtered Assigned DPPs
  const filteredAssignedDpps = useMemo(() => {
    return assignedDpps.filter(d => {
      if (dppFilterStudentId !== 'ALL' && d.student?._id !== dppFilterStudentId) return false;

      if (dppFilterStatus === 'COMPLETED' && d.status !== 'COMPLETED') return false;
      if (dppFilterStatus === 'IN_PROGRESS' && (d.status !== 'IN_PROGRESS' || !d.answers || d.answers.length === 0)) return false;
      if (dppFilterStatus === 'PENDING' && (d.status === 'COMPLETED' || (d.answers && d.answers.length > 0))) return false;

      if (dppSearchQuery.trim()) {
        const q = dppSearchQuery.toLowerCase().trim();
        const title = (d.title || '').toLowerCase();
        const studentName = `${d.student?.firstName || ''} ${d.student?.lastName || ''}`.toLowerCase();
        const roll = (d.student?.metadata?.rollNo || '').toLowerCase();
        const subject = (d.filters?.subject || '').toLowerCase();
        const topics = (d.filters?.topics || []).map((t: string) => t.toLowerCase()).join(' ');
        if (!title.includes(q) && !studentName.includes(q) && !roll.includes(q) && !subject.includes(q) && !topics.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [assignedDpps, dppFilterStudentId, dppFilterStatus, dppSearchQuery]);

  // Metric counts for Flags
  const stats = useMemo(() => {
    let red = 0, yellow = 0, green = 0;
    flags.forEach(f => {
      if (f.flag === 'RED') red++;
      else if (f.flag === 'YELLOW') yellow++;
      else if (f.flag === 'GREEN') green++;
    });
    return { total: flags.length, red, yellow, green };
  }, [flags]);

  // Metric counts for Assigned DPPs
  const dppStats = useMemo(() => {
    const total = assignedDpps.length;
    let completed = 0;
    let inProgress = 0;
    let pending = 0;
    let totalScore = 0;
    let totalPossible = 0;

    assignedDpps.forEach(d => {
      if (d.status === 'COMPLETED') {
        completed++;
        totalScore += (d.score || 0);
        totalPossible += (d.totalMarks || (d.totalQuestions * 4) || 0);
      } else if (d.answers && d.answers.length > 0) {
        inProgress++;
      } else {
        pending++;
      }
    });

    const avgAccuracy = totalPossible > 0 ? ((totalScore / totalPossible) * 100).toFixed(1) : '0.0';

    return { total, completed, inProgress, pending, avgAccuracy };
  }, [assignedDpps]);

  // Topics available for currently targeted student in modal
  const studentAvailableTopics = useMemo(() => {
    if (!targetStudent?._id) return [];
    return flags.filter(f => f.studentId?._id === targetStudent._id);
  }, [flags, targetStudent]);

  // Open Modal for Single Flag
  const handleOpenSingleDPP = (flag: TopicFlag) => {
    if (!flag.studentId) return;
    setTargetStudent({
      _id: flag.studentId._id,
      firstName: flag.studentId.firstName,
      lastName: flag.studentId.lastName
    });
    setTargetSubject(flag.subjectName || 'General');
    setSelectedTopicsForDPP([flag.topicName]);
    setDppMode('AUTO');
    setAutoDifficulty(flag.percentage < 35 ? 'Easy' : 'Medium');
    setAutoNumQuestions(5);
    setDppTitle(`Remedial DPP: ${flag.topicName} for ${flag.studentId.firstName}`);
    setSelectedQuestionIds([]);
    setCustomQuestions([]);
    setManualSubTab('BANK');
    setIsModalOpen(true);

    fetchBankQuestionsForTopics(flag.subjectName, [flag.topicName]);
  };

  // Open Modal for Multiple Selected Flags or Selected Student
  const handleOpenMultiTopicDPP = (studentOverride?: { _id: string; firstName: string; lastName: string }) => {
    const student = studentOverride || (selectedStudentId !== 'ALL' 
      ? uniqueStudents.find(s => s._id === selectedStudentId) 
      : null);

    if (!student) {
      toast.error('Please filter by a specific student or select topic rows first.');
      return;
    }

    const studentFlags = flags.filter(f => f.studentId?._id === student._id);
    let topicsToSelect: string[] = [];
    
    if (selectedFlagIds.length > 0) {
      const selectedFlagObjects = flags.filter(f => selectedFlagIds.includes(f._id) && f.studentId?._id === student._id);
      topicsToSelect = selectedFlagObjects.map(f => f.topicName);
    }
    
    if (topicsToSelect.length === 0) {
      const weakFlags = studentFlags.filter(f => f.flag === 'RED' || f.flag === 'YELLOW');
      topicsToSelect = weakFlags.map(f => f.topicName);
    }

    if (topicsToSelect.length === 0 && studentFlags.length > 0) {
      topicsToSelect = [studentFlags[0].topicName];
    }

    setTargetStudent({
      _id: student._id,
      firstName: 'firstName' in student ? (student as any).firstName : student.name.split(' ')[0],
      lastName: 'lastName' in student ? (student as any).lastName : student.name.split(' ').slice(1).join(' ')
    });

    const primarySubject = studentFlags[0]?.subjectName || 'General';
    setTargetSubject(primarySubject);
    setSelectedTopicsForDPP(topicsToSelect);
    setDppMode('AUTO');
    setAutoDifficulty('Easy');
    setAutoNumQuestions(Math.min(30, Math.max(10, topicsToSelect.length * 3)));
    setDppTitle(`Multi-Topic Remedial DPP: ${topicsToSelect.slice(0, 3).join(', ')}${topicsToSelect.length > 3 ? '...' : ''}`);
    setSelectedQuestionIds([]);
    setCustomQuestions([]);
    setManualSubTab('BANK');
    setIsModalOpen(true);

    fetchBankQuestionsForTopics(primarySubject, topicsToSelect);
  };

  // Fetch Questions from Question Bank matching chosen topics
  const fetchBankQuestionsForTopics = (subjectName: string, topics: string[]) => {
    setLoadingBankQuestions(true);
    const params: any = {
      topics: topics.join(','),
      limit: 50
    };
    if (subjectName && !['General', 'ALL', 'test', 'Test'].includes(subjectName)) {
      params.subjectName = subjectName;
    }
    teacherAPI.getQuestionsForTopic(params)
      .then(res => {
        setBankQuestions(res.data?.data || []);
      })
      .catch(() => setBankQuestions([]))
      .finally(() => setLoadingBankQuestions(false));
  };

  // Toggle topic in modal
  const handleToggleTopicInModal = (topicName: string) => {
    setSelectedTopicsForDPP(prev => {
      const next = prev.includes(topicName) 
        ? prev.filter(t => t !== topicName)
        : [...prev, topicName];
      
      fetchBankQuestionsForTopics(targetSubject, next);
      return next;
    });
  };

  // Close Modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTargetStudent(null);
    setSelectedTopicsForDPP([]);
  };

  // Auto Generate Multi-Topic DPP
  const handleGenerateAutoDPP = async () => {
    if (!targetStudent?._id) {
      toast.error('Invalid student selection');
      return;
    }
    if (selectedTopicsForDPP.length === 0) {
      toast.error('Please select at least 1 topic for the DPP.');
      return;
    }

    try {
      setGeneratingAuto(true);

      const subjectTopicPairs = selectedTopicsForDPP.map(top => ({
        subject: targetSubject,
        topic: top
      }));

      const matchedFlagIds = flags
        .filter(f => f.studentId?._id === targetStudent._id && selectedTopicsForDPP.includes(f.topicName))
        .map(f => f._id);

      const res = await teacherAPI.generateDPP({
        sessionType: 'DPP',
        targetStudentId: targetStudent._id,
        subject: targetSubject,
        topics: selectedTopicsForDPP,
        subjectTopicPairs,
        difficulty: autoDifficulty,
        numberOfQuestions: autoNumQuestions,
        flagIds: matchedFlagIds
      });

      if (res.data?.success) {
        toast.success(`Multi-Topic Remedial DPP (${selectedTopicsForDPP.length} topics) assigned to ${targetStudent.firstName}!`);
        handleCloseModal();
        setSelectedFlagIds([]);
        fetchFlags();
        fetchAssignedDpps();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate DPP from Question Bank');
    } finally {
      setGeneratingAuto(false);
    }
  };

  // Toggle selection of bank question
  const toggleSelectBankQuestion = (id: string) => {
    setSelectedQuestionIds(prev => 
      prev.includes(id) ? prev.filter(qId => qId !== id) : [...prev, id]
    );
  };

  // Add Custom Question draft
  const handleAddCustomQuestionDraft = () => {
    setCustomQuestions(prev => [
      ...prev,
      {
        questionText: '',
        type: 'MCQ',
        difficulty: 'Medium',
        marks: 4,
        negativeMarks: 1,
        options: [
          { text: '', isCorrect: true },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false }
        ],
        explanation: ''
      }
    ]);
  };

  // Save Manual DPP
  const handleSaveManualDPP = async () => {
    if (!targetStudent?._id) {
      toast.error('Invalid student selection');
      return;
    }

    const validCustomQuestions = customQuestions.filter(q => q.questionText.trim() && q.options.some(o => o.text.trim()));

    if (selectedQuestionIds.length === 0 && validCustomQuestions.length === 0) {
      toast.error('Please select questions from Question Bank or write at least 1 custom question.');
      return;
    }

    try {
      setSavingManual(true);
      const matchedFlagIds = flags
        .filter(f => f.studentId?._id === targetStudent._id && selectedTopicsForDPP.includes(f.topicName))
        .map(f => f._id);

      const res = await teacherAPI.createManualDPP({
        sessionType: 'DPP',
        targetStudentId: targetStudent._id,
        title: dppTitle.trim() || `Remedial DPP: ${targetSubject} (${selectedTopicsForDPP.join(', ')})`,
        subject: targetSubject,
        topics: selectedTopicsForDPP,
        questionIds: selectedQuestionIds,
        questions: validCustomQuestions,
        flagIds: matchedFlagIds
      });

      if (res.data?.success) {
        toast.success(`Custom Multi-Topic DPP assigned to ${targetStudent.firstName}!`);
        handleCloseModal();
        setSelectedFlagIds([]);
        fetchFlags();
        fetchAssignedDpps();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create manual DPP');
    } finally {
      setSavingManual(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12 animate-fade-in">
      <PageHeader 
        title="Student Topic Analysis & Remedial DPP Engine" 
        subtitle="Monitor accuracy against threshold limits, create auto/manual DPPs, and track student results." 
      />

      {/* Top View Selector Tabs */}
      <div className="flex border-b border-gray-200 bg-white rounded-2xl p-1.5 shadow-sm gap-1 max-w-lg">
        <button
          onClick={() => setActiveViewTab('FLAGS')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeViewTab === 'FLAGS'
              ? 'bg-[#1a7a35] text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Layers size={17} />
          <span>Topic Evaluations & Creator</span>
          {stats.red > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeViewTab === 'FLAGS' ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-700'}`}>
              {stats.red} Red
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveViewTab('ASSIGNED_DPPS')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeViewTab === 'ASSIGNED_DPPS'
              ? 'bg-[#1a7a35] text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Sparkles size={17} />
          <span>Created DPPs & Results ({assignedDpps.length})</span>
        </button>
      </div>

      {/* VIEW 1: TOPIC PERFORMANCE & REMEDIAL FLAGS */}
      {activeViewTab === 'FLAGS' && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Layers size={24} />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">{stats.total}</p>
                <p className="text-xs font-semibold text-gray-500">Evaluations Analyzed</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <p className="text-2xl font-black text-rose-600">{stats.red}</p>
                <p className="text-xs font-semibold text-gray-500">Critical Weak Topics (Red)</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock3 size={24} />
              </div>
              <div>
                <p className="text-2xl font-black text-amber-600">{stats.yellow}</p>
                <p className="text-xs font-semibold text-gray-500">Moderate Practice (Yellow)</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-600">{stats.green}</p>
                <p className="text-xs font-semibold text-gray-500">On Track Topics (Green)</p>
              </div>
            </div>
          </div>

          {/* Control & Filter Toolbar */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            {/* Row 1: Batch & Student Pickers */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Batch Selector */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                  <GraduationCap size={14} className="text-[#1a7a35]" /> Select Batch:
                </label>
                <select 
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1a7a35]/20 focus:border-[#1a7a35]"
                  value={batchId} 
                  onChange={e => setBatchId(e.target.value)}
                >
                  {batches.map(batch => (
                    <option key={batch._id} value={batch._id}>
                      {batch.name} {batch.section ? `(${batch.section})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dedicated Student Filter Dropdown */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                  <User size={14} className="text-blue-600" /> Filter by Student:
                </label>
                <select
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="ALL">All Students in Batch ({uniqueStudents.length})</option>
                  {uniqueStudents.map(student => (
                    <option key={student._id} value={student._id}>
                      {student.name} {student.rollNo ? `(Roll: ${student.rollNo})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Box */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                  <Search size={14} className="text-gray-400" /> Keyword Search:
                </label>
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Search topic, subject, student..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a7a35]/20 focus:border-[#1a7a35]"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* Row 2: Secondary Status & Sort Filters + Action CTA */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {/* Status Filter Buttons */}
                <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                  <button
                    onClick={() => setSelectedFlag('ALL')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${selectedFlag === 'ALL' ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    All ({flags.length})
                  </button>
                  <button
                    onClick={() => setSelectedFlag('RED')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${selectedFlag === 'RED' ? 'bg-rose-500 text-white shadow-xs' : 'text-rose-600 hover:text-rose-800'}`}
                  >
                    🔴 Red ({stats.red})
                  </button>
                  <button
                    onClick={() => setSelectedFlag('YELLOW')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${selectedFlag === 'YELLOW' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-600 hover:text-amber-800'}`}
                  >
                    🟡 Yellow ({stats.yellow})
                  </button>
                  <button
                    onClick={() => setSelectedFlag('GREEN')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${selectedFlag === 'GREEN' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:text-emerald-900'}`}
                  >
                    🟢 Green ({stats.green})
                  </button>
                </div>

                {/* Subject Dropdown */}
                {availableSubjects.length > 0 && (
                  <select
                    value={selectedSubject}
                    onChange={e => setSelectedSubject(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 focus:outline-none"
                  >
                    <option value="ALL">All Subjects ({availableSubjects.length})</option>
                    {availableSubjects.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Right Side: Multi-Topic Action or Sort */}
              <div className="flex items-center gap-3 ml-auto">
                {(selectedStudentId !== 'ALL' || selectedFlagIds.length > 0) && (
                  <button
                    onClick={() => handleOpenMultiTopicDPP()}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1a7a35] hover:bg-[#146029] text-white shadow-md flex items-center gap-1.5 transition-all"
                  >
                    <Sparkles size={14} />
                    <span>Create Multi-Topic DPP {selectedFlagIds.length > 0 ? `(${selectedFlagIds.length} Selected)` : ''}</span>
                  </button>
                )}

                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400 font-medium">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    className="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 focus:outline-none"
                  >
                    <option value="score_asc">Score (Lowest First)</option>
                    <option value="score_desc">Score (Highest First)</option>
                    <option value="student_name">Student Name (A-Z)</option>
                    <option value="topic_name">Topic Name (A-Z)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Main Analysis Table */}
          {loading ? (
            <div className="bg-white rounded-2xl p-12 border border-gray-100 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="animate-spin text-[#1a7a35]" size={32} />
              <p className="text-sm text-gray-500 font-medium">Analyzing batch performance results against threshold limits…</p>
            </div>
          ) : filteredFlags.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="font-bold text-gray-800 text-base">No Matching Topic Evaluations Found</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {searchQuery || selectedSubject !== 'ALL' || selectedFlag !== 'ALL' || selectedStudentId !== 'ALL'
                  ? 'Try adjusting your filters or search terms to see student topic evaluations.'
                  : 'Topic flags will populate automatically as students complete exams and tests.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-10">
                        <input 
                          type="checkbox"
                          checked={filteredFlags.length > 0 && selectedFlagIds.length === filteredFlags.length}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedFlagIds(filteredFlags.map(f => f._id));
                            } else {
                              setSelectedFlagIds([]);
                            }
                          }}
                          className="rounded text-[#1a7a35] focus:ring-[#1a7a35]"
                        />
                      </th>
                      <th className="py-3.5 px-4">Student</th>
                      <th className="py-3.5 px-4">Subject</th>
                      <th className="py-3.5 px-4">Topic / Chapter</th>
                      <th className="py-3.5 px-4">Exam Source</th>
                      <th className="py-3.5 px-4">Accuracy / Score</th>
                      <th className="py-3.5 px-4">Remedial Status</th>
                      <th className="py-3.5 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredFlags.map((flag) => {
                      const studentName = flag.studentId ? `${flag.studentId.firstName} ${flag.studentId.lastName}` : 'Unknown Student';
                      const isRed = flag.flag === 'RED';
                      const isYellow = flag.flag === 'YELLOW';
                      const isChecked = selectedFlagIds.includes(flag._id);

                      return (
                        <tr key={flag._id} className={`hover:bg-gray-50/80 transition-colors ${isChecked ? 'bg-emerald-50/30' : ''}`}>
                          
                          {/* Checkbox */}
                          <td className="py-3.5 px-4">
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setSelectedFlagIds(prev => 
                                  prev.includes(flag._id) ? prev.filter(id => id !== flag._id) : [...prev, flag._id]
                                );
                              }}
                              className="rounded text-[#1a7a35] focus:ring-[#1a7a35]"
                            />
                          </td>

                          {/* Student Info */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#1a7a35] font-black text-xs flex items-center justify-center border border-emerald-200">
                                {studentName.charAt(0)}
                              </div>
                              <div>
                                <button
                                  onClick={() => setSelectedStudentId(flag.studentId?._id || 'ALL')}
                                  className="font-bold text-gray-900 leading-tight hover:text-[#1a7a35] text-left transition-colors"
                                >
                                  {studentName}
                                </button>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  {flag.studentId?.metadata?.rollNo ? `Roll: ${flag.studentId.metadata.rollNo}` : flag.studentId?.email || 'Student'}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Subject */}
                          <td className="py-3.5 px-4">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700">
                              {flag.subjectName || 'General'}
                            </span>
                          </td>

                          {/* Topic Name */}
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-gray-800 text-xs sm:text-sm">{flag.topicName}</p>
                          </td>

                          {/* Exam Title */}
                          <td className="py-3.5 px-4 text-xs text-gray-500">
                            {flag.examId?.title || 'Course Test'}
                          </td>

                          {/* Accuracy Score & Flag */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                isRed ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                isYellow ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isRed ? 'bg-rose-500' : isYellow ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                {flag.flag} • {flag.percentage}%
                              </span>
                              <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${isRed ? 'bg-rose-500' : isYellow ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${Math.min(100, flag.percentage)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Remedial Status */}
                          <td className="py-3.5 px-4">
                            {flag.remedialSessionId ? (
                              <button
                                onClick={() => handleOpenDppResultReview(typeof flag.remedialSessionId === 'string' ? flag.remedialSessionId : (flag.remedialSessionId as any)._id)}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
                              >
                                <Check size={13} />
                                <span>Remedy Assigned</span>
                                <ExternalLink size={11} className="opacity-70" />
                              </button>
                            ) : isRed || isYellow ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                                <AlertTriangle size={13} /> Needs DPP
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-gray-400">
                                No action needed
                              </span>
                            )}
                          </td>

                          {/* Action Button */}
                          <td className="py-3.5 px-5 text-right">
                            <button
                              onClick={() => handleOpenSingleDPP(flag)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                                isRed 
                                  ? 'bg-rose-600 text-white hover:bg-rose-700' 
                                  : isYellow 
                                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              <Sparkles size={13} />
                              <span>{flag.remedialSessionId ? 'Re-assign DPP' : 'Create DPP'}</span>
                            </button>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: ASSIGNED DPPS & RESULTS */}
      {activeViewTab === 'ASSIGNED_DPPS' && (
        <div className="space-y-6">
          {/* DPP KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <FileText size={24} />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">{dppStats.total}</p>
                <p className="text-xs font-semibold text-gray-500">Total Created DPPs</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-2xl font-black text-amber-600">{dppStats.pending + dppStats.inProgress}</p>
                <p className="text-xs font-semibold text-gray-500">Pending / In Progress</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-600">{dppStats.completed}</p>
                <p className="text-xs font-semibold text-gray-500">Completed by Students</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Award size={24} />
              </div>
              <div>
                <p className="text-2xl font-black text-purple-600">{dppStats.avgAccuracy}%</p>
                <p className="text-xs font-semibold text-gray-500">Avg Student Score</p>
              </div>
            </div>
          </div>

          {/* DPP Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search student, title, topic..."
                  value={dppSearchQuery}
                  onChange={e => setDppSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs focus:ring-2 focus:ring-[#1a7a35]"
                />
              </div>

              {uniqueDppStudents.length > 0 && (
                <select
                  value={dppFilterStudentId}
                  onChange={e => setDppFilterStudentId(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 focus:outline-none"
                >
                  <option value="ALL">All Students ({uniqueDppStudents.length})</option>
                  {uniqueDppStudents.map(s => (
                    <option key={s._id} value={s._id}>{s.name} {s.rollNo ? `(Roll: ${s.rollNo})` : ''}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setDppFilterStatus('ALL')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${dppFilterStatus === 'ALL' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setDppFilterStatus('PENDING')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${dppFilterStatus === 'PENDING' ? 'bg-amber-500 text-white shadow-xs' : 'text-gray-500'}`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setDppFilterStatus('COMPLETED')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${dppFilterStatus === 'COMPLETED' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-500'}`}
                >
                  Completed ({dppStats.completed})
                </button>
              </div>

              <button
                onClick={fetchAssignedDpps}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                title="Refresh List"
              >
                <Clock3 size={15} />
              </button>
            </div>
          </div>

          {/* Assigned DPPs Table */}
          {loadingAssignedDpps ? (
            <div className="bg-white rounded-3xl p-12 border border-gray-100 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="animate-spin text-[#1a7a35]" size={32} />
              <p className="text-sm font-semibold text-gray-500">Loading created DPP assignments...</p>
            </div>
          ) : filteredAssignedDpps.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-gray-100 text-center space-y-3 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto">
                <FileText size={28} />
              </div>
              <h3 className="text-base font-bold text-gray-800">No Assigned DPPs Found</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Use the "Topic Evaluations & Creator" tab above to assign single or multi-topic remedial DPPs directly to students.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-3.5 px-5">Target Student</th>
                      <th className="py-3.5 px-4">DPP Title & Subject</th>
                      <th className="py-3.5 px-4">Weak Topics Included</th>
                      <th className="py-3.5 px-4 text-center">Questions</th>
                      <th className="py-3.5 px-4 text-center">Student Score</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Date Assigned</th>
                      <th className="py-3.5 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAssignedDpps.map((dpp) => {
                      const studentName = dpp.student ? `${dpp.student.firstName} ${dpp.student.lastName || ''}` : 'Unknown Student';
                      const isCompleted = dpp.status === 'COMPLETED';
                      const isStarted = dpp.answers && dpp.answers.length > 0;
                      const topicsList = dpp.filters?.topics || (dpp.filters?.topic ? [dpp.filters.topic] : []);
                      const pct = dpp.totalMarks > 0 ? ((dpp.score / dpp.totalMarks) * 100).toFixed(0) : '0';

                      return (
                        <tr key={dpp._id} className="hover:bg-gray-50/70 transition-colors">
                          {/* Student */}
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-emerald-50 text-[#1a7a35] font-black text-xs flex items-center justify-center border border-emerald-200">
                                {studentName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 text-xs">{studentName}</p>
                                <p className="text-[10px] text-gray-400">
                                  {dpp.student?.metadata?.rollNo ? `Roll: ${dpp.student.metadata.rollNo}` : dpp.student?.email || ''}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Title & Subject */}
                          <td className="py-3.5 px-4">
                            <div>
                              <p className="font-bold text-gray-800 text-xs">{dpp.title}</p>
                              <span className="text-[10px] font-semibold text-gray-500">
                                Subject: <strong>{dpp.filters?.subject || 'General'}</strong>
                              </span>
                            </div>
                          </td>

                          {/* Topics */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {topicsList.map((t: string, idx: number) => (
                                <span key={idx} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Questions */}
                          <td className="py-3.5 px-4 text-center font-bold text-gray-700 text-xs">
                            {dpp.totalQuestions}
                          </td>

                          {/* Student Score */}
                          <td className="py-3.5 px-4 text-center">
                            {isCompleted ? (
                              <div>
                                <span className="font-bold text-xs text-[#1a7a35]">{dpp.score}</span>
                                <span className="text-[10px] text-gray-400"> / {dpp.totalMarks}</span>
                                <p className="text-[10px] font-semibold text-gray-500">{pct}% Acc.</p>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 font-medium">—</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            {isCompleted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 size={11} /> Completed
                              </span>
                            ) : isStarted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <Clock size={11} /> In Progress
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock3 size={11} /> Pending
                              </span>
                            )}
                          </td>

                          {/* Date Assigned */}
                          <td className="py-3.5 px-4 text-xs text-gray-500 whitespace-nowrap">
                            {new Date(dpp.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </td>

                          {/* Action */}
                          <td className="py-3.5 px-5 text-right">
                            <button
                              onClick={() => handleOpenDppResultReview(dpp._id)}
                              className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-[#1a7a35] hover:bg-[#146029] text-white shadow-xs flex items-center gap-1.5 ml-auto transition-all"
                            >
                              <Eye size={13} />
                              <span>{isCompleted ? 'Check Result' : 'View Question Set'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE / ASSIGN MULTI-TOPIC REMEDIAL DPP MODAL */}
      <AnimatePresence>
        {isModalOpen && targetStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white">
                      Remedial Generator
                    </span>
                    <span className="text-xs text-gray-300">
                      {selectedTopicsForDPP.length} Topic{selectedTopicsForDPP.length === 1 ? '' : 's'} Selected
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    Assign Remedial DPP for {targetStudent.firstName} {targetStudent.lastName}
                  </h3>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Subject: <strong className="text-white">{targetSubject}</strong> • Choose topics and configure auto/manual question set
                  </p>
                </div>
                <button 
                  onClick={handleCloseModal}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="flex border-b border-gray-100 bg-gray-50 px-6 pt-3 gap-2">
                <button
                  onClick={() => setDppMode('AUTO')}
                  className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
                    dppMode === 'AUTO' 
                      ? 'border-[#1a7a35] text-[#1a7a35]' 
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Sparkles size={16} /> ⚡ Automatic Generation (Smart Bank Pick)
                </button>
                <button
                  onClick={() => setDppMode('MANUAL')}
                  className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
                    dppMode === 'MANUAL' 
                      ? 'border-[#1a7a35] text-[#1a7a35]' 
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <BookOpen size={16} /> ✍️ Manual Question Pick & Custom Authoring
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
                {/* TOPIC SELECTION PILLS */}
                <div className="space-y-2 p-4 rounded-2xl bg-gray-50 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <ListFilter size={14} className="text-[#1a7a35]" /> Select Topics to Include in this DPP:
                    </label>
                    <span className="text-[11px] font-bold text-[#1a7a35]">
                      {selectedTopicsForDPP.length} of {studentAvailableTopics.length} selected
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {studentAvailableTopics.map(st => {
                      const isSelected = selectedTopicsForDPP.includes(st.topicName);
                      const isRed = st.flag === 'RED';
                      const isYellow = st.flag === 'YELLOW';

                      return (
                        <button
                          key={st._id}
                          type="button"
                          onClick={() => handleToggleTopicInModal(st.topicName)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                            isSelected
                              ? 'bg-[#1a7a35] text-white shadow-xs'
                              : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {isSelected ? <CheckSquare size={13} /> : <Square size={13} className="text-gray-400" />}
                          <span>{st.topicName}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                            isSelected 
                              ? 'bg-white/20 text-white' 
                              : isRed ? 'bg-rose-100 text-rose-700' : isYellow ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {st.percentage}%
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* MODE 1: AUTO GENERATE */}
                {dppMode === 'AUTO' && (
                  <div className="space-y-5">
                    <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 text-xs text-emerald-900 leading-relaxed">
                      💡 <strong>Smart Multi-Topic Sampling:</strong> The system will automatically pick balanced questions across all <strong>{selectedTopicsForDPP.length} selected topic(s)</strong> from the Question Bank.
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Difficulty Selector */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700">Target Difficulty Level</label>
                        <select
                          value={autoDifficulty}
                          onChange={e => setAutoDifficulty(e.target.value)}
                          className="w-full p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-[#1a7a35]"
                        >
                          <option value="Easy">Easy (Recommended for Concept Rebuilding)</option>
                          <option value="Medium">Medium (Standard Exam Practice)</option>
                          <option value="Hard">Hard (Advanced Level Problems)</option>
                        </select>
                      </div>

                      {/* Question Count */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700">Total Questions to Sample</label>
                        <select
                          value={autoNumQuestions}
                          onChange={e => setAutoNumQuestions(Number(e.target.value))}
                          className="w-full p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-[#1a7a35]"
                        >
                          <option value={5}>5 Questions (~15 mins)</option>
                          <option value={10}>10 Questions (~30 mins)</option>
                          <option value={15}>15 Questions (~45 mins)</option>
                          <option value={20}>20 Questions (~60 mins)</option>
                          <option value={30}>30 Questions (Full test set)</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600 space-y-1">
                      <p>• <strong>Subject:</strong> {targetSubject}</p>
                      <p>• <strong>Selected Topics ({selectedTopicsForDPP.length}):</strong> {selectedTopicsForDPP.join(', ')}</p>
                      <p>• <strong>Target Student:</strong> {targetStudent.firstName} {targetStudent.lastName}</p>
                      <p>• <strong>Student Access:</strong> The student will immediately see this DPP in their portal under <em>Daily Practice (DPP)</em>.</p>
                    </div>
                  </div>
                )}

                {/* MODE 2: MANUAL DPP */}
                {dppMode === 'MANUAL' && (
                  <div className="space-y-5">
                    {/* DPP Title Input */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">DPP Title</label>
                      <input 
                        type="text"
                        value={dppTitle}
                        onChange={e => setDppTitle(e.target.value)}
                        placeholder="e.g. Combined Physics Mechanics Remedial for Rahul"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-[#1a7a35]"
                      />
                    </div>

                    {/* Sub tabs */}
                    <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl max-w-md">
                      <button
                        onClick={() => setManualSubTab('BANK')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${manualSubTab === 'BANK' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                      >
                        Pick from Question Bank ({selectedQuestionIds.length} Selected)
                      </button>
                      <button
                        onClick={() => setManualSubTab('CUSTOM')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${manualSubTab === 'CUSTOM' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                      >
                        Write Custom Question ({customQuestions.length} Added)
                      </button>
                    </div>

                    {/* Sub Tab 1: Pick from Bank */}
                    {manualSubTab === 'BANK' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
                          <span>Questions from: {selectedTopicsForDPP.join(', ')}</span>
                          <span className="text-[#1a7a35] font-bold">{selectedQuestionIds.length} questions selected</span>
                        </div>

                        {loadingBankQuestions ? (
                          <div className="p-8 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                            <Loader2 className="animate-spin text-[#1a7a35]" size={16} /> Loading question bank items...
                          </div>
                        ) : bankQuestions.length === 0 ? (
                          <div className="p-6 rounded-2xl bg-gray-50 border border-dashed border-gray-200 text-center text-xs text-gray-500">
                            No pre-existing questions found in Question Bank for these topics. You can author custom questions using the "Write Custom Question" tab.
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                            {bankQuestions.map((q, idx) => {
                              const isSelected = selectedQuestionIds.includes(q._id);
                              return (
                                <div 
                                  key={q._id || idx}
                                  onClick={() => toggleSelectBankQuestion(q._id)}
                                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                                    isSelected 
                                      ? 'border-[#1a7a35] bg-emerald-50/50 ring-1 ring-[#1a7a35]' 
                                      : 'border-gray-200 bg-white hover:border-gray-300'
                                  }`}
                                >
                                  <input 
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}}
                                    className="mt-1 rounded text-[#1a7a35] focus:ring-[#1a7a35]"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                        Q{idx + 1}
                                      </span>
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-[#1a7a35] border border-emerald-200">
                                        {q.topicName || 'Topic'}
                                      </span>
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                                        {q.difficulty || 'Medium'}
                                      </span>
                                      <span className="text-[10px] text-gray-400">
                                        Marks: +{q.marks || 4} / -{q.negativeMarks || 1}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-800 line-clamp-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: q.questionText || '' }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sub Tab 2: Custom Question Authoring */}
                    {manualSubTab === 'CUSTOM' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-gray-700">Author Custom Problems</p>
                          <button
                            type="button"
                            onClick={handleAddCustomQuestionDraft}
                            className="text-xs font-bold text-[#1a7a35] hover:underline flex items-center gap-1"
                          >
                            <Plus size={14} /> Add Question
                          </button>
                        </div>

                        {customQuestions.length === 0 ? (
                          <div className="p-8 rounded-2xl bg-gray-50 border border-dashed border-gray-200 text-center space-y-2">
                            <p className="text-xs text-gray-500">No custom questions added yet.</p>
                            <button
                              type="button"
                              onClick={handleAddCustomQuestionDraft}
                              className="px-3 py-1.5 rounded-xl bg-[#1a7a35] text-white text-xs font-bold shadow-sm"
                            >
                              + Write First Question
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {customQuestions.map((cq, qIdx) => (
                              <div key={qIdx} className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-gray-700">Question {qIdx + 1}</span>
                                  <button
                                    type="button"
                                    onClick={() => setCustomQuestions(prev => prev.filter((_, i) => i !== qIdx))}
                                    className="text-rose-500 hover:text-rose-700 text-xs font-bold flex items-center gap-1"
                                  >
                                    <Trash2 size={13} /> Remove
                                  </button>
                                </div>

                                <textarea
                                  placeholder="Enter Question Problem Statement / Text..."
                                  rows={2}
                                  value={cq.questionText}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setCustomQuestions(prev => prev.map((item, i) => i === qIdx ? { ...item, questionText: val } : item));
                                  }}
                                  className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-xs focus:ring-2 focus:ring-[#1a7a35]"
                                />

                                {/* Options */}
                                <div className="space-y-2">
                                  <p className="text-[11px] font-bold text-gray-500">Options (Select radio for correct answer):</p>
                                  {cq.options.map((opt, oIdx) => (
                                    <div key={oIdx} className="flex items-center gap-2">
                                      <input 
                                        type="radio"
                                        name={`correct_${qIdx}`}
                                        checked={opt.isCorrect}
                                        onChange={() => {
                                          setCustomQuestions(prev => prev.map((item, i) => {
                                            if (i !== qIdx) return item;
                                            return {
                                              ...item,
                                              options: item.options.map((o, idx) => ({ ...o, isCorrect: idx === oIdx }))
                                            };
                                          }));
                                        }}
                                        className="text-[#1a7a35] focus:ring-[#1a7a35]"
                                      />
                                      <input 
                                        type="text"
                                        placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                                        value={opt.text}
                                        onChange={e => {
                                          const val = e.target.value;
                                          setCustomQuestions(prev => prev.map((item, i) => {
                                            if (i !== qIdx) return item;
                                            return {
                                              ...item,
                                              options: item.options.map((o, idx) => idx === oIdx ? { ...o, text: val } : o)
                                            };
                                          }));
                                        }}
                                        className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs focus:ring-2 focus:ring-[#1a7a35]"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>

                {dppMode === 'AUTO' ? (
                  <button
                    type="button"
                    onClick={handleGenerateAutoDPP}
                    disabled={generatingAuto || selectedTopicsForDPP.length === 0}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1a7a35] hover:bg-[#146029] text-white shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {generatingAuto ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    <span>Assign Multi-Topic Auto DPP ({autoNumQuestions} Qs across {selectedTopicsForDPP.length} topics)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveManualDPP}
                    disabled={savingManual || selectedTopicsForDPP.length === 0}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1a7a35] hover:bg-[#146029] text-white shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {savingManual ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    <span>Assign Custom DPP ({selectedQuestionIds.length + customQuestions.filter(q => q.questionText.trim()).length} Qs)</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TEACHER DPP RESULT & QUESTION-BY-QUESTION ANALYSIS MODAL */}
      <AnimatePresence>
        {isReviewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-500 text-white">
                      DPP Result & Question Review
                    </span>
                    {reviewSession?.status === 'COMPLETED' ? (
                      <span className="text-xs text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                        Completed
                      </span>
                    ) : (
                      <span className="text-xs text-amber-400 font-bold bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                        {reviewSession?.status === 'IN_PROGRESS' ? 'In Progress' : 'Pending Attempt'}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    {reviewSession?.title || 'DPP Evaluation'}
                  </h3>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Student: <strong className="text-white">{reviewSession?.student?.firstName} {reviewSession?.student?.lastName || ''}</strong> {reviewSession?.student?.metadata?.rollNo ? `(Roll: ${reviewSession.student.metadata.rollNo})` : ''}
                  </p>
                </div>
                <button 
                  onClick={() => setIsReviewModalOpen(false)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar bg-gray-50/50">
                {loadingReviewSession ? (
                  <div className="p-16 flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="animate-spin text-[#1a7a35]" size={36} />
                    <p className="text-sm font-semibold text-gray-500">Loading student answers and question set...</p>
                  </div>
                ) : !reviewSession ? (
                  <div className="p-12 text-center text-gray-500">
                    Unable to load DPP session details.
                  </div>
                ) : (
                  <>
                    {/* Score KPI Overview Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                      <div className="text-center p-2 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-[11px] text-gray-500 font-bold uppercase">Total Score</p>
                        <p className="text-xl font-black text-gray-900 mt-0.5">
                          <span className={reviewSession.score < 0 ? 'text-rose-600' : 'text-[#1a7a35]'}>{reviewSession.score || 0}</span>
                          <span className="text-xs text-gray-400 font-medium"> / {reviewSession.totalMarks}</span>
                        </p>
                      </div>

                      <div className="text-center p-2 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-[11px] text-gray-500 font-bold uppercase">Accuracy</p>
                        <p className="text-xl font-black text-purple-600 mt-0.5">
                          {reviewSession.totalMarks > 0 ? ((Math.max(0, reviewSession.score) / reviewSession.totalMarks) * 100).toFixed(0) : '0'}%
                        </p>
                      </div>

                      <div className="text-center p-2 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-[11px] text-gray-500 font-bold uppercase">Time Spent</p>
                        <p className="text-xl font-black text-blue-600 mt-0.5">
                          {Math.floor((reviewSession.totalTimeSpentSeconds || 0) / 60)}m {(reviewSession.totalTimeSpentSeconds || 0) % 60}s
                        </p>
                      </div>

                      <div className="text-center p-2 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-[11px] text-gray-500 font-bold uppercase">Answered</p>
                        <p className="text-xl font-black text-gray-900 mt-0.5">
                          {reviewSession.answers?.filter((a: any) => a.selectedOptionId).length || 0}
                          <span className="text-xs text-gray-400 font-medium"> / {reviewSession.questions?.length || 0}</span>
                        </p>
                      </div>
                    </div>

                    {/* Question by Question Review */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                        <FileText size={16} className="text-[#1a7a35]" />
                        <span>Question Breakdown & Student Responses:</span>
                      </h4>

                      {reviewSession.questions?.map((q: any, idx: number) => {
                        const ans = reviewSession.answers?.find((a: any) => a.questionId === q.questionId || a.questionId === q._id);
                        const isAnswered = ans && ans.selectedOptionId;
                        const isCorrect = ans && ans.isCorrect;

                        return (
                          <div key={q.questionId || idx} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-100">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                                  Q{idx + 1}
                                </span>
                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  {q.topicName || 'Topic'}
                                </span>
                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                                  {q.difficulty || 'Medium'}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {isCorrect ? (
                                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                                    <Check size={12} /> Correct (+{q.marks || 4})
                                  </span>
                                ) : isAnswered ? (
                                  <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                                    <X size={12} /> Incorrect (-{q.negativeMarks || 1})
                                  </span>
                                ) : (
                                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                                    Unattempted (0)
                                  </span>
                                )}

                                {ans?.timeSpentSeconds ? (
                                  <span className="text-[11px] text-gray-400 font-medium">
                                    ⏱ {ans.timeSpentSeconds}s
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            {/* Question statement */}
                            <div 
                              className="text-xs sm:text-sm text-gray-900 leading-relaxed font-medium" 
                              dangerouslySetInnerHTML={{ __html: q.questionText || '' }} 
                            />

                            {/* Options */}
                            <div className="space-y-1.5 pt-1">
                              {q.options?.map((opt: any, oIdx: number) => {
                                const isThisSelected = ans && (ans.selectedOptionId === opt._id || ans.selectedOptionId === opt.id);
                                const isThisCorrect = opt.isCorrect;

                                let optStyle = 'bg-gray-50 border-gray-200 text-gray-700';
                                if (isThisCorrect) {
                                  optStyle = 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold';
                                } else if (isThisSelected && !isThisCorrect) {
                                  optStyle = 'bg-rose-50 border-rose-300 text-rose-900 font-bold';
                                }

                                return (
                                  <div 
                                    key={opt._id || oIdx}
                                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${optStyle}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-5 h-5 rounded-full bg-white border flex items-center justify-center font-bold text-[10px] shrink-0">
                                        {String.fromCharCode(65 + oIdx)}
                                      </span>
                                      <span dangerouslySetInnerHTML={{ __html: opt.text || '' }} />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {isThisSelected && (
                                        <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                                          Student Choice
                                        </span>
                                      )}
                                      {isThisCorrect && (
                                        <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-600 text-white">
                                          Correct Answer
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Explanation */}
                            {q.explanation && (
                              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-blue-900 mt-2">
                                <p className="font-bold mb-0.5">💡 Solution / Explanation:</p>
                                <div dangerouslySetInnerHTML={{ __html: q.explanation }} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                >
                  Close Review
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
