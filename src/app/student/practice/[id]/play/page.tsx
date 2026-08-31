"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { CheckCircle, XCircle, ChevronRight, ChevronLeft, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button.jsx';
import { studentAPI } from '@/api/index.js';
import toast from 'react-hot-toast';

export default function PracticePlayer() {
  const { id } = useParams();
  const router = useRouter();
  
  const getSubjectName = (q) => q?.subjectName || 'General';

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [activeSubject, setActiveSubject] = useState(null);
  const [unsavedAnswers, setUnsavedAnswers] = useState({});
  const [savingAnswer, setSavingAnswer] = useState(false);

  // Load Session
  useEffect(() => {
    const loadSession = async () => {
      try {
        const res = await studentAPI.getPracticeSession(id);
        const data = res.data.data;
        
        setSession(data);
        if (data.questions && data.questions.length > 0) {
          setActiveSubject(getSubjectName(data.questions[0]));
        }
        setLoading(false);
      } catch (error) {
        toast.error('Failed to load Practice session');
        router.push('/student/practice');
      }
    };
    loadSession();
  }, [id, router]);

  const handleOptionSelect = async (questionId, optionId) => {
    const isDpp = session.sessionType === 'DPP';
    
    // Prevent changing answer once selected and saved in practice mode
    if (!isDpp) {
      const existingAns = session.answers?.find(a => a.questionId === questionId);
      if (existingAns && existingAns.selectedOptionId) return;
    }
    
    setUnsavedAnswers(prev => ({ ...prev, [questionId]: optionId }));

    // For DPP, auto-save silently so they don't need a "Check" button
    if (isDpp) {
      try {
        await studentAPI.savePracticeProgress(id, {
          questionId,
          selectedOptionId: optionId,
          status: 'ANSWERED'
        });
        
        const newAnswers = [...(session.answers || [])];
        const existingIdx = newAnswers.findIndex(a => a.questionId === questionId);
        const newAns = { questionId, selectedOptionId: optionId, status: 'ANSWERED' };
        
        if (existingIdx >= 0) {
          newAnswers[existingIdx] = { ...newAnswers[existingIdx], ...newAns };
        } else {
          newAnswers.push(newAns);
        }
        setSession(prev => ({ ...prev, answers: newAnswers }));
      } catch (e) {
        console.error('Auto-save failed');
      }
    }
  };

  const handleCheckAnswer = async () => {
    const questionId = session.questions[currentQIdx]?.questionId;
    const optionId = unsavedAnswers[questionId];
    if (!optionId || savingAnswer) return;

    setSavingAnswer(true);
    try {
      const res = await studentAPI.savePracticeProgress(id, {
        questionId,
        selectedOptionId: optionId,
        status: 'ANSWERED'
      });
      
      const { isCorrect, explanation } = res.data.data;
      
      const newAnswers = [...(session.answers || [])];
      const existingIdx = newAnswers.findIndex(a => a.questionId === questionId);
      const newAns = { questionId, selectedOptionId: optionId, status: 'ANSWERED', isCorrect, explanation };
      
      if (existingIdx >= 0) {
        newAnswers[existingIdx] = newAns;
      } else {
        newAnswers.push(newAns);
      }
      setSession(prev => ({ ...prev, answers: newAnswers }));
      
    } catch (e) {
      toast.error('Failed to save answer');
    } finally {
      setSavingAnswer(false);
    }
  };

  const handleFinish = async () => {
    try {
      const res = await studentAPI.submitPracticeSession(id);
      toast.success('Practice Session Finished!');
      setSession(res.data.data); // Update with evaluated answers
      setCurrentQIdx(0); // Go back to question 1 for review
    } catch (e) {
      toast.error('Failed to finish session');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  if (!session) return null;

  const questions = session.questions || [];
  const currentQuestion = questions[currentQIdx];
  const currentAnswer = session.answers?.find(a => a.questionId === currentQuestion?.questionId);
  const isAnswered = currentAnswer && currentAnswer.selectedOptionId;
  const isCompleted = session.status === 'COMPLETED';
  const isDpp = session.sessionType === 'DPP';
  
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
          <div className="font-bold text-xl text-gray-900 truncate pr-4">{session.title || 'Practice Session'}</div>
          
          <div className="flex items-center gap-3">
             <Button variant="outline" onClick={() => {
                if (session?.linkedExamId) {
                  router.push(`/student/exams/${session.linkedExamId}/analysis`);
                } else {
                  router.push('/student/practice');
                }
             }} className="text-gray-600 border-gray-300">
               {isCompleted ? (session?.linkedExamId ? 'Back to Analysis' : 'Back to List') : 'Pause / Exit'}
             </Button>
             {!isCompleted && (
               <Button variant="gradient" onClick={handleFinish}>
                 Submit Practice
               </Button>
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
                    const isSelected = (currentAnswer?.selectedOptionId === opt._id) || (unsavedAnswers[currentQuestion.questionId] === opt._id);
                    const showCorrectness = isCompleted || (!isDpp && isAnswered);
                    const isLocked = isCompleted || (!isDpp && isAnswered);
                    
                    let optionClass = "border-gray-200 hover:border-primary-200 hover:bg-gray-50";
                    let circleClass = "border-gray-300";
                    let innerCircle = null;

                    if (showCorrectness) {
                      if (opt.isCorrect) {
                        optionClass = "border-success-500 bg-success-50";
                        circleClass = "border-success-500 bg-success-500 text-white";
                        innerCircle = <div className="w-2 h-2 bg-white rounded-full"/>;
                      } else if (isSelected && !opt.isCorrect) {
                        optionClass = "border-danger-500 bg-danger-50";
                        circleClass = "border-danger-500 bg-danger-500 text-white";
                        innerCircle = <div className="w-2 h-2 bg-white rounded-full"/>;
                      } else {
                        optionClass = "border-gray-200 opacity-50";
                      }
                    } else if (isSelected) {
                      optionClass = "border-primary-500 bg-primary-50";
                      circleClass = "border-primary-500 bg-primary-500 text-white";
                      innerCircle = <div className="w-2 h-2 bg-white rounded-full"/>;
                    }

                    return (
                      <div 
                        key={opt._id}
                        onClick={() => !isLocked && !savingAnswer && handleOptionSelect(currentQuestion.questionId, opt._id)}
                        className={`flex items-start p-4 rounded-xl border-2 transition-all ${(isLocked || savingAnswer) ? 'cursor-default' : 'cursor-pointer'} ${optionClass}`}
                      >
                        <div className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full border-2 mr-4 mt-0.5 ${circleClass}`}>
                          {innerCircle}
                        </div>
                        <div className="flex-1 text-gray-800 prose" dangerouslySetInnerHTML={{ __html: opt.text }} />
                      </div>
                    );
                  })}
                </div>

                {/* Immediate Solution Feedback */}
                {(isCompleted || (!isDpp && isAnswered && currentAnswer?.isCorrect !== undefined)) && (
                  <div className={`mt-8 border rounded-xl p-6 animate-fade-in ${currentAnswer?.isCorrect ? 'bg-success-50 border-success-200' : (currentAnswer?.isCorrect === false ? 'bg-danger-50 border-danger-200' : 'bg-blue-50 border-blue-200')}`}>
                    <h3 className={`font-bold mb-2 flex items-center ${currentAnswer?.isCorrect ? 'text-success-800' : (currentAnswer?.isCorrect === false ? 'text-danger-800' : 'text-blue-800')}`}>
                      {currentAnswer?.isCorrect ? (
                        <><CheckCircle className="w-6 h-6 mr-2" /> Correct Answer!</>
                      ) : currentAnswer?.isCorrect === false ? (
                        <><XCircle className="w-6 h-6 mr-2" /> Incorrect!</>
                      ) : (
                        <><CheckCircle className="w-6 h-6 mr-2" /> Solution</>
                      )}
                    </h3>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200/50">
                      <h4 className="font-bold text-gray-800 mb-2">Explanation:</h4>
                      <div className="prose max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: currentAnswer?.explanation || currentQuestion?.explanation || '<p>No explanation provided.</p>' }} />
                    </div>
                  </div>
                )}

                {/* Bottom Actions */}
                <div className="mt-10 pt-6 border-t flex justify-between items-center">
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
                   </div>
                   <div className="flex gap-3">
                     {!isDpp && !isAnswered && !isCompleted && unsavedAnswers[currentQuestion.questionId] && (
                       <Button onClick={handleCheckAnswer} disabled={savingAnswer} variant="primary">
                         {savingAnswer ? 'Checking...' : 'Check Answer'}
                       </Button>
                     )}
                     
                     <Button 
                      variant={(!isDpp && isAnswered) || (isDpp && (isAnswered || unsavedAnswers[currentQuestion.questionId])) ? "primary" : "outline"}
                      icon={ChevronRight} 
                      disabled={currentQIdx === questions.length - 1}
                      onClick={() => {
                        const nextIdx = currentQIdx + 1;
                        setCurrentQIdx(nextIdx);
                        setActiveSubject(getSubjectName(questions[nextIdx]));
                      }}
                      className="flex-row-reverse"
                     >
                       Next
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
                        const showCorrectness = isCompleted || (!isDpp && ans.isCorrect !== undefined);
                        if (showCorrectness) {
                          statusClass = ans.isCorrect ? 'bg-success-500 border-success-600 text-white' : 'bg-danger-500 border-danger-600 text-white';
                        } else {
                          statusClass = 'bg-primary-500 border-primary-600 text-white'; // Answered but not evaluated
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
    </div>
  );
}
