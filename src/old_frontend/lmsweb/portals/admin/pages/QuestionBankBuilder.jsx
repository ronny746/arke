import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Upload, CheckCircle, Edit2, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/forms/index.jsx';
import { adminAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';
import ReactQuill from 'react-quill-new';
import 'react-quill/dist/quill.snow.css';

export default function QuestionBankBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [bankData, setBankData] = useState({
    title: '',
    description: '',
  });

  const [questions, setQuestions] = useState([]);
  const [uploadingWord, setUploadingWord] = useState(false);
  
  // For editing inline
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editQuestionState, setEditQuestionState] = useState(null);

  useEffect(() => {
    if (id) {
      fetchBank();
    }
  }, [id]);

  const fetchBank = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getQuestionBankById(id);
      setBankData({
        title: res.data.data.title,
        description: res.data.data.description || ''
      });
      setQuestions(res.data.data.questions || []);
    } catch (error) {
      toast.error('Failed to load Question Bank');
    } finally {
      setLoading(false);
    }
  };

  const handleWordUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.docx')) {
      return toast.error("Only .docx files are supported");
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingWord(true);
      toast.loading("Extracting questions and uploading images to S3...", { id: 'wordUpload' });
      
      const res = await adminAPI.parseWordFile(formData);
      // Append or replace? Let's append
      setQuestions(prev => [...prev, ...res.data.data]);
      toast.success(`Successfully parsed ${res.data.data.length} questions!`, { id: 'wordUpload' });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to parse word document", { id: 'wordUpload' });
    } finally {
      setUploadingWord(false);
      e.target.value = null;
    }
  };

  const handleSaveBank = async () => {
    if (!bankData.title) return toast.error("Title is required");
    if (questions.length === 0) return toast.error("No questions added to the bank");

    try {
      setLoading(true);
      const payload = {
        title: bankData.title,
        description: bankData.description,
        questions: questions
      };

      if (id) {
        await adminAPI.updateQuestionBank(id, payload);
        toast.success("Question Bank updated successfully");
      } else {
        await adminAPI.createQuestionBank(payload);
        toast.success("Question Bank created successfully");
        navigate('/admin/question-banks');
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
    if (!window.confirm("Are you sure you want to remove this question?")) return;
    const updated = [...questions];
    updated.splice(idx, 1);
    setQuestions(updated);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/question-banks')} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{id ? 'Edit Question Bank' : 'Create Question Bank'}</h1>
            <p className="text-sm text-gray-500">Upload paper and edit questions</p>
          </div>
        </div>
        <Button variant="gradient" onClick={handleSaveBank} disabled={loading} icon={Save}>
          {loading ? 'Saving...' : 'Save Question Bank'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Question Bank Title"
              value={bankData.title}
              onChange={(e) => setBankData({ ...bankData, title: e.target.value })}
              required
            />
            <Input
              label="Description (Optional)"
              value={bankData.description}
              onChange={(e) => setBankData({ ...bankData, description: e.target.value })}
            />
          </div>
        </Card>

        <Card className="p-6 border-dashed border-2 border-primary-200 bg-primary-50">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-primary-100 text-primary-600 rounded-full">
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Import from Word (.docx)</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-lg">
                Use our strict template formatting. Example: <br/> <code>[Q] Question Text</code> <br/> <code>[A] Option 1</code> <br/> <code>[Ans] A</code>
              </p>
            </div>
            <div className="relative">
              <input 
                type="file" 
                accept=".docx" 
                onChange={handleWordUpload}
                disabled={uploadingWord}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <Button variant="primary" disabled={uploadingWord}>
                {uploadingWord ? 'Processing Document...' : 'Browse .docx File'}
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
              {[...new Set(questions.map(q => q.subject || 'General'))].map(sub => (
                <span key={sub} className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-semibold">
                  {sub}: {questions.filter(q => (q.subject || 'General') === sub).length} Qs
                </span>
              ))}
            </div>

            <div className="space-y-8">
              {[...new Set(questions.map(q => q.subject || 'General'))].map((subject) => {
                const subjectQuestions = questions.map((q, idx) => ({ ...q, originalIdx: idx }))
                                                 .filter(q => (q.subject || 'General') === subject);
                
                return (
                  <div key={subject} className="space-y-4">
                    <h4 className="text-md font-bold text-gray-800 border-b pb-2">{subject}</h4>
                    <div className="space-y-6">
                      {subjectQuestions.map((q) => {
                        const idx = q.originalIdx;
                        return (
                          <div key={idx} className="p-4 border rounded-lg bg-gray-50 space-y-3 relative group">
                            
                            {editingIndex === idx ? (
                              <div className="space-y-4">
                                <p className="font-bold text-gray-700">Editing Q{idx + 1}</p>
                                <div>
                                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Question Text</label>
                                  <ReactQuill 
                                    theme="snow"
                                    value={editQuestionState.questionText}
                                    onChange={(content) => setEditQuestionState({...editQuestionState, questionText: content})}
                                    className="bg-white rounded"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-semibold text-gray-500 block">Options</label>
                                  {editQuestionState.options?.map((opt, oIdx) => (
                                    <div key={oIdx} className="flex items-start gap-3">
                                      <span className="font-bold w-6 text-center mt-2">{String.fromCharCode(65 + oIdx)}</span>
                                      <div className="flex-1">
                                        <ReactQuill 
                                          theme="snow"
                                          value={opt.text}
                                          onChange={(content) => {
                                            const newOpts = [...editQuestionState.options];
                                            newOpts[oIdx].text = content;
                                            setEditQuestionState({...editQuestionState, options: newOpts});
                                          }}
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
                                <div className="flex gap-2 justify-end">
                                  <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
                                  <Button variant="primary" size="sm" onClick={saveEdit}>Save Question</Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                  <Button variant="ghost" size="sm" icon={Edit2} onClick={() => startEdit(idx)} />
                                  <Button variant="ghost" className="text-red-500 hover:bg-red-50" size="sm" icon={Trash2} onClick={() => deleteQuestion(idx)} />
                                </div>
                                
                                <div className="flex items-start gap-3">
                                  <span className="font-bold text-gray-700 w-8">Q{idx + 1}.</span>
                                  <div className="flex-1">
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
    </div>
  );
}
