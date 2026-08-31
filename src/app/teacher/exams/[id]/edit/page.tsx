"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

import { Save, ArrowLeft, Upload, Search, Settings, FileText, CheckCircle, Folder, FolderOpen, ChevronRight, PlusCircle, Check } from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card } from '@/components/ui/index.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Input } from '@/components/forms/index.jsx';
import { teacherAPI as adminAPI } from '@/api/teacher';
import toast from 'react-hot-toast';

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
  
  // Random picking state
  const [randomCount, setRandomCount] = useState('');
  const [isPickingRandom, setIsPickingRandom] = useState(false);

  // Accordion UI state
  const [expandedChapter, setExpandedChapter] = useState(null);
  const [localTopicQuestions, setLocalTopicQuestions] = useState<any>({});
  const [loadingTopic, setLoadingTopic] = useState(null);
  
  useEffect(() => {
    fetchHierarchy();
    fetchAvailableClasses();
    if (id) {
      fetchExam();
    }
  }, [id]);

  const ensureTopicQuestionsLoaded = async (topicId, subjectId, chapterId) => {
    if (localTopicQuestions[topicId]) return localTopicQuestions[topicId];
    const res = await adminAPI.getQuestionsByHierarchy({ subject: subjectId, chapter: chapterId, topic: topicId });
    const fetched = res.data?.data || [];
    setLocalTopicQuestions(prev => ({ ...prev, [topicId]: fetched }));
    return fetched;
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

  const fetchAvailableClasses = async () => {
    try {
      const res = await adminAPI.getAcademicClasses();
      setAvailableClasses(res.data?.data || []);
    } catch (error) {
      console.error("Failed to load classes", error);
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
        assignedClasses: data.exam.assignedClasses.map(c => typeof c === 'object' ? c._id : c) || [],
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
      router.push('/teacher/exams');
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
    );
  };

  const renderChapters = () => {
    if (!selectedSubject) return <div className="text-center py-8 text-gray-500">Please select a subject first</div>;
    
    const subjectNode = hierarchy.find(s => s._id === selectedSubject);
    if (!subjectNode) return null;
    
    const chapters = Object.values(subjectNode.chapters || {});
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
                    ch.topics.map(t => renderTopicRow(t, selectedSubject, ch._id))
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
      router.push('/teacher/exams');
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
          <Button variant="ghost" onClick={() => router.push('/teacher/exams')} className="p-2">
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
                <div className="font-semibold text-gray-900 mb-1">Internal (Specific Classes)</div>
                <div className="text-sm text-gray-500">Only enrolled students from selected classes can take this test.</div>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Classes</label>
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
                  {availableClasses.length === 0 && <span className="text-sm text-gray-500">No classes found.</span>}
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
                            <div key={idx} className="p-4 border rounded-lg bg-gray-50 space-y-3 relative group">
                              <button 
                                onClick={() => removeQuestion(idx)}
                                className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-red-50 p-1 rounded"
                                title="Remove question"
                              >
                                Remove
                              </button>
                              <div className="flex items-start gap-3">
                                <span className="font-bold text-gray-700 w-8">Q{idx + 1}.</span>
                                <div className="flex-1 space-y-2">
                                  <div className="text-gray-900 font-medium" dangerouslySetInnerHTML={{ __html: q.questionText }} />
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
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-11">
                                {q.options?.map((opt, oIdx) => (
                                  <div key={oIdx} className={`p-3 rounded-lg border ${opt.isCorrect ? 'bg-success-50 border-success-200' : 'bg-white border-gray-200'}`}>
                                    <div className="flex items-center">
                                      <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mr-3 ${opt.isCorrect ? 'bg-success-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                        {String.fromCharCode(65 + oIdx)}
                                      </span>
                                      <span dangerouslySetInnerHTML={{ __html: opt.text }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {(!q.options || q.options.filter(o => o.isCorrect).length === 0) && (
                                <p className="text-sm text-error-500 pl-11">⚠️ Warning: No correct answer ([Ans]) specified for this question.</p>
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
                          <li key={topic} className="flex justify-between items-center text-[11px] text-gray-600 bg-gray-50 p-1.5 rounded border border-gray-100">
                            <span className="truncate pr-2">{topic}</span>
                            <span className="font-bold text-gray-800 bg-white px-1.5 py-0.5 rounded shadow-sm">{count}</span>
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
    </div>
  );
}
