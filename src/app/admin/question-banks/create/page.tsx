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
import 'react-quill-new/dist/quill.snow.css';

let globalBlotFormatterOptions = {};

const ReactQuill = dynamic(async () => {
  const ReactQuillMod = await import('react-quill-new');
  const Quill = ReactQuillMod.Quill;
  if (typeof window !== 'undefined') {
    try {
      const { registerCustomBlotFormatter } = await import('@/components/ui/QuillBlotFormatterWithDelete');
      globalBlotFormatterOptions = await registerCustomBlotFormatter(Quill);
    } catch (e) {
      console.error("Failed to load quill-blot-formatter", e);
    }
  }
  return function Forwarded(props: any) {
    const mergedModules = {
      ...props.modules,
      blotFormatter: globalBlotFormatterOptions
    };
    return <ReactQuillMod.default {...props} modules={mergedModules} />;
  }
}, { 
  ssr: false,
  loading: () => <p>Loading editor...</p>
});

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{'list': 'ordered'}, {'list': 'bullet'}, {'script': 'sub'}, {'script': 'super'}],
    ['link', 'image', 'formula'],
    ['clean']
  ]
};

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
  const [uploadingWord, setUploadingWord] = useState(false);
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
    }
    const tabParam = searchParams.get('tab');
    if (tabParam === 'FULL_PAPERS') {
      setBankType('FULL_PAPER');
    }
  }, [id, searchParams]);

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
      toast.loading("Extracting questions and uploading images to S3...", { id: 'wordUpload' });
      
      const res = await adminAPI.uploadDocxToBank(formData);
      // Append or replace? Let's append
      setQuestions(prev => [...prev, ...res.data.data]);
      if (res.data.docxUrl) {
        setUploadedWordUrl(res.data.docxUrl);
        // setShowPreview(true); // Don't auto-open preview as requested by user
      }
      toast.success(`Successfully parsed ${res.data.data.length} questions!`, { id: 'wordUpload' });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to parse word document", { id: 'wordUpload' });
    } finally {
      setUploadingWord(false);
      e.target.value = null;
    }
  };

  const handleAddEmptyQuestion = () => {
    setQuestions([...questions, {
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
    }]);
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
    
    if (questions.length === 0) return toast.error("No questions added to the bank");

    try {
      setLoading(true);
      const payload = {
        title: title,
        description: bankData.description,
        bankType: bankType,
        questions: questions
      };

      if (id) {
        await adminAPI.updateQuestionBank(id, payload);
        toast.success("Question Bank updated successfully");
      } else {
        await adminAPI.createQuestionBank(payload);
        toast.success("Question Bank created successfully");
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

  const deleteQuestion = (idx) => {
    if (confirm("Are you sure you want to remove this question?")) {
      const newQs = [...questions];
      newQs.splice(idx, 1);
      setQuestions(newQs);
    }
  };

  const moveQuestionUp = (idx) => {
    if (idx === 0) return;
    const newQs = [...questions];
    const temp = newQs[idx];
    newQs[idx] = newQs[idx - 1];
    newQs[idx - 1] = temp;
    setQuestions(newQs);
  };

  const moveQuestionDown = (idx) => {
    if (idx === questions.length - 1) return;
    const newQs = [...questions];
    const temp = newQs[idx];
    newQs[idx] = newQs[idx + 1];
    newQs[idx + 1] = temp;
    setQuestions(newQs);
  };

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
          <Button variant="gradient" onClick={handleSaveBank} disabled={loading} icon={Save}>
            {loading ? 'Saving...' : 'Save Question Bank'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6">
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
              <div className="relative">
                <input 
                  type="file" 
                  accept=".docx,.pdf" 
                  onChange={handleFileUpload}
                  disabled={uploadingWord}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <Button variant="primary" disabled={uploadingWord}>
                  {uploadingWord ? 'Processing Document...' : 'Browse File'}
                </Button>
              </div>
            </div>
          </Card>

          {questions.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <CheckCircle className="w-5 h-5 text-success-500 mr-2"/>
                  Questions ({questions.length})
                </h3>
              </div>
              
              {/* Subject Summary Pills */}
              <div className="flex flex-wrap gap-2 mb-6">
                {[...new Set(questions.map(q => q.subjectName || (typeof q.subject === 'string' ? q.subject : q.subject?.name) || 'General'))].map(sub => (
                  <span key={sub} className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-semibold">
                    {sub}: {questions.filter(q => (q.subjectName || (typeof q.subject === 'string' ? q.subject : q.subject?.name) || 'General') === sub).length} Qs
                  </span>
                ))}
              </div>

              <div className="space-y-6">
                {questions.map((q, idx) => {
                  return (
                    <div key={idx} className="p-4 border rounded-lg bg-gray-50 space-y-3 relative group">
                      
                      {editingIndex === idx ? (
                        <div className="space-y-4">
                          <p className="font-bold text-gray-700">Editing Q{idx + 1}</p>
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-xs font-semibold text-gray-500 block">Question Text</label>
                              {pdfFile && (
                                <Button size="sm" variant="outline" className="py-1 px-2 text-xs" onClick={() => setCropTarget({ field: 'questionText', label: 'Question Text' })}>
                                  <Crop className="w-3 h-3 mr-1"/> Crop from PDF
                                </Button>
                              )}
                            </div>
                            <ReactQuill 
                              theme="snow"
                              value={editQuestionState.questionText}
                              onChange={(content) => setEditQuestionState({...editQuestionState, questionText: content})}
                              modules={quillModules}
                              className="bg-white rounded"
                            />
                          </div>
                          <div className="space-y-4">
                            <label className="text-xs font-semibold text-gray-500 block border-b pb-1">Options</label>
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
                                  <ReactQuill 
                                    theme="snow"
                                    value={opt.text}
                                    onChange={(content) => {
                                      const newOpts = [...editQuestionState.options];
                                      newOpts[oIdx].text = content;
                                      setEditQuestionState({...editQuestionState, options: newOpts});
                                    }}
                                    modules={quillModules}
                                    className="bg-white rounded"
                                  />
                                </div>
                                <div className="mt-2 flex flex-col items-center gap-1">
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
                            <ReactQuill 
                              theme="snow"
                              value={editQuestionState.explanation}
                              onChange={(content) => setEditQuestionState({...editQuestionState, explanation: content})}
                              modules={quillModules}
                              className="bg-white rounded"
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
                            <Button variant="ghost" size="sm" onClick={() => moveQuestionDown(idx)} disabled={idx === questions.length - 1}>↓</Button>
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
