import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Upload, Search, Settings, FileText, CheckCircle } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/forms/index.jsx';
import { adminAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';

export default function ExamBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
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
  const [questions, setQuestions] = useState([]);
  const [availableBanks, setAvailableBanks] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [selectedBanks, setSelectedBanks] = useState([]);
  
  useEffect(() => {
    fetchAvailableBanks();
    fetchAvailableClasses();
    if (id) {
      fetchExam();
    }
  }, [id]);

  const fetchAvailableClasses = async () => {
    try {
      const res = await adminAPI.getAcademicClasses();
      setAvailableClasses(res.data?.data || []);
    } catch (error) {
      console.error("Failed to load classes", error);
    }
  };

  const fetchAvailableBanks = async () => {
    try {
      const res = await adminAPI.getQuestionBanks();
      setAvailableBanks(res.data?.data || []);
    } catch (error) {
      console.error("Failed to load question banks", error);
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
      if (id) {
        res = await adminAPI.updateExam(id, examData);
        toast.success("Exam updated successfully");
      } else {
        res = await adminAPI.createExam(examData);
        toast.success("Exam created successfully");
      }
      navigate('/admin/exams');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Error saving exam');
    } finally {
      setLoading(false);
    }
  };

  const handleBankSelectionChange = async (bankId) => {
    const isSelected = selectedBanks.includes(bankId);
    let newSelection = [];
    if (isSelected) {
      newSelection = selectedBanks.filter(b => b !== bankId);
    } else {
      newSelection = [...selectedBanks, bankId];
    }
    setSelectedBanks(newSelection);

    // Fetch full questions for all selected banks
    try {
      setLoading(true);
      let combinedQuestions = [];
      for (const bId of newSelection) {
        const res = await adminAPI.getQuestionBankById(bId);
        if (res.data?.data?.questions) {
          combinedQuestions = [...combinedQuestions, ...res.data.data.questions];
        }
      }
      setQuestions(combinedQuestions);
    } catch (error) {
      toast.error("Failed to fetch questions from bank");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuestions = async () => {
    if (!id) return toast.error("Please save exam settings first");
    if (questions.length === 0) return toast.error("No questions to save");

    try {
      setLoading(true);
      await adminAPI.addExamQuestions(id, { questions });
      toast.success("Questions updated and saved successfully!");
      navigate('/admin/exams');
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
          <Button variant="ghost" onClick={() => navigate('/admin/exams')} className="p-2">
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
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-col space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Import from Question Banks</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Select one or more question banks to import questions into this exam.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableBanks.map(bank => (
                  <label key={bank._id} className={`flex items-start p-4 border rounded-xl cursor-pointer transition-all ${selectedBanks.includes(bank._id) ? 'border-primary-500 bg-primary-50' : 'hover:border-gray-300'}`}>
                    <input 
                      type="checkbox" 
                      className="mt-1 w-5 h-5 text-primary-600 rounded"
                      checked={selectedBanks.includes(bank._id)}
                      onChange={() => handleBankSelectionChange(bank._id)}
                    />
                    <div className="ml-3">
                      <p className="font-semibold text-gray-900">{bank.title}</p>
                      <p className="text-xs text-gray-500">{bank.totalQuestions} Questions • {bank.totalMarks} Marks</p>
                    </div>
                  </label>
                ))}
                {availableBanks.length === 0 && (
                  <div className="col-span-full p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                    No Question Banks available. Create one first!
                  </div>
                )}
              </div>
            </div>
          </Card>

          {questions.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <CheckCircle className="w-5 h-5 text-success-500 mr-2"/>
                  Parsed Questions Preview ({questions.length})
                </h3>
                <Button variant="gradient" onClick={handleSaveQuestions} disabled={loading} icon={Save}>
                  {loading ? 'Saving...' : 'Confirm & Save Questions to DB'}
                </Button>
              </div>

              {/* Subject Summary Pills */}
              <div className="flex flex-wrap gap-2 mb-6">
                {[...new Set(questions.map(q => q.subject || 'General'))].map(sub => (
                  <span key={sub} className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-semibold">
                    {sub}: {questions.filter(q => (q.subject || 'General') === sub).length} Qs
                  </span>
                ))}
              </div>

              <div className="space-y-8 max-h-[600px] overflow-y-auto pr-4">
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
                            <div key={idx} className="p-4 border rounded-lg bg-gray-50 space-y-3">
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
      )}
    </div>
  );
}
