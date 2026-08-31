"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

import { Save, ArrowLeft, Upload, Search, Settings, FileText, CheckCircle, Folder, FolderOpen, ChevronRight, PlusCircle, Check } from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card } from '@/components/ui/index.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Input } from '@/components/forms/index.jsx';
import { adminAPI } from '@/api/index.js';
import toast from 'react-hot-toast';
import { AdvancedEditor } from '@/components/ui/AdvancedEditor';
import { Edit2, Trash2 } from 'lucide-react';

export default function ExamBuilder() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('settings'); // settings | questions

  // Settings State
  const [examData, setExamData] = useState({
    title: '',
    description: '',
    examType: 'INTERNAL',
    assignedClasses: [],
    settings: {
      startTime: '',
      endTime: '',
      durationMinutes: 60,
      passingMarks: 0,
      showResultsAfterSubmit: true
    },
    security: {
      requireFullScreen: true,
      disableCopyPaste: true,
      maxTabSwitchesAllowed: 3,
      enableProctoring: true,
      proctoringIntervalSeconds: 5
    }
  });

  // Questions State
  const [questions, setQuestions] = useState<any[]>([]);
  const [hierarchy, setHierarchy] = useState<any[]>([]);
  
  // Selection states
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  
  const [randomCount, setRandomCount] = useState('');
  const [isPickingRandom, setIsPickingRandom] = useState(false);

  // Explore Topic State
  const [exploreTopicState, setExploreTopicState] = useState(null);
  const [loadingExplore, setLoadingExplore] = useState(false);

  // Accordion UI state
  
  // For editing inline
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editQuestionState, setEditQuestionState] = useState<any>(null);

  const startEdit = (idx) => {
    setEditingIndex(idx);
    setEditQuestionState(JSON.parse(JSON.stringify(questions[idx]))); // deep copy
  };

  const saveEdit = () => {
    const updated = [...questions];
    updated[editingIndex] = editQuestionState;
    setQuestions(updated);
    setEditingIndex(-1);
    setEditQuestionState(null);
  };

  const cancelEdit = () => {
    setEditingIndex(-1);
    setEditQuestionState(null);
  };

  const [expandedChapter, setExpandedChapter] = useState(null);
  const [localTopicQuestions, setLocalTopicQuestions] = useState<any>({});
  const [loadingTopic, setLoadingTopic] = useState(null);
  
  // Question Source Tabs
  const [questionSourceTab, setQuestionSourceTab] = useState('SUBJECT_WISE');
  const [fullPapers, setFullPapers] = useState<any[]>([]);
  const [loadingFullPaper, setLoadingFullPaper] = useState<string | null>(null);
  const [selectedFullPaperId, setSelectedFullPaperId] = useState('');

  useEffect(() => {
    fetchHierarchy();
    fetchAvailableBatches();
    fetchFullPapers();
    if (id) {
      fetchExam();
    }
  }, [id]);

  const fetchFullPapers = async () => {
    try {
      const res = await adminAPI.getQuestionBanks({ type: 'FULL_PAPER' });
      setFullPapers(res.data?.data || []);
    } catch (error) {
      console.error("Failed to load full papers", error);
    }
  };

  const handleAddFullPaper = async (paperId: string) => {
    try {
      setLoadingFullPaper(paperId);
      const res = await adminAPI.getQuestionBankById(paperId);
      const paperQuestions = res.data?.data?.questions || [];
      if (paperQuestions.length === 0) {
        return toast.error("This paper has no questions.");
      }
      
      // Filter out questions that are already in the exam
      const existingIds = new Set(questions.map(q => q._id || q.questionText));
      const newQuestions = paperQuestions.filter(q => !existingIds.has(q._id || q.questionText) && !q.isUnpublished);
      
      if (newQuestions.length === 0) {
        return toast.error("All questions from this paper are already added.");
      }

      setQuestions([...questions, ...newQuestions]);
      toast.success(`Added ${newQuestions.length} questions from the paper!`);
    } catch (error) {
      toast.error("Failed to fetch full paper questions");
    } finally {
      setLoadingFullPaper(null);
    }
  };

  const handleRemoveQuestionsByGroup = (subjName, topicName) => {
    setQuestions(prev => prev.filter(q => {
      const qSubj = q.subject?.name || q.subjectName || hierarchy.find(s => s._id === q.subject)?.name || 'General';
      const qTopic = q.topic?.name || q.topicName || hierarchy.flatMap(s => s.chapters || []).flatMap(c => c.topics || []).find(t => t._id === q.topic)?.name || 'Unknown Topic';
      return !(qSubj === subjName && qTopic === topicName);
    }));
  };

  const ensureTopicQuestionsLoaded = async (topicId, subjectId, chapterId) => {
    if (localTopicQuestions[topicId]) return localTopicQuestions[topicId];
    const res = await adminAPI.getQuestionsByHierarchy({ subject: subjectId, chapter: chapterId, topic: topicId });
    const fetched = res.data?.data || [];
    setLocalTopicQuestions(prev => ({ ...prev, [topicId]: fetched }));
    return fetched;
  };

  const handleExploreTopic = async (topic, subjectId, chapterId) => {
    setExploreTopicState({ topic, subjectId, chapterId, questions: [] });
    setLoadingExplore(true);
    try {
      const allQs = await ensureTopicQuestionsLoaded(topic._id, subjectId, chapterId);
      setExploreTopicState({ topic, subjectId, chapterId, questions: allQs });
    } catch (err) {
      toast.error("Failed to load topic questions");
      setExploreTopicState(null);
    } finally {
      setLoadingExplore(false);
    }
  };

  const toggleExploreQuestion = (q) => {
    const isSelected = questions.some(exQ => (exQ._id || exQ.questionText) === (q._id || q.questionText));
    if (isSelected) {
      setQuestions(questions.filter(exQ => (exQ._id || exQ.questionText) !== (q._id || q.questionText)));
    } else {
      setQuestions([...questions, q]);
    }
  };

  const handleIncrementTopic = async (topic, subjectId, chapterId) => {
    // Check if we already have max questions for this topic
    const addedCount = questions.filter(q => (q.topic?._id || q.topic) === topic._id).length;
    if (addedCount >= topic.count) return toast.error("Maximum available questions added from this topic");

    setLoadingTopic(topic._id);
    try {
      const allQs = await ensureTopicQuestionsLoaded(topic._id, subjectId, chapterId);
      
      // Find a question not already in `questions`
      const existingIds = new Set(questions.map(q => q._id || q.questionText));
      const availableQs = allQs.filter(q => !existingIds.has(q._id || q.questionText));
      
      if (availableQs.length === 0) {
        return toast.error("No more unique questions available in this topic");
      }

      // Pick a random one
      const randomIndex = Math.floor(Math.random() * availableQs.length);
      const randomQ = availableQs[randomIndex];
      
      setQuestions([...questions, randomQ]);
    } catch (err) {
      toast.error("Failed to load topic questions");
    } finally {
      setLoadingTopic(null);
    }
  };

  const handleDecrementTopic = (topic) => {
    const topicQsInExam = questions.filter(q => (q.topic?._id || q.topic) === topic._id);
    if (topicQsInExam.length === 0) return;
    
    // Remove the most recently added question for this topic
    const questionToRemove = topicQsInExam[topicQsInExam.length - 1];
    setQuestions(questions.filter(q => q._id !== questionToRemove._id));
  };

  const fetchAvailableBatches = async () => {
    try {
      const res = await adminAPI.getBatches();
      setAvailableClasses(res.data?.data || []);
    } catch (error) {
      console.error("Failed to load batches", error);
    }
  };

  const fetchHierarchy = async () => {
    try {
      const res = await adminAPI.getQuestionBankHierarchy();
      setHierarchy(res.data?.data || []);
    } catch (error) {
      console.error("Failed to load question bank hierarchy", error);
    }
  };

  const fetchExam = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getExamById(id);
      const data = res.data.data;
      
      // format dates for input fields
      const formatDateForInput = (dt) => {
        const date = new Date(dt);
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        return date.toISOString().slice(0, 16);
      };

      setExamData({
        title: data.exam.title,
        description: data.exam.description || '',
        examType: data.exam.examType || 'INTERNAL',
        assignedClasses: data.exam.assignedBatches?.map(c => typeof c === 'object' ? c._id : c) || [],
        settings: {
          startTime: formatDateForInput(data.exam.settings.startTime),
          endTime: formatDateForInput(data.exam.settings.endTime),
          durationMinutes: data.exam.settings.durationMinutes,
          passingMarks: data.exam.settings.passingMarks || 0,
          showResultsAfterSubmit: data.exam.settings.showResultsAfterSubmit
        },
        security: data.exam.security
      });
      setQuestions(data.questions || []);
    } catch (error) {
      toast.error('Failed to load exam details');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      if (!examData.title || !examData.settings.startTime || !examData.settings.endTime) {
        return toast.error("Title, Start Time and End Time are required");
      }
      setLoading(true);
      let res;
      const payload = {
        ...examData,
        assignedBatches: examData.assignedClasses, // Map UI state back to API payload
        settings: {
          ...examData.settings,
          startTime: new Date(examData.settings.startTime).toISOString(),
          endTime: new Date(examData.settings.endTime).toISOString()
        }
      };

      if (id) {
        res = await adminAPI.updateExam(id, payload);
        toast.success("Exam updated successfully");
      } else {
        res = await adminAPI.createExam(payload);
        toast.success("Exam created successfully");
      }
      router.push('/admin/exams');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Error saving exam');
    } finally {
      setLoading(false);
    }
  };

  const removeQuestion = (idx) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const renderTopicRow = (topic, subjectId, chapterId) => {
    const addedCount = questions.filter(q => (q.topic?._id || q.topic) === topic._id).length;
    
    return (
      <div key={topic._id} className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-white border rounded-lg shadow-sm hover:border-primary-300 transition-colors">
        <div className="flex-1 mb-2 md:mb-0">
          <h4 className="font-bold text-gray-800 text-sm">{topic.name}</h4>
          <div className="flex flex-wrap gap-2 mt-1">
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border">Total: {topic.count}</span>
            {topic.difficulties?.Easy > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-success-50 text-success-600 border border-success-200">Easy: {topic.difficulties.Easy}</span>}
            {topic.difficulties?.Medium > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-warning-50 text-warning-600 border border-warning-200">Medium: {topic.difficulties.Medium}</span>}
            {topic.difficulties?.Hard > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-error-50 text-error-600 border border-error-200">Hard: {topic.difficulties.Hard}</span>}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 mt-3 md:mt-0">
          <Button 
            variant="outline" 
            size="sm"
            className="text-primary-600 border-primary-200 bg-primary-50 hover:bg-primary-100 flex items-center gap-1 h-9 px-3"
            onClick={() => handleExploreTopic(topic, subjectId, chapterId)}
          >
            <Search className="w-4 h-4" /> Explore
          </Button>

          <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-lg border">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleDecrementTopic(topic)}
                disabled={addedCount === 0 || loadingTopic === topic._id}
                className="w-7 h-7 flex justify-center items-center rounded-full bg-white border shadow-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                -
              </button>
              
              <div className="w-8 text-center font-bold text-sm text-primary-700">
                {loadingTopic === topic._id ? <span className="animate-pulse">...</span> : addedCount}
              </div>
              
              <button 
                onClick={() => handleIncrementTopic(topic, subjectId, chapterId)}
                disabled={addedCount >= topic.count || loadingTopic === topic._id}
                className="w-7 h-7 flex justify-center items-center rounded-full bg-primary-600 text-white shadow-sm hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>
            {addedCount > 0 && <CheckCircle className="w-4 h-4 text-success-500" />}
          </div>
        </div>
      </div>
    );
  };

  const renderChapters = () => {
    if (!selectedSubject) return <div className="text-center py-8 text-gray-500">Please select a subject first</div>;
    
    const subjectNode = hierarchy.find(s => s._id === selectedSubject);
    if (!subjectNode) return null;
    
    const chapters = Object.values(subjectNode.chapters || {}).filter(c => !c.isUnpublished);
    if (chapters.length === 0) return <div className="text-center py-8 text-gray-500">No chapters found for this subject</div>;
    
    return (
      <div className="space-y-3">
        {chapters.map(ch => {
          const isExpanded = expandedChapter === ch._id;
          return (
            <div key={ch._id} className="border rounded-lg overflow-hidden shadow-sm bg-white">
              <div 
                className={`p-3 flex items-center justify-between cursor-pointer select-none transition-colors ${isExpanded ? 'bg-primary-50 border-b border-primary-100' : 'hover:bg-gray-50'}`}
                onClick={() => setExpandedChapter(isExpanded ? null : ch._id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${isExpanded ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'}`}>
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{ch.name}</h3>
                    <p className="text-xs text-gray-500">{ch.count} Questions Total</p>
                  </div>
                </div>
                <div className="text-gray-400">
                  <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90 text-primary-600' : ''}`} />
                </div>
              </div>
              
              {isExpanded && (
                <div className="p-3 bg-gray-50 space-y-2">
                  {ch.topics && ch.topics.length > 0 ? (
                    ch.topics.filter(t => !t.isUnpublished).map(t => renderTopicRow(t, selectedSubject, ch._id))
                  ) : (
                    <div className="text-center text-sm text-gray-500 py-4">No topics found in this chapter</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const handleSaveQuestions = async () => {
    if (!id) return toast.error("Please save exam settings first");
    if (questions.length === 0) return toast.error("No questions to save");

    try {
      setLoading(true);
      await adminAPI.addExamQuestions(id, { questions });
      toast.success("Questions updated and saved successfully!");
      router.push('/admin/exams');
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save questions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/admin/exams')} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{id ? 'Edit Exam' : 'Create Exam'}</h1>
            <p className="text-sm text-gray-500">Configure exam settings and questions</p>
          </div>
        </div>
        
        {id && (
          <div className="flex items-center p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'settings' ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings className="w-4 h-4 inline-block mr-2" />
              Settings
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'questions' ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="w-4 h-4 inline-block mr-2" />
              Questions ({questions.length})
            </button>
          </div>
        )}
      </div>

      {activeTab === 'settings' ? (
        <Card className="p-6 space-y-8">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Basic Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Exam Title"
                value={examData.title}
                onChange={(e) => setExamData({ ...examData, title: e.target.value })}
                required
              />
              <Input
                label="Duration (Minutes)"
                type="number"
                value={examData.settings.durationMinutes}
                onChange={(e) => setExamData({ ...examData, settings: { ...examData.settings, durationMinutes: e.target.value } })}
              />
              <Input
                label="Start Time"
                type="datetime-local"
                value={examData.settings.startTime}
                onChange={(e) => setExamData({ ...examData, settings: { ...examData.settings, startTime: e.target.value } })}
              />
              <Input
                label="End Time"
                type="datetime-local"
                value={examData.settings.endTime}
                onChange={(e) => setExamData({ ...examData, settings: { ...examData.settings, endTime: e.target.value } })}
              />
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Exam Visibility & Assignment</h3>
            
            <div className="flex gap-4">
              <label className={`flex-1 p-4 border rounded-xl cursor-pointer transition-all ${examData.examType === 'INTERNAL' ? 'border-primary-500 bg-primary-50' : 'hover:border-gray-300'}`}>
                <input 
                  type="radio" 
                  name="examType" 
                  checked={examData.examType === 'INTERNAL'}
                  onChange={() => setExamData({...examData, examType: 'INTERNAL'})}
                  className="hidden"
                />
                <div className="font-semibold text-gray-900 mb-1">Internal (Specific Batches)</div>
                <div className="text-sm text-gray-500">Only enrolled students from selected batches can take this test.</div>
              </label>

              <label className={`flex-1 p-4 border rounded-xl cursor-pointer transition-all ${examData.examType === 'PUBLIC' ? 'border-primary-500 bg-primary-50' : 'hover:border-gray-300'}`}>
                <input 
                  type="radio" 
                  name="examType" 
                  checked={examData.examType === 'PUBLIC'}
                  onChange={() => setExamData({...examData, examType: 'PUBLIC'})}
                  className="hidden"
                />
                <div className="font-semibold text-gray-900 mb-1">Public Link</div>
                <div className="text-sm text-gray-500">Anyone with the link can register and take this test.</div>
              </label>
            </div>

            {examData.examType === 'INTERNAL' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Batches</label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {availableClasses.map(cls => (
                    <label key={cls._id} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={examData.assignedClasses.includes(cls._id)}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setExamData(prev => ({
                            ...prev,
                            assignedClasses: isChecked 
                              ? [...prev.assignedClasses, cls._id]
                              : prev.assignedClasses.filter(id => id !== cls._id)
                          }));
                        }}
                        className="rounded text-primary-600 w-4 h-4"
                      />
                      <span className="text-sm font-medium">{cls.name} {cls.section}</span>
                    </label>
                  ))}
                  {availableClasses.length === 0 && <span className="text-sm text-gray-500">No batches found.</span>}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Security & Proctoring</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center space-x-3 p-3 border rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={examData.security.requireFullScreen}
                  onChange={(e) => setExamData({ ...examData, security: { ...examData.security, requireFullScreen: e.target.checked } })}
                  className="w-5 h-5 text-primary-600 rounded"
                />
                <span className="font-medium">Enforce Full Screen</span>
              </label>
              
              <label className="flex items-center space-x-3 p-3 border rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={examData.security.disableCopyPaste}
                  onChange={(e) => setExamData({ ...examData, security: { ...examData.security, disableCopyPaste: e.target.checked } })}
                  className="w-5 h-5 text-primary-600 rounded"
                />
                <span className="font-medium">Disable Copy/Paste & Right-click</span>
              </label>

              <label className="flex items-center space-x-3 p-3 border rounded-lg bg-blue-50 cursor-pointer hover:bg-blue-100">
                <input
                  type="checkbox"
                  checked={examData.security.enableProctoring}
                  onChange={(e) => setExamData({ ...examData, security: { ...examData.security, enableProctoring: e.target.checked } })}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <span className="font-medium text-blue-900">Enable Live Webcam Proctoring (5-sec Snapshot)</span>
              </label>

              <div className="p-2">
                <Input
                  label="Max Tab Switches Allowed"
                  type="number"
                  value={examData.security.maxTabSwitchesAllowed}
                  onChange={(e) => setExamData({ ...examData, security: { ...examData.security, maxTabSwitchesAllowed: e.target.value } })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="gradient" onClick={handleSaveSettings} disabled={loading} icon={Save}>
              {loading ? 'Saving...' : id ? 'Update Settings' : 'Create Exam & Continue'}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          <div className="lg:col-span-3 space-y-6">
            <Card className="p-5">
              <div className="flex bg-gray-100 p-1 rounded-lg w-fit mb-6">
                <button
                  className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${
                    questionSourceTab === 'SUBJECT_WISE'
                      ? 'bg-white shadow text-primary-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setQuestionSourceTab('SUBJECT_WISE')}
                >
                  From Question Banks
                </button>
                <button
                  className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${
                    questionSourceTab === 'FULL_PAPERS'
                      ? 'bg-white shadow text-primary-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setQuestionSourceTab('FULL_PAPERS')}
                >
                  From Full Papers
                </button>
              </div>

              {questionSourceTab === 'SUBJECT_WISE' ? (
                <div className="flex flex-col space-y-4">
                  <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Subject</label>
                  <select 
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border text-sm"
                  value={selectedSubject}
                  onChange={(e) => {
                    setSelectedSubject(e.target.value);
                    setExpandedChapter(null);
                  }}
                >
                  <option value="">-- Choose a Subject --</option>
                  {hierarchy.map(sub => (
                    <option key={sub._id} value={sub._id}>{sub.name} ({sub.count} Questions)</option>
                  ))}
                </select>
              </div>

              {/* Accordion List View */}
              <div className="mt-4">
                {renderChapters()}
              </div>
              </div>
              ) : (
                <div className="space-y-4">
                  {fullPapers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                      <p>No full papers found.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-4 items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="w-full sm:w-2/3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Select Full Paper</label>
                        <select 
                          className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border text-sm bg-white"
                          value={selectedFullPaperId}
                          onChange={(e) => setSelectedFullPaperId(e.target.value)}
                        >
                          <option value="">-- Choose a Full Paper --</option>
                          {fullPapers.map(paper => (
                            <option key={paper._id} value={paper._id}>
                              {paper.title} ({paper.totalQuestions} Questions | {paper.totalMarks} Marks)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-full sm:w-1/3 flex items-end">
                        <Button 
                          variant="secondary" 
                          size="md"
                          className="w-full mt-5 sm:mt-0"
                          onClick={() => handleAddFullPaper(selectedFullPaperId)}
                          disabled={!selectedFullPaperId || loadingFullPaper === selectedFullPaperId}
                        >
                          {loadingFullPaper === selectedFullPaperId ? 'Adding...' : 'Add All Questions'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>

          {questions.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <CheckCircle className="w-5 h-5 text-success-500 mr-2"/>
                  Selected Questions ({questions.length})
                </h3>
                <Button variant="gradient" onClick={handleSaveQuestions} disabled={loading} icon={Save}>
                  {loading ? 'Saving...' : 'Confirm & Save Questions to Exam'}
                </Button>
              </div>

              {/* Subject Summary Pills */}
              <div className="flex flex-wrap gap-2 mb-6">
                {[...new Set(questions.map(q => q.subjectName || 'General'))].map(sub => (
                  <span key={sub} className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-semibold">
                    {sub}: {questions.filter(q => (q.subjectName || 'General') === sub).length} Qs
                  </span>
                ))}
              </div>

              <div className="space-y-8 max-h-[600px] overflow-y-auto pr-4">
                {[...new Set(questions.map(q => q.subjectName || 'General'))].map((subject) => {
                  const subjectQuestions = questions.map((q, idx) => ({ ...q, originalIdx: idx }))
                                                   .filter(q => (q.subjectName || 'General') === subject);
                  return (
                    <div key={subject} className="space-y-4">
                      <h4 className="text-md font-bold text-gray-800 border-b pb-2">{subject}</h4>
                      <div className="space-y-6">
                        {subjectQuestions.map((q) => {
                          const idx = q.originalIdx;
                          return (
                            <div key={idx} className="py-6 border-b border-gray-200 last:border-0 space-y-4 group">
                              {editingIndex === idx ? (
                                <div className="space-y-4">
                                  <p className="font-bold text-gray-700">Editing Q{idx + 1}</p>
                                  <div>
                                    <label className="text-xs font-semibold text-gray-500 block mb-1">Question Text</label>
                                    <AdvancedEditor 
                                      value={editQuestionState.questionText || ''}
                                      onChange={(content) => setEditQuestionState({...editQuestionState, questionText: content})}
                                    />
                                  </div>
                                  <div className="space-y-4">
                                    <div className="flex justify-between items-center border-b pb-1">
                                      <label className="text-xs font-semibold text-gray-500 block">Options</label>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="py-1 px-2 text-xs"
                                        onClick={() => {
                                          const newOpts = [...(editQuestionState.options || [])];
                                          newOpts.push({ label: String.fromCharCode(65 + newOpts.length), text: '', isCorrect: false });
                                          setEditQuestionState({...editQuestionState, options: newOpts});
                                        }}
                                      >
                                        + Add Option
                                      </Button>
                                    </div>
                                    {editQuestionState.options?.map((opt, oIdx) => (
                                      <div key={oIdx} className="flex items-start gap-3">
                                        <span className="font-bold w-6 text-center mt-2">{String.fromCharCode(65 + oIdx)}</span>
                                        <div className="flex-1">
                                          <AdvancedEditor 
                                            value={opt.text || ''}
                                            onChange={(content) => {
                                              const newOpts = [...editQuestionState.options];
                                              newOpts[oIdx].text = content;
                                              setEditQuestionState({...editQuestionState, options: newOpts});
                                            }}
                                          />
                                        </div>
                                        <div className="mt-2 flex flex-col items-center gap-2">
                                          <button 
                                            className="text-red-500 hover:text-red-700 p-1"
                                            onClick={() => {
                                              const newOpts = editQuestionState.options.filter((_, i) => i !== oIdx);
                                              setEditQuestionState({...editQuestionState, options: newOpts});
                                            }}
                                            title="Remove Option"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                          <input 
                                            type="radio"
                                            name={`correct-${idx}`}
                                            checked={opt.isCorrect}
                                            className="w-4 h-4 text-primary-600"
                                            onChange={() => {
                                              const newOpts = editQuestionState.options.map((o, i) => ({...o, isCorrect: i === oIdx}));
                                              setEditQuestionState({...editQuestionState, options: newOpts});
                                            }}
                                          />
                                          <span className="text-[10px] text-gray-500">Correct</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="pt-4 border-t mt-4">
                                    <label className="text-xs font-semibold text-gray-500 block mb-1">Explanation / Solution (Optional)</label>
                                    <AdvancedEditor 
                                      value={editQuestionState.explanation || ''}
                                      onChange={(content) => setEditQuestionState({...editQuestionState, explanation: content})}
                                    />
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
                                    <Button variant="primary" size="sm" onClick={saveEdit}>Save Question</Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                      <span className="font-bold text-gray-700 w-8 flex-shrink-0">Q{idx + 1}.</span>
                                      <div className="flex-1 space-y-3 min-w-0">
                                        <div className="prose max-w-none text-gray-900 font-medium break-words overflow-x-auto" dangerouslySetInnerHTML={{ __html: q.questionText }} />
                                        <div className="flex flex-wrap gap-2 text-xs">
                                          <span className="px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100 font-medium">
                                            Topic: {q.topic?.name || q.topicName || 'General'}
                                          </span>
                                          <span className={`px-2.5 py-0.5 rounded-full border font-medium ${
                                            (q.difficulty || 'Medium') === 'Easy' ? 'bg-success-50 text-success-700 border-success-100' :
                                            (q.difficulty || 'Medium') === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                            'bg-rose-50 text-rose-700 border-rose-100'
                                          }`}>
                                            Difficulty: {q.difficulty || 'Medium'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 flex-shrink-0 mt-0">
                                      <Button variant="ghost" size="sm" icon={Edit2} onClick={() => startEdit(idx)} />
                                      <button 
                                        onClick={() => removeQuestion(idx)}
                                        className="text-red-500 bg-red-50 hover:bg-red-100 p-1.5 px-3 rounded text-sm font-semibold transition-colors"
                                        title="Remove question"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-11 mt-4">
                                    {q.options?.map((opt, oIdx) => (
                                      <div key={oIdx} className={`p-3 rounded-lg border ${opt.isCorrect ? 'bg-success-50 border-success-200' : 'bg-white border-gray-200'}`}>
                                        <div className="flex items-center min-w-0">
                                          <span className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold mr-3 ${opt.isCorrect ? 'bg-success-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                            {String.fromCharCode(65 + oIdx)}
                                          </span>
                                          <span className="break-words min-w-0 flex-1 overflow-x-auto" dangerouslySetInnerHTML={{ __html: opt.text }} />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  {(!q.options || q.options.filter(o => o.isCorrect).length === 0) && (
                                    <p className="text-sm text-error-500 pl-11 mt-2">⚠️ Warning: No correct answer ([Ans]) specified for this question.</p>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
          </div>
          <div className="lg:col-span-1">
            {questions.length > 0 && (
              <Card className="p-4 sticky top-6 shadow-sm border-primary-100">
                <h3 className="font-bold text-gray-800 border-b pb-2 mb-3">Added Summary ({questions.length})</h3>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
                  {Object.entries(
                    questions.reduce((acc, q) => {
                      const subjName = q.subject?.name || q.subjectName || hierarchy.find(s => s._id === q.subject)?.name || 'General';
                      const topicName = q.topic?.name || q.topicName || hierarchy.flatMap(s => s.chapters || []).flatMap(c => c.topics || []).find(t => t._id === q.topic)?.name || 'Unknown Topic';
                      if (!acc[subjName]) acc[subjName] = {};
                      if (!acc[subjName][topicName]) acc[subjName][topicName] = 0;
                      acc[subjName][topicName]++;
                      return acc;
                    }, {})
                  ).map(([subj, topics]) => (
                    <div key={subj}>
                      <div className="font-semibold text-primary-700 text-xs mb-1">{subj}</div>
                      <ul className="space-y-1">
                        {Object.entries(topics).map(([topic, count]) => (
                          <li key={topic} className="flex justify-between items-center text-[11px] text-gray-600 bg-gray-50 p-1.5 rounded border border-gray-100 group relative">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <button 
                                onClick={() => handleRemoveQuestionsByGroup(subj, topic)} 
                                className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" 
                                title="Remove these questions"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                              </button>
                              <span className="truncate" title={topic}>{topic}</span>
                            </div>
                            <span className="font-bold text-gray-800 bg-white px-1.5 py-0.5 rounded shadow-sm ml-2 flex-shrink-0">{count}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Explore Topic Questions Modal */}
      {exploreTopicState && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex justify-center items-center p-4">
          <div className="w-full max-w-4xl h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col transform transition-transform duration-300 overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b bg-gray-50">
              <div>
                <h3 className="font-bold text-lg text-gray-800">Explore Questions</h3>
                <p className="text-sm font-medium text-primary-600">
                  Topic: {exploreTopicState.topic?.name}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Selected: {questions.filter(q => (q.topic?._id || q.topic) === exploreTopicState.topic?._id).length} / {exploreTopicState.topic?.count}
                </p>
              </div>
              <Button variant="ghost" className="bg-gray-200 hover:bg-gray-300" onClick={() => setExploreTopicState(null)}>Close</Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-gray-100/50">
              {loadingExplore ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : exploreTopicState.questions.length === 0 ? (
                <div className="text-center text-gray-500 py-10 bg-white rounded-lg border border-dashed">No questions found in this topic.</div>
              ) : (
                exploreTopicState.questions.map((q, idx) => {
                  const isSelected = questions.some(exQ => (exQ._id || exQ.questionText) === (q._id || q.questionText));
                  return (
                    <div key={q._id || idx} className={`p-5 bg-white border-2 rounded-xl transition-all cursor-pointer ${isSelected ? 'border-primary-500 shadow-md ring-2 ring-primary-100' : 'border-gray-200 hover:border-primary-300 hover:shadow-sm'}`} onClick={() => toggleExploreQuestion(q)}>
                      <div className="flex gap-4">
                        <div className="pt-1">
                          <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-primary-600 border-primary-600' : 'border-gray-300'}`}>
                            {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-3">
                            <span className={`px-2.5 py-1 rounded text-xs font-bold border ${
                              (q.difficulty || 'Medium') === 'Easy' ? 'bg-success-50 text-success-700 border-success-200' :
                              (q.difficulty || 'Medium') === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {q.difficulty || 'Medium'}
                            </span>
                          </div>
                          <div className="prose prose-sm max-w-none text-gray-800 font-medium" dangerouslySetInnerHTML={{ __html: q.questionText }} />
                          
                          {/* Options */}
                          {q.options && q.options.length > 0 && (
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {q.options.map((opt, oIdx) => (
                                <div key={oIdx} className={`p-2.5 rounded-lg border text-sm flex items-start ${opt.isCorrect ? 'bg-success-50 border-success-200 text-success-900' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
                                  <span className={`font-bold mr-2 mt-0.5 flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${opt.isCorrect ? 'bg-success-500 text-white' : 'bg-gray-200'}`}>
                                    {String.fromCharCode(65 + oIdx)}
                                  </span>
                                  <span className="break-words min-w-0 flex-1 overflow-x-auto" dangerouslySetInnerHTML={{ __html: opt.text }} />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            {/* Sticky footer for quick action */}
            <div className="p-4 border-t bg-white flex justify-between items-center">
               <div className="text-sm text-gray-600">
                  <span className="font-bold text-primary-600">{questions.filter(q => (q.topic?._id || q.topic) === exploreTopicState.topic?._id).length}</span> questions selected from this topic.
               </div>
               <Button variant="primary" onClick={() => setExploreTopicState(null)}>Done Exploring</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
