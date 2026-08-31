"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';

import { Save, ArrowLeft, Upload, CheckCircle, Edit2, Trash2, Crop, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card } from '@/components/ui/index.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Input } from '@/components/forms/index.jsx';
import { adminAPI } from '@/api/index.js';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
const PDFCropDrawer = dynamic(() => import('@/components/ui/PDFCropDrawer').then(m => m.PDFCropDrawer), { ssr: false });
import { AdvancedEditor } from '@/components/ui/AdvancedEditor';

import { Suspense } from 'react';

function QuestionBankBuilderContent() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const subjectId = searchParams.get('subjectId');
  
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [bankData, setBankData] = useState({
    title: '',
    description: '',
  });

  const [questions, setQuestions] = useState([]);
  const [stagedQuestions, setStagedQuestions] = useState(null);
  const [uploadingWord, setUploadingWord] = useState(false);
  const [parsingProgress, setParsingProgress] = useState(0);
  const [bankType, setBankType] = useState('SUBJECT_WISE');
  
  // For editing inline
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editQuestionState, setEditQuestionState] = useState(null);

  // Word Document preview state (URL from S3)
  const [uploadedWordUrl, setUploadedWordUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // PDF Crop state
  const [pdfFile, setPdfFile] = useState(null);
  const [cropTarget, setCropTarget] = useState(null);

  useEffect(() => {
    if (id) {
      fetchBank();
    } else if (subjectId) {
      fetchSubjectQuestions();
    }
    const tabParam = searchParams.get('tab');
    if (tabParam === 'FULL_PAPERS') {
      setBankType('FULL_PAPER');
    }
  }, [id, subjectId, searchParams]);

  const fetchSubjectQuestions = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getQuestionsByHierarchy({ subject: subjectId });
      setQuestions(res.data.data);
    } catch (error) {
      toast.error('Failed to load existing questions');
    } finally {
      setLoading(false);
    }
  };

  const fetchBank = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getQuestionBankById(id);
      setBankData({
        title: res.data.data.title,
        description: res.data.data.description || ''
      });
      setBankType(res.data.data.bankType || 'SUBJECT_WISE');
      setQuestions(res.data.data.questions || []);
      if (res.data.data.docxUrl) {
        setUploadedWordUrl(res.data.data.docxUrl);
        setShowPreview(true);
      }
    } catch (error) {
      toast.error('Failed to load Question Bank');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.name.endsWith('.pdf')) {
      setPdfFile(file);
      toast.success("PDF loaded for cropping. Add an empty question and use the crop button next to the editor.");
      e.target.value = null;
      return;
    }
    
    if (!file.name.endsWith('.docx')) {
      return toast.error("Only .docx or .pdf files are supported");
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bankType', bankType);
    if (subjectId && bankType === 'SUBJECT_WISE') {
      formData.append('subjectId', subjectId);
    }

    try {
      setUploadingWord(true);
      setParsingProgress(10);
      toast.loading("Parsing document and extracting questions...", { id: 'wordUpload' });

      const progressInterval = setInterval(() => {
        setParsingProgress(prev => (prev >= 85 ? 85 : prev + 5));
      }, 1200);

      try {
        const res = await adminAPI.uploadDocxToBank(formData);
        setStagedQuestions(res.data.data);
        if (res.data.docxUrl) {
          setUploadedWordUrl(res.data.docxUrl);
        }
        toast.success(`Successfully parsed ${res.data.data.length} questions! Please review them.`, { id: 'wordUpload' });
      } finally {
        clearInterval(progressInterval);
        setParsingProgress(100);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to parse word document", { id: 'wordUpload' });
    } finally {
      setUploadingWord(false);
      setParsingProgress(0);
      e.target.value = null;
    }
  };

  const handleAddEmptyQuestion = () => {
    const newQ = {
      type: 'MCQ',
      questionText: '',
      options: [
        { label: 'A', text: '', isCorrect: true },
        { label: 'B', text: '', isCorrect: false },
        { label: 'C', text: '', isCorrect: false },
        { label: 'D', text: '', isCorrect: false }
      ],
      correctAnswerText: 'A',
      explanation: '',
      marks: 4,
      negativeMarks: 1,
      subjectName: 'General',
      chapterName: 'General',
      topicName: 'General',
      difficulty: 'Medium'
    };
    if (stagedQuestions) {
      setStagedQuestions([...stagedQuestions, newQ]);
    } else {
      setQuestions([...questions, newQ]);
    }
  };

  const handleCropComplete = (s3Url) => {
    if (!cropTarget || !editQuestionState) return;
    
    const imgHtml = `<p><img src="${s3Url}" /></p>`;
    
    setEditQuestionState(prev => {
      const newState = { ...prev };
      if (cropTarget.field === 'questionText') {
        newState.questionText = (newState.questionText || '') + imgHtml;
      } else if (cropTarget.field === 'explanation') {
        newState.explanation = (newState.explanation || '') + imgHtml;
      } else if (cropTarget.field === 'options') {
        newState.options = [...newState.options];
        newState.options[cropTarget.optionIndex].text = (newState.options[cropTarget.optionIndex].text || '') + imgHtml;
      }
      return newState;
    });
  };

  const handleSaveBank = async () => {
    // Default title if empty since it's now optional in UI but required in schema
    const title = bankData.title || (bankType === 'FULL_PAPER' ? `Full Paper ${new Date().toLocaleDateString()}` : `Question Bank ${new Date().toLocaleDateString()}`);
    
    const newQuestions = questions.filter(q => !q._id);
    
    if (questions.length === 0) return toast.error("No questions added to the bank");
    if (!id && newQuestions.length === 0) {
      toast.success("All edits saved individually.");
      return router.push('/admin/question-banks');
    }

    try {
      setLoading(true);
      const payload = {
        title: title,
        description: bankData.description,
        bankType: bankType,
        questions: id ? questions : newQuestions
      };

      if (id) {
        await adminAPI.updateQuestionBank(id, payload);
        toast.success("Question Bank updated successfully");
      } else {
        await adminAPI.createQuestionBank(payload);
        toast.success("Questions added successfully");
        router.push('/admin/question-banks');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Error saving Question Bank');
    } finally {
      setLoading(false);
    }
  };

  // Quick edit handlers
  const startEdit = (idx) => {
    setEditingIndex(idx);
    const targetList = stagedQuestions || questions;
    setEditQuestionState(JSON.parse(JSON.stringify(targetList[idx]))); // deep copy
  };

  const saveEdit = async () => {
    const updated = stagedQuestions ? [...stagedQuestions] : [...questions];
    const editedQ = editQuestionState;

    if (editedQ._id && editedQ.bankId && !stagedQuestions) {
      try {
        await adminAPI.updateSingleQuestion(editedQ.bankId, editedQ._id, editedQ);
        toast.success('Question updated directly');
      } catch (err) {
        toast.error('Failed to update question directly');
        return;
      }
    }

    updated[editingIndex] = editedQ;
    if (stagedQuestions) setStagedQuestions(updated);
    else setQuestions(updated);
    
    setEditingIndex(-1);
    setEditQuestionState(null);
  };

  const cancelEdit = () => {
    setEditingIndex(-1);
    setEditQuestionState(null);
  };

  const deleteQuestion = async (idx) => {
    if (confirm("Are you sure you want to remove this question?")) {
      if (stagedQuestions) {
        const newQs = [...stagedQuestions];
        newQs.splice(idx, 1);
        setStagedQuestions(newQs);
      } else {
        const q = questions[idx];
        if (q._id && q.bankId) {
          try {
            await adminAPI.deleteSingleQuestion(q.bankId, q._id);
            toast.success("Question deleted permanently");
          } catch (err) {
            toast.error("Failed to delete question");
            return;
          }
        }
        const newQs = [...questions];
        newQs.splice(idx, 1);
        setQuestions(newQs);
      }
    }
  };

  const moveQuestionUp = (idx) => {
    if (idx === 0) return;
    const target = stagedQuestions || questions;
    const newQs = [...target];
    const temp = newQs[idx];
    newQs[idx] = newQs[idx - 1];
    newQs[idx - 1] = temp;
    if (stagedQuestions) setStagedQuestions(newQs);
    else setQuestions(newQs);
  };

  const moveQuestionDown = (idx) => {
    const target = stagedQuestions || questions;
    if (idx === target.length - 1) return;
    const newQs = [...target];
    const temp = newQs[idx];
    newQs[idx] = newQs[idx + 1];
    newQs[idx + 1] = temp;
    if (stagedQuestions) setStagedQuestions(newQs);
    else setQuestions(newQs);
  };

  const displayQuestions = stagedQuestions || questions;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/admin/question-banks')} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{id ? 'Edit Question Bank' : 'Upload Questions'}</h1>
            <p className="text-sm text-gray-500">
              {subjectId && bankType === 'SUBJECT_WISE' ? 'Uploading questions directly to selected Subject folder' : 'Upload paper and edit questions'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {uploadedWordUrl && !showPreview && (
            <Button variant="outline" onClick={() => setShowPreview(true)}>
              Show Doc Preview
            </Button>
          )}
          <Button 
            variant="gradient" 
            onClick={handleSaveBank} 
            disabled={loading || stagedQuestions !== null} 
            icon={Save}
            title={stagedQuestions ? "Please confirm or discard your uploads first" : ""}
          >
            {loading ? 'Saving...' : 'Save Question Bank'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6">
          
          {stagedQuestions && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between sticky top-4 z-40 gap-4">
              <div>
                 <h2 className="text-lg font-bold text-amber-900">Review Uploaded Questions</h2>
                 <p className="text-sm text-amber-700">Please review these {stagedQuestions.length} newly uploaded questions. You can edit or delete them below.</p>
              </div>
              <div className="flex gap-3 shrink-0">
                 <Button variant="outline" className="border-amber-500 text-amber-700 hover:bg-amber-100" onClick={() => { if(confirm('Discard these uploads?')) setStagedQuestions(null) }}>Discard</Button>
                 <Button variant="primary" className="bg-amber-600 hover:bg-amber-700 border-none" onClick={() => {
                   setQuestions(prev => [...prev, ...stagedQuestions]);
                   setStagedQuestions(null);
                   toast.success('Questions verified and merged to the main list!');
                 }}>Confirm & Merge</Button>
              </div>
            </div>
          )}

          {!stagedQuestions && (
          <Card className="p-6 border-dashed border-2 border-primary-200 bg-primary-50">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="flex gap-4">
                <Button variant="outline" onClick={handleAddEmptyQuestion}>
                  + Add Empty Question
                </Button>
              </div>
              <div className="p-4 bg-primary-100 text-primary-600 rounded-full mt-4">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {bankType === 'FULL_PAPER' ? 'Import Full Paper (.docx or .pdf)' : 'Import Subject Questions (.docx or .pdf)'}
                </h3>
                <p className="text-sm text-gray-500 mt-1 max-w-lg">
                  Use DOCX for auto-parsing. Use PDF to crop and manually insert images.
                </p>
              </div>
              {uploadingWord && (
                <div className="w-full max-w-md space-y-2">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Parsing questions...</span>
                    <span>{parsingProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-600 transition-all duration-300 rounded-full" style={{ width: `${parsingProgress}%` }} />
                  </div>
                </div>
              )}
              <div className="relative">
                <input 
                  type="file" 
                  accept=".docx,.pdf" 
                  onChange={handleFileUpload}
                  disabled={uploadingWord}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <Button variant="primary" disabled={uploadingWord}>
                  {uploadingWord ? 'Parsing...' : 'Browse File'}
                </Button>
              </div>
            </div>
          </Card>
          )}

          {displayQuestions.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <CheckCircle className={`w-5 h-5 mr-2 ${stagedQuestions ? 'text-amber-500' : 'text-success-500'}`}/>
                  {stagedQuestions ? 'Staged Questions' : 'Questions'} ({displayQuestions.length})
                </h3>
              </div>
              
              {/* Subject Summary Pills */}
              <div className="flex flex-wrap gap-2 mb-6">
                {[...new Set(displayQuestions.map(q => q.subjectName || (typeof q.subject === 'string' ? q.subject : q.subject?.name) || 'General'))].map(sub => (
                  <span key={sub} className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-semibold">
                    {sub}: {displayQuestions.filter(q => (q.subjectName || (typeof q.subject === 'string' ? q.subject : q.subject?.name) || 'General') === sub).length} Qs
                  </span>
                ))}
              </div>

              <div className="space-y-6">
                {displayQuestions.map((q, idx) => {
                  return (
                    <div key={idx} className="p-4 border rounded-lg bg-gray-50 space-y-3 relative group">
                      
                      {editingIndex === idx ? (
                        <div className="space-y-4">
                          <p className="font-bold text-gray-700">Editing Q{idx + 1}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 bg-white border rounded-lg shadow-sm">
                            <div>
                              <label className="text-[10px] font-semibold text-gray-500 block mb-1 uppercase tracking-wider">Subject</label>
                              <input type="text" className="w-full border rounded p-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" value={editQuestionState.subjectName || (typeof editQuestionState.subject === 'string' ? editQuestionState.subject : editQuestionState.subject?.name) || ''} onChange={(e) => setEditQuestionState({...editQuestionState, subjectName: e.target.value})} placeholder="e.g. Physics" />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-gray-500 block mb-1 uppercase tracking-wider">Chapter</label>
                              <input type="text" className="w-full border rounded p-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" value={editQuestionState.chapterName || (typeof editQuestionState.chapter === 'string' ? editQuestionState.chapter : editQuestionState.chapter?.name) || ''} onChange={(e) => setEditQuestionState({...editQuestionState, chapterName: e.target.value})} placeholder="e.g. Kinematics" />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-gray-500 block mb-1 uppercase tracking-wider">Topic</label>
                              <input type="text" className="w-full border rounded p-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" value={editQuestionState.topicName || (typeof editQuestionState.topic === 'string' ? editQuestionState.topic : editQuestionState.topic?.name) || ''} onChange={(e) => setEditQuestionState({...editQuestionState, topicName: e.target.value})} placeholder="e.g. Motion in 1D" />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-gray-500 block mb-1 uppercase tracking-wider">Difficulty</label>
                              <select className="w-full border rounded p-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" value={editQuestionState.difficulty || 'Medium'} onChange={(e) => setEditQuestionState({...editQuestionState, difficulty: e.target.value})}>
                                <option value="Easy">Easy</option>
                                <option value="Medium">Medium</option>
                                <option value="Hard">Hard</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-xs font-semibold text-gray-500 block">Question Text</label>
                              {pdfFile && (
                                <Button size="sm" variant="outline" className="py-1 px-2 text-xs" onClick={() => setCropTarget({ field: 'questionText', label: 'Question Text' })}>
                                  <Crop className="w-3 h-3 mr-1"/> Crop from PDF
                                </Button>
                              )}
                            </div>
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
                                  <div className="flex justify-end mb-1">
                                    {pdfFile && (
                                      <Button size="sm" variant="outline" className="py-1 px-2 text-xs" onClick={() => setCropTarget({ field: 'options', optionIndex: oIdx, label: `Option ${String.fromCharCode(65 + oIdx)}` })}>
                                        <Crop className="w-3 h-3 mr-1"/> Crop from PDF
                                      </Button>
                                    )}
                                  </div>
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
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-xs font-semibold text-gray-500 block">Explanation / Solution (Optional)</label>
                              {pdfFile && (
                                <Button size="sm" variant="outline" className="py-1 px-2 text-xs" onClick={() => setCropTarget({ field: 'explanation', label: 'Explanation' })}>
                                  <Crop className="w-3 h-3 mr-1"/> Crop from PDF
                                </Button>
                              )}
                            </div>
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
                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => moveQuestionUp(idx)} disabled={idx === 0}>↑</Button>
                            <Button variant="ghost" size="sm" onClick={() => moveQuestionDown(idx)} disabled={idx === displayQuestions.length - 1}>↓</Button>
                            <Button variant="ghost" size="sm" icon={Edit2} onClick={() => startEdit(idx)} />
                            <Button variant="ghost" className="text-red-500 hover:bg-red-50" size="sm" icon={Trash2} onClick={() => deleteQuestion(idx)} />
                          </div>
                          
                          <div className="flex items-start gap-3 pr-24">
                            <span className="font-bold text-gray-700 w-8">Q{idx + 1}.</span>
                            <div className="flex-1">
                              <div className="flex flex-wrap gap-2 mb-1">
                                <span className="text-xs bg-gray-200 text-gray-700 px-2 rounded-full">{q.subjectName || (typeof q.subject === 'string' ? q.subject : q.subject?.name) || 'General'}</span>
                                {(q.chapterName || (typeof q.chapter === 'string' ? q.chapter : q.chapter?.name)) && (q.chapterName || (typeof q.chapter === 'string' ? q.chapter : q.chapter?.name)) !== 'General' && <span className="text-xs bg-purple-100 text-purple-700 px-2 rounded-full">Ch: {q.chapterName || (typeof q.chapter === 'string' ? q.chapter : q.chapter?.name)}</span>}
                                {(q.topicName || (typeof q.topic === 'string' ? q.topic : q.topic?.name)) && (q.topicName || (typeof q.topic === 'string' ? q.topic : q.topic?.name)) !== 'General' && <span className="text-xs bg-blue-100 text-blue-700 px-2 rounded-full">Topic: {q.topicName || (typeof q.topic === 'string' ? q.topic : q.topic?.name)}</span>}
                                {q.difficulty && <span className={`text-xs px-2 rounded-full ${q.difficulty === 'Easy' ? 'bg-green-100 text-green-700' : q.difficulty === 'Hard' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{q.difficulty}</span>}
                              </div>
                              <div className="text-gray-900 font-medium" dangerouslySetInnerHTML={{ __html: q.questionText }} />
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
                          {q.explanation && (
                            <div className="pl-11 mt-2">
                              <p className="text-xs font-semibold text-gray-500 mb-1">Solution / Explanation:</p>
                              <div className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg border border-blue-100" dangerouslySetInnerHTML={{ __html: q.explanation }} />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

      {/* Right Drawer for Document Preview */}
      <div 
        className={`fixed top-0 right-0 h-screen w-[90vw] md:w-[500px] lg:w-[600px] bg-white shadow-2xl z-[100] transform transition-transform duration-300 ease-in-out ${showPreview ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {uploadedWordUrl && (
          <div className="h-full flex flex-col">
            <div className="p-4 bg-gray-100 border-b flex justify-between items-center z-10">
              <h3 className="font-bold text-gray-700">Word Document Preview</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>Close Preview</Button>
            </div>
            <div className="flex-1 bg-gray-50 relative">
              <iframe 
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(uploadedWordUrl)}`} 
                width="100%" 
                height="100%" 
                frameBorder="0"
                title="Word Document Preview"
              />
            </div>
          </div>
        )}
      </div>

      <PDFCropDrawer 
        file={pdfFile}
        isOpen={!!cropTarget}
        onClose={() => setCropTarget(null)}
        onCropComplete={handleCropComplete}
        targetFieldLabel={cropTarget?.label}
      />
    </div>
  );
}

export default function QuestionBankBuilder() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <QuestionBankBuilderContent />
    </Suspense>
  );
}
