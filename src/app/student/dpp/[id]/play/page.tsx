"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Clock, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button.jsx';
import { studentAPI } from '@/api/index.js';
import toast from 'react-hot-toast';

export default function DPPPlayer() {
  const { id } = useParams();
  const router = useRouter();
  
  const getSubjectName = (q) => q?.subjectName || 'General';

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeSpent, setTimeSpent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [activeSubject, setActiveSubject] = useState(null);

  // Load Session
  useEffect(() => {
    const loadSession = async () => {
      try {
        const res = await studentAPI.getPracticeSession(id);
        const data = res.data.data;
        
        if (data.status === 'COMPLETED') {
          setSubmitted(true);
        }
        
        setSession(data);
        
        if (data.questions && data.questions.length > 0) {
          setActiveSubject(getSubjectName(data.questions[0]));
        }
        
        setLoading(false);
      } catch (error) {
        toast.error('Failed to load DPP session');
        router.push('/student/dpp');
      }
    };
    loadSession();
  }, [id, router]);

  // Stopwatch
  useEffect(() => {
    if (loading || submitted) return;
    const interval = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, submitted]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const handleOptionSelect = async (questionId, optionId) => {
    if (submitted) return;
    
    // Optimistic update
    const newAnswers = [...session.answers];
    const existingIdx = newAnswers.findIndex(a => a.questionId === questionId);
    
    if (existingIdx > -1) {
      newAnswers[existingIdx].selectedOptionId = optionId;
      newAnswers[existingIdx].status = 'ANSWERED';
    } else {
      newAnswers.push({ questionId, selectedOptionId: optionId, status: 'ANSWERED' });
    }
    setSession({ ...session, answers: newAnswers });

    try {
      await studentAPI.savePracticeProgress(id, {
        questionId,
        selectedOptionId: optionId,
        status: 'ANSWERED'
      });
    } catch (e) {
      toast.error('Failed to save answer');
    }
  };

  const clearAnswer = async (questionId) => {
    if (submitted) return;
    const newAnswers = session.answers.filter(a => a.questionId !== questionId);
    setSession({ ...session, answers: newAnswers });
    try {
      await studentAPI.savePracticeProgress(id, { questionId, selectedOptionId: null, status: 'NOT_ANSWERED' });
    } catch (e) {
      toast.error('Failed to clear answer');
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await studentAPI.submitPracticeSession(id);
      setSession(res.data.data);
      setSubmitted(true);
      setShowSubmitModal(false);
      toast.success('DPP Submitted Successfully!');
      window.scrollTo(0, 0);
    } catch (e) {
      toast.error('Failed to submit DPP');
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  if (!session) return null;

  const questions = session.questions || [];
  const currentQuestion = questions[currentQIdx];
  const currentAnswer = session.answers?.find(a => a.questionId === currentQuestion?.questionId);
  
  // Subject grouping
  const subjectGroups = {};
  questions.forEach((q, idx) => {
    const subj = getSubjectName(q);
    if (!subjectGroups[subj]) subjectGroups[subj] = [];
    subjectGroups[subj].push({ ...q, index: idx });
  });

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden select-none font-inter">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b h-16 flex items-center justify-between px-6 shadow-sm z-10 flex-shrink-0">
          <div className="font-bold text-xl text-gray-900 truncate pr-4">{session.title || 'DPP Session'}</div>
          
          <div className="flex items-center gap-6">
            {!submitted ? (
              <div className="flex items-center gap-3">
                <Button variant="outline" className="text-gray-600 border-gray-300" onClick={() => router.push('/student/dpp')}>
                  Pause / Exit
                </Button>
                <Button variant="gradient" onClick={() => setShowSubmitModal(true)}>
                  Submit DPP
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-gray-500 font-semibold">Your Score</div>
                  <div className="text-xl font-bold text-primary-600">{session.score} / {session.totalMarks}</div>
                </div>
                <Button variant="outline" onClick={() => router.push('/student/dpp')}>Exit</Button>
              </div>
            )}
          </div>
        </header>

        {/* Subject Tabs */}
        {Object.keys(subjectGroups).length > 1 && (
          <div className="bg-white border-b flex overflow-x-auto">
            {Object.keys(subjectGroups).map(sub => (
              <button
                key={sub}
                onClick={() => {
                  setActiveSubject(sub);
                  const firstQ = subjectGroups[sub][0];
                  if (firstQ) setCurrentQIdx(firstQ.index);
                }}
                className={`px-6 py-3 font-semibold whitespace-nowrap transition-colors ${activeSubject === sub ? 'border-b-2 border-primary-600 text-primary-600 bg-primary-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        {/* Question Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
           {currentQuestion ? (
             <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border p-6 md:p-8 relative z-10">
                <div className="flex justify-between items-center border-b pb-4 mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Question {currentQIdx + 1}</h2>
                  <div className="flex gap-4 text-sm font-semibold">
                    <span className="text-success-600">+{currentQuestion.marks || 4} Marks</span>
                    <span className="text-error-600">-{currentQuestion.negativeMarks || 1} Marks</span>
                  </div>
                </div>

                {/* Question Text */}
                <div className="prose max-w-none text-gray-900 text-lg mb-8" dangerouslySetInnerHTML={{ __html: currentQuestion.questionText }} />

                {/* Options */}
                <div className="space-y-4">
                  {currentQuestion.options?.map((opt, idx) => {
                    const isSelected = currentAnswer?.selectedOptionId === opt._id;
                    
                    let optionClass = "border-gray-200 hover:border-primary-200 hover:bg-gray-50";
                    let circleClass = "border-gray-300";
                    let innerCircle = null;

                    if (submitted) {
                      if (opt.isCorrect) {
                        optionClass = "border-success-500 bg-success-50";
                        circleClass = "border-success-500 bg-success-500 text-white";
                        innerCircle = <div className="w-2 h-2 bg-white rounded-full"/>;
                      } else if (isSelected && !opt.isCorrect) {
                        optionClass = "border-danger-500 bg-danger-50";
                        circleClass = "border-danger-500 bg-danger-500 text-white";
                        innerCircle = <div className="w-2 h-2 bg-white rounded-full"/>;
                      } else {
                        optionClass = "border-gray-200 opacity-60";
                      }
                    } else if (isSelected) {
                      optionClass = "border-primary-500 bg-primary-50";
                      circleClass = "border-primary-500 bg-primary-500 text-white";
                      innerCircle = <div className="w-2 h-2 bg-white rounded-full"/>;
                    }

                    return (
                      <div 
                        key={opt._id}
                        onClick={() => !submitted && handleOptionSelect(currentQuestion.questionId, opt._id)}
                        className={`flex items-start p-4 rounded-xl border-2 transition-all ${submitted ? 'cursor-default' : 'cursor-pointer'} ${optionClass}`}
                      >
                        <div className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full border-2 mr-4 mt-0.5 ${circleClass}`}>
                          {innerCircle}
                        </div>
                        <div className="flex-1 text-gray-800 prose" dangerouslySetInnerHTML={{ __html: opt.text }} />
                      </div>
                    );
                  })}
                </div>

                {/* Solution/Explanation (Only visible when submitted) */}
                {submitted && (
                  <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <h3 className="font-bold text-blue-900 mb-2 flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2" /> Solution & Explanation
                    </h3>
                    <div className="prose max-w-none text-blue-800" dangerouslySetInnerHTML={{ __html: currentAnswer?.explanation || currentQuestion?.explanation || '<p>No explanation provided.</p>' }} />
                  </div>
                )}

                {/* Bottom Actions */}
                <div className="mt-10 pt-6 border-t flex justify-between items-center">
                   <div className="flex gap-3">
                     {!submitted && currentAnswer?.selectedOptionId && (
                       <Button variant="outline" className="text-gray-500" onClick={() => clearAnswer(currentQuestion.questionId)}>
                         Clear Response
                       </Button>
                     )}
                   </div>
                   <div className="flex gap-3">
                     <Button 
                      variant="outline" 
                      icon={ChevronLeft} 
                      disabled={currentQIdx === 0}
                      onClick={() => {
                        const nextIdx = currentQIdx - 1;
                        setCurrentQIdx(nextIdx);
                        setActiveSubject(getSubjectName(questions[nextIdx]));
                      }}
                     >
                       Previous
                     </Button>
                     <Button 
                      variant="primary" 
                      icon={ChevronRight} 
                      disabled={currentQIdx === questions.length - 1}
                      onClick={() => {
                        const nextIdx = currentQIdx + 1;
                        setCurrentQIdx(nextIdx);
                        setActiveSubject(getSubjectName(questions[nextIdx]));
                      }}
                      className="flex-row-reverse"
                     >
                       Save & Next
                     </Button>
                   </div>
                </div>
             </div>
           ) : (
             <div className="flex-1 flex items-center justify-center text-gray-500">No questions found.</div>
           )}
        </main>
      </div>

      {/* Right Sidebar (Palette) */}
      <aside className="w-80 bg-white border-l h-full flex flex-col flex-shrink-0 z-20 hidden lg:flex">
         <div className="p-4 border-b bg-gray-50">
            <h3 className="font-bold text-gray-800 text-sm">Questions Palette</h3>
            <div className="flex gap-2 mt-2 text-xs font-medium">
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-success-500 rounded-full"></div> Answered</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 border-2 border-gray-300 bg-white rounded-full"></div> Unanswered</div>
            </div>
         </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-6">
            {Object.keys(subjectGroups).map(subject => {
              const subjectQuestions = subjectGroups[subject];
              
              return (
                <div key={subject}>
                  <h3 className="text-sm font-bold text-gray-700 mb-3 border-b pb-1">{subject}</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {subjectQuestions.map((q) => {
                      const ans = session.answers?.find(a => a.questionId === q.questionId);
                      const qAnswered = ans && ans.selectedOptionId;
                      const isCurrent = currentQIdx === q.index;
                      
                      let statusClass = 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'; // Not Visited
                      
                      if (isCurrent) {
                        statusClass = 'border-primary-500 ring-2 ring-primary-200 text-primary-700 bg-primary-50';
                      } else if (qAnswered) {
                        if (submitted) {
                          statusClass = ans.isCorrect ? 'bg-success-500 border-success-600 text-white' : 'bg-danger-500 border-danger-600 text-white';
                        } else {
                          statusClass = 'bg-success-500 border-success-600 text-white';
                        }
                      }

                      return (
                        <button
                          key={q.questionId}
                          onClick={() => { setCurrentQIdx(q.index); setActiveSubject(subject); }}
                          className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium border transition-all shadow-sm ${statusClass}`}
                        >
                          {q.index + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
      </aside>

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Submit DPP?</h2>
            <p className="text-gray-600 mb-6">Are you sure you want to submit your practice session? You will be able to review the solutions immediately.</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg text-center border">
                <div className="text-2xl font-bold text-gray-900">{session.answers?.filter(a => a.selectedOptionId).length || 0}</div>
                <div className="text-xs text-gray-500 font-semibold uppercase">Answered</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center border">
                <div className="text-2xl font-bold text-gray-900">{(session.questions?.length || 0) - (session.answers?.filter(a => a.selectedOptionId).length || 0)}</div>
                <div className="text-xs text-gray-500 font-semibold uppercase">Unanswered</div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSubmitModal(false)} disabled={submitting}>Cancel</Button>
              <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Yes, Submit Now'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
