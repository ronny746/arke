import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Award, 
  BookOpen, 
  Sparkles, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  HelpCircle 
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { studentAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';

export default function ExamAnalysis() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeSubject, setActiveSubject] = useState('');
  const [viewMode, setViewMode] = useState('solutions');
  const [practiceState, setPracticeState] = useState({});

  useEffect(() => {
    fetchAnalysis();
  }, [id]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const res = await studentAPI.getExamAnalysis(id);
      setData(res.data.data);
      if (Object.keys(res.data.data.subjectStats).length > 0) {
        setActiveSubject(Object.keys(res.data.data.subjectStats)[0]);
      }
    } catch (error) {
      toast.error('Failed to load exam analysis');
      navigate('/student/exams');
    } finally {
      setLoading(false);
    }
  };

  const handlePracticeSelectOption = (questionId, optionId) => {
    setPracticeState(prev => ({
      ...prev,
      [questionId]: {
        selectedOptionId: optionId,
        isRevealed: true
      }
    }));
  };

  const handleToggleRevealPractice = (questionId) => {
    setPracticeState(prev => {
      const current = prev[questionId] || { selectedOptionId: null, isRevealed: false };
      return {
        ...prev,
        [questionId]: {
          selectedOptionId: current.selectedOptionId,
          isRevealed: !current.isRevealed
        }
      };
    });
  };

  const handleResetPracticeQuestion = (questionId) => {
    setPracticeState(prev => {
      const updated = { ...prev };
      delete updated[questionId];
      return updated;
    });
  };

  const handleRevealAllInActiveSubject = () => {
    if (!data?.detailedQuestions) return;
    const currentSubjectQuestions = data.detailedQuestions.filter(q => (q.subject || 'General') === activeSubject);

    setPracticeState(prev => {
      const updated = { ...prev };
      currentSubjectQuestions.forEach(q => {
        updated[q._id] = {
          selectedOptionId: updated[q._id]?.selectedOptionId || null,
          isRevealed: true
        };
      });
      return updated;
    });
    toast.success('All solutions revealed for this subject');
  };

  const handleResetAllInActiveSubject = () => {
    if (!data?.detailedQuestions) return;
    const currentSubjectQuestions = data.detailedQuestions.filter(q => (q.subject || 'General') === activeSubject);

    setPracticeState(prev => {
      const updated = { ...prev };
      currentSubjectQuestions.forEach(q => {
        delete updated[q._id];
      });
      return updated;
    });
    toast.success('Practice reset for this subject');
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  if (!data) return null;

  const { submission, subjectStats, detailedQuestions, totalMarks, score } = data;
  const subjects = Object.keys(subjectStats);

  const activeQuestions = detailedQuestions.filter(q => (q.subject || 'General') === activeSubject);

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/student/exams')}>Back to Exams</Button>
      </div>

      <PageHeader
        title="Exam Analysis"
        subtitle="Detailed breakdown of your performance"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-primary-600 to-primary-800 text-white col-span-1 md:col-span-3 lg:col-span-1 flex flex-col justify-center items-center text-center">
          <Award className="w-16 h-16 opacity-80 mb-2" />
          <h2 className="text-xl font-medium opacity-90">Total Score</h2>
          <div className="text-5xl font-bold mt-2">{score} <span className="text-2xl opacity-75">/ {totalMarks}</span></div>
          <p className="mt-4 opacity-80 text-sm">
            Status: {submission.status.replace('_', ' ')}
          </p>
        </Card>

        <Card className="p-6 col-span-1 md:col-span-3 lg:col-span-2">
          <h3 className="text-lg font-bold mb-4">Subject-wise Breakdown</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {subjects.map(sub => (
              <div key={sub} className="p-4 border rounded-xl bg-gray-50">
                <div className="font-bold text-gray-900">{sub}</div>
                <div className="text-sm text-gray-500 mt-1">Score: <span className="font-semibold text-primary-600">{subjectStats[sub].score}</span> / {subjectStats[sub].totalMarks}</div>
                <div className="flex items-center gap-3 mt-3 text-xs">
                  <span className="text-success-600 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> {subjectStats[sub].correct}</span>
                  <span className="text-error-600 flex items-center gap-1"><XCircle className="w-3 h-3"/> {subjectStats[sub].wrong}</span>
                  <span className="text-gray-500 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {subjectStats[sub].totalQuestions - subjectStats[sub].attempted}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden mt-6">
        <div className="flex border-b overflow-x-auto bg-gray-50/50">
          {subjects.map(sub => (
            <button
              key={sub}
              onClick={() => setActiveSubject(sub)}
              className={`px-6 py-4 font-semibold whitespace-nowrap transition-colors ${activeSubject === sub ? 'border-b-2 border-primary-600 text-primary-600 bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'}`}
            >
              {sub} ({subjectStats[sub].score} M)
            </button>
          ))}
        </div>

        {/* View Mode Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b bg-white px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Solution View:</span>
            <div className="inline-flex rounded-xl bg-gray-100 p-1 border border-gray-200">
              <button
                type="button"
                onClick={() => setViewMode('solutions')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                  viewMode === 'solutions'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Full Solutions View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('practice')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                  viewMode === 'practice'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Practice Mode (Self-Test)
              </button>
            </div>
          </div>

          {viewMode === 'practice' ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRevealAllInActiveSubject}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Eye className="w-3.5 h-3.5" />
                Reveal All Solutions
              </button>
              <button
                type="button"
                onClick={handleResetAllInActiveSubject}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Subject
              </button>
            </div>
          ) : (
            <div className="text-xs text-gray-500 font-medium">
              Showing all questions with chosen answers, correct solutions & explanations
            </div>
          )}
        </div>

        {viewMode === 'practice' && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-6 py-3 flex items-center gap-3 text-amber-900 text-xs sm:text-sm">
            <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Practice Mode Active:</strong> Test your understanding! Click on any option to verify your answer and reveal the step-by-step solution.
            </span>
          </div>
        )}

        <div className="p-6 space-y-8 bg-gray-50/60">
          {activeQuestions.map((q, index) => {
            const isAttempted = q.userAnswer && q.userAnswer.status !== 'NOT_ANSWERED';
            const isCorrect = q.isCorrect;
            const practice = practiceState[q._id] || { selectedOptionId: null, isRevealed: false };

            return (
              <div key={q._id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200/80 transition-all hover:shadow-md">
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3 mb-4 pb-3 border-b border-gray-100">
                  <div className="flex gap-3 items-start flex-1">
                    <span className="bg-primary-50 text-primary-700 font-bold px-3 py-1.5 rounded-lg text-sm whitespace-nowrap border border-primary-100 shadow-xs">
                      Q {index + 1}
                    </span>
                    <div className="prose max-w-none text-gray-800 text-base font-medium" dangerouslySetInnerHTML={{ __html: q.questionText }} />
                  </div>
                  <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2 shrink-0">
                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">
                      Marks: +{q.marks} | -{q.negativeMarks}
                    </span>
                    {viewMode === 'solutions' && (
                      <div>
                        {!isAttempted ? (
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs rounded-full font-bold flex items-center gap-1 border border-amber-200">
                            <AlertCircle className="w-3.5 h-3.5"/> Skipped in Exam
                          </span>
                        ) : isCorrect ? (
                          <span className="px-2.5 py-1 bg-success-50 text-success-700 text-xs rounded-full font-bold flex items-center gap-1 border border-success-200">
                            <CheckCircle className="w-3.5 h-3.5"/> Correct in Exam (+{q.marksObtained})
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-danger-50 text-danger-700 text-xs rounded-full font-bold flex items-center gap-1 border border-danger-200">
                            <XCircle className="w-3.5 h-3.5"/> Incorrect in Exam ({q.marksObtained})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {viewMode === 'practice' && practice.isRevealed && (
                  <div className="mb-4 ml-0 sm:ml-11">
                    {practice.selectedOptionId ? (
                      (() => {
                        const selectedOpt = q.options.find(opt => opt._id === practice.selectedOptionId || opt.id === practice.selectedOptionId);
                        const isSelectionCorrect = selectedOpt?.isCorrect;
                        return isSelectionCorrect ? (
                          <div className="p-3 bg-success-50 border border-success-200 rounded-xl flex items-center justify-between text-success-800 text-sm font-semibold animate-fade-in">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-5 h-5 text-success-600" />
                              <span>🎉 Spot on! You chose the correct option!</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleResetPracticeQuestion(q._id)}
                              className="text-xs text-success-700 hover:text-success-900 underline flex items-center gap-1 font-bold"
                            >
                              <RotateCcw className="w-3 h-3" /> Practice Again
                            </button>
                          </div>
                        ) : (
                          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800 text-sm font-semibold animate-fade-in">
                            <div className="flex items-center gap-2">
                              <XCircle className="w-5 h-5 text-rose-600" />
                              <span>Incorrect choice. The correct option is highlighted in green below.</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleResetPracticeQuestion(q._id)}
                              className="text-xs text-rose-700 hover:text-rose-900 underline flex items-center gap-1 font-bold"
                            >
                              <RotateCcw className="w-3 h-3" /> Try Again
                            </button>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-blue-800 text-sm font-semibold animate-fade-in">
                        <div className="flex items-center gap-2">
                          <Eye className="w-5 h-5 text-blue-600" />
                          <span>Solution revealed. The correct answer is highlighted in green below.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleResetPracticeQuestion(q._id)}
                          className="text-xs text-blue-700 hover:text-blue-900 underline flex items-center gap-1 font-bold"
                        >
                          <RotateCcw className="w-3 h-3" /> Practice Again
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Options List */}
                <div className="space-y-3 sm:pl-11">
                  {q.options.map((opt, optIndex) => {
                    const optionLabel = String.fromCharCode(65 + optIndex);
                    
                    if (viewMode === 'solutions') {
                      const isChosenByStudent = q.userAnswer && (q.userAnswer.selectedOptionId === opt._id || q.userAnswer.selectedOptionId === opt.id);
                      const isActualCorrect = opt.isCorrect;

                      let containerStyle = 'border-gray-200 bg-white hover:border-gray-300';
                      let labelStyle = 'bg-gray-100 text-gray-700 border-gray-300';
                      let badge = null;

                      if (isActualCorrect && isChosenByStudent) {
                        containerStyle = 'border-success-500 bg-success-50/70 ring-1 ring-success-500';
                        labelStyle = 'bg-success-600 text-white border-success-600';
                        badge = (
                          <span className="text-xs font-bold text-success-700 bg-success-100 px-2.5 py-1 rounded-full flex items-center gap-1 border border-success-300">
                            <CheckCircle className="w-3.5 h-3.5 text-success-600" /> Your Choice (Correct)
                          </span>
                        );
                      } else if (isActualCorrect) {
                        containerStyle = 'border-success-500 bg-success-50/50 ring-1 ring-success-500';
                        labelStyle = 'bg-success-600 text-white border-success-600';
                        badge = (
                          <span className="text-xs font-bold text-success-700 bg-success-100 px-2.5 py-1 rounded-full flex items-center gap-1 border border-success-300">
                            <CheckCircle className="w-3.5 h-3.5 text-success-600" /> Correct Answer
                          </span>
                        );
                      } else if (isChosenByStudent && !isActualCorrect) {
                        containerStyle = 'border-danger-500 bg-danger-50/70 ring-1 ring-danger-500';
                        labelStyle = 'bg-danger-600 text-white border-danger-600';
                        badge = (
                          <span className="text-xs font-bold text-danger-700 bg-danger-100 px-2.5 py-1 rounded-full flex items-center gap-1 border border-danger-300">
                            <XCircle className="w-3.5 h-3.5 text-danger-600" /> Your Choice (Incorrect)
                          </span>
                        );
                      }

                      return (
                        <div key={opt._id} className={`flex items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${containerStyle}`}>
                          <div className="flex items-start sm:items-center gap-3 flex-1">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs border shrink-0 ${labelStyle}`}>
                              {optionLabel}
                            </div>
                            <div className="text-gray-800 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: opt.text }} />
                          </div>
                          {badge && <div className="shrink-0 ml-2">{badge}</div>}
                        </div>
                      );
                    } else {
                      if (!practice.isRevealed) {
                        return (
                          <div
                            key={opt._id}
                            onClick={() => handlePracticeSelectOption(q._id, opt._id)}
                            className="flex items-start sm:items-center gap-3 p-3.5 rounded-xl border border-gray-200 bg-white hover:border-primary-400 hover:bg-primary-50/40 hover:shadow-sm cursor-pointer transition-all group"
                          >
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs border border-gray-300 bg-gray-100 text-gray-700 group-hover:bg-primary-600 group-hover:text-white group-hover:border-primary-600 transition-colors shrink-0">
                              {optionLabel}
                            </div>
                            <div className="text-gray-800 text-sm leading-relaxed flex-1 group-hover:text-gray-900" dangerouslySetInnerHTML={{ __html: opt.text }} />
                            <span className="text-[11px] font-semibold text-gray-400 group-hover:text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              Click to select
                            </span>
                          </div>
                        );
                      } else {
                        const isSelectedInPractice = practice.selectedOptionId === opt._id || practice.selectedOptionId === opt.id;
                        const isActualCorrect = opt.isCorrect;

                        let containerStyle = 'border-gray-200 bg-white';
                        let labelStyle = 'bg-gray-100 text-gray-700 border-gray-300';
                        let badge = null;

                        if (isActualCorrect && isSelectedInPractice) {
                          containerStyle = 'border-success-500 bg-success-50/70 ring-1 ring-success-500';
                          labelStyle = 'bg-success-600 text-white border-success-600';
                          badge = (
                            <span className="text-xs font-bold text-success-700 bg-success-100 px-2.5 py-1 rounded-full flex items-center gap-1 border border-success-300">
                              <CheckCircle className="w-3.5 h-3.5 text-success-600" /> Your Selection (Correct)
                            </span>
                          );
                        } else if (isActualCorrect) {
                          containerStyle = 'border-success-500 bg-success-50/60 ring-1 ring-success-500';
                          labelStyle = 'bg-success-600 text-white border-success-600';
                          badge = (
                            <span className="text-xs font-bold text-success-700 bg-success-100 px-2.5 py-1 rounded-full flex items-center gap-1 border border-success-300">
                              <CheckCircle className="w-3.5 h-3.5 text-success-600" /> Correct Answer
                            </span>
                          );
                        } else if (isSelectedInPractice && !isActualCorrect) {
                          containerStyle = 'border-danger-500 bg-danger-50/70 ring-1 ring-danger-500';
                          labelStyle = 'bg-danger-600 text-white border-danger-600';
                          badge = (
                            <span className="text-xs font-bold text-danger-700 bg-danger-100 px-2.5 py-1 rounded-full flex items-center gap-1 border border-danger-300">
                              <XCircle className="w-3.5 h-3.5 text-danger-600" /> Your Selection (Incorrect)
                            </span>
                          );
                        }

                        return (
                          <div key={opt._id} className={`flex items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${containerStyle}`}>
                            <div className="flex items-start sm:items-center gap-3 flex-1">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs border shrink-0 ${labelStyle}`}>
                                {optionLabel}
                              </div>
                              <div className="text-gray-800 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: opt.text }} />
                            </div>
                            {badge && <div className="shrink-0 ml-2">{badge}</div>}
                          </div>
                        );
                      }
                    }
                  })}
                </div>

                {viewMode === 'practice' && (
                  <div className="mt-4 sm:ml-11 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                    {!practice.isRevealed ? (
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <HelpCircle className="w-3.5 h-3.5 text-gray-400" /> Select an option above to test yourself, or
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleRevealPractice(q._id)}
                          className="text-xs text-primary-700 border-primary-200 hover:bg-primary-50"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Show Solution & Answer
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <button
                          type="button"
                          onClick={() => handleResetPracticeQuestion(q._id)}
                          className="text-xs font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Re-attempt Question
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleRevealPractice(q._id)}
                          className="text-xs font-semibold text-gray-500 hover:text-gray-700 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <EyeOff className="w-3.5 h-3.5" /> Hide Solution
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {q.explanation && (viewMode === 'solutions' || (viewMode === 'practice' && practice.isRevealed)) && (
                  <div className="mt-5 sm:ml-11 p-5 bg-gradient-to-br from-primary-50/70 to-indigo-50/40 rounded-xl border border-primary-100 shadow-inner animate-fade-in">
                    <div className="flex items-center gap-2 text-primary-800 font-bold mb-3 text-sm">
                      <Award className="w-4 h-4 text-primary-600" />
                      Complete Step-by-Step Solution & Explanation
                    </div>
                    <div className="text-gray-700 text-sm leading-relaxed prose max-w-none bg-white/70 p-4 rounded-lg border border-primary-100/50" dangerouslySetInnerHTML={{ __html: q.explanation }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
