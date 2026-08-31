const fs = require('fs');

const content = `import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, ShieldAlert, ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { publicAPI } from '@/api/publicAPI';
import toast from 'react-hot-toast';

export default function PublicExamPlayer({ exam, questions, token }: any) {
  const [submission, setSubmission] = useState<{ answers: any[] }>({ answers: [] });
  const [currentQIdx, setCurrentQIdx] = useState(0);
  
  const [timeLeft, setTimeLeft] = useState(exam.settings?.durationMinutes * 60 || 3600);
  const [violations, setViolations] = useState({ tabSwitches: 0, fullScreenExits: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const snapshotIntervalRef = useRef(null);
  const timerRef = useRef(null);
  
  const getSubjectName = (q) => q?.subject?.name || q?.subjectName || (typeof q?.subject === 'string' ? q.subject : 'General');
  const subjects = [...new Set(questions.map(q => getSubjectName(q)))];
  const [activeSubject, setActiveSubject] = useState(subjects[0] || 'General');

  const takeAndUploadSnapshot = async () => {
    if (!videoRef.current || !canvasRef.current || submitting) return;
    
    const context = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
    
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) return;
      const formData = new FormData();
      formData.append('snapshot', blob, 'snapshot.jpg');
      formData.append('type', 'PERIODIC_SNAPSHOT');
      
      try {
        await publicAPI.uploadSnapshot(exam._id, token, formData);
      } catch (e) {}
    }, 'image/jpeg', 0.5);
  };

  const cleanupSecurity = () => {
    document.removeEventListener('contextmenu', (e) => e.preventDefault());
    document.removeEventListener('copy', (e) => e.preventDefault());
    document.removeEventListener('cut', (e) => e.preventDefault());
    document.removeEventListener('paste', (e) => e.preventDefault());
    if (document.fullscreenElement) document.exitFullscreen().catch(e => {});
  };

  const setupAntiCopy = () => {
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('copy', (e) => e.preventDefault());
    document.addEventListener('cut', (e) => e.preventDefault());
    document.addEventListener('paste', (e) => e.preventDefault());
  };

  const submitExamData = async () => {
    try {
      const res = await publicAPI.submitExam(exam._id, token, {
        answers: submission.answers,
        violations
      });
      setResult(res.data.data);
      setSubmitted(true);
      toast.success('Exam submitted successfully!');
      cleanupSecurity();
      clearInterval(snapshotIntervalRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to submit exam');
    }
  };

  const handleAutoSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    clearInterval(timerRef.current);
    clearInterval(snapshotIntervalRef.current);
    await submitExamData();
    setSubmitting(false);
  }, [submission, violations, submitting]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!submitted && !submitting) {
        const url = \`\${import.meta.env.VITE_API_URL}/api/public/exams/\${exam._id}/submit\`;
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${token}\`
          },
          body: JSON.stringify({ answers: submission.answers, violations }),
          keepalive: true
        }).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [submission, violations, submitted, submitting, exam._id, token]);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
             videoRef.current.play().catch(e => {});
          };
        }
        
        if (exam.security?.enableProctoring) {
          const intervalSeconds = exam.security.proctoringIntervalSeconds || 5;
          snapshotIntervalRef.current = setInterval(() => {
            takeAndUploadSnapshot();
          }, intervalSeconds * 1000);
        }
      } catch (err) {
        toast.error('Please allow camera permissions in your browser to start the exam.', { duration: 5000 });
      }
    };
    startCamera();

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    if (exam.security?.disableCopyPaste) setupAntiCopy();

    return () => {
      clearInterval(timerRef.current);
      clearInterval(snapshotIntervalRef.current);
      cleanupSecurity();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => {
    if (submitting || submitted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setViolations(v => ({ ...v, tabSwitches: v.tabSwitches + 1 }));
        toast.error('Warning: Tab switch detected! This incident has been recorded.', { duration: 5000, icon: '🚨' });
        
        if (exam.security?.maxTabSwitchesAllowed && violations.tabSwitches + 1 >= exam.security.maxTabSwitchesAllowed) {
          toast.error('Maximum violations reached. Auto-submitting exam.');
          handleAutoSubmit();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [violations, submitting, submitted]);

  useEffect(() => {
    if (submitting || submitted || !exam.security?.requireFullScreen) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        setViolations(v => ({ ...v, fullScreenExits: v.fullScreenExits + 1 }));
        toast.error('Warning: You exited full screen! Return immediately.', { duration: 5000, icon: '🚨' });
      } else {
        setIsFullscreen(true);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [submitting, submitted]);

  useEffect(() => {
    if (isFullscreen && videoRef.current && streamRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.onloadedmetadata = () => {
         videoRef.current.play().catch(e => {});
      };
    }
  }, [isFullscreen]);

  const requestFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {}
  };

  // NTA Style Handlers
  useEffect(() => {
    if (submitting || submitted) return;
    const qId = questions[currentQIdx]?._id;
    if (!qId) return;
    
    const newAnswers = [...(submission?.answers || [])];
    const existingIdx = newAnswers.findIndex(a => a.questionId === qId);
    if (existingIdx === -1) {
      newAnswers.push({ questionId: qId, selectedOptionId: null, status: 'NOT_ANSWERED' });
      setSubmission({ ...submission, answers: newAnswers });
    }
  }, [currentQIdx, submitting, submitted]);

  const handleOptionSelect = (questionId, optionId) => {
    const newAnswers = [...(submission?.answers || [])];
    const existingIdx = newAnswers.findIndex(a => a.questionId === questionId);
    
    if (existingIdx > -1) {
      newAnswers[existingIdx].selectedOptionId = optionId;
    } else {
      newAnswers.push({ questionId, selectedOptionId: optionId, status: 'NOT_ANSWERED' });
    }
    setSubmission({ ...submission, answers: newAnswers });
  };

  const goToNext = () => {
    if (currentQIdx < questions.length - 1) {
      const nextIdx = currentQIdx + 1;
      setCurrentQIdx(nextIdx);
      setActiveSubject(getSubjectName(questions[nextIdx]));
    }
  };

  const goToPrev = () => {
    if (currentQIdx > 0) {
      const nextIdx = currentQIdx - 1;
      setCurrentQIdx(nextIdx);
      setActiveSubject(getSubjectName(questions[nextIdx]));
    }
  };

  const updateStatusAndNext = (qId, status) => {
    const newAnswers = [...(submission?.answers || [])];
    let ans = newAnswers.find(a => a.questionId === qId);
    if (!ans) {
      ans = { questionId: qId, selectedOptionId: null, status };
      newAnswers.push(ans);
    } else {
      ans.status = status;
    }
    setSubmission({ ...submission, answers: newAnswers });
    goToNext();
  };

  const handleSaveAndNext = (qId) => {
    const ans = submission?.answers?.find(a => a.questionId === qId);
    if (ans?.selectedOptionId) updateStatusAndNext(qId, 'ANSWERED');
    else updateStatusAndNext(qId, 'NOT_ANSWERED');
  };

  const handleSaveAndMarkReview = (qId) => {
    const ans = submission?.answers?.find(a => a.questionId === qId);
    if (ans?.selectedOptionId) updateStatusAndNext(qId, 'ANSWERED_AND_MARKED_FOR_REVIEW');
    else toast.error('Please select an option first to Save & Mark for Review');
  };

  const handleMarkReviewAndNext = (qId) => {
    updateStatusAndNext(qId, 'MARKED_FOR_REVIEW');
  };

  const handleClearResponse = (questionId) => {
    const newAnswers = [...(submission?.answers || [])];
    const existingIdx = newAnswers.findIndex(a => a.questionId === questionId);
    
    if (existingIdx !== -1) {
      newAnswers[existingIdx].selectedOptionId = null;
      newAnswers[existingIdx].status = 'NOT_ANSWERED';
      setSubmission({ ...submission, answers: newAnswers });
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (num) => String(num).padStart(2, '0');
    if (h > 0) return \`\${pad(h)}:\${pad(m)}:\${pad(s)}\`;
    return \`\${pad(m)}:\${pad(s)}\`;
  };

  const handleManualSubmit = () => {
    if (submitting) return;
    setShowSubmitModal(true);
  };

  const confirmSubmit = async () => {
    setShowSubmitModal(false);
    if (submitting) return;
    setSubmitting(true);
    clearInterval(timerRef.current);
    clearInterval(snapshotIntervalRef.current);
    await submitExamData();
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-50 text-center p-6 space-y-6">
        <CheckCircle2 className="w-20 h-20 text-success-500" />
        <h1 className="text-3xl font-bold text-gray-900">Exam Submitted</h1>
        <p className="text-gray-600 max-w-md">Your responses have been successfully recorded.</p>
        
        {exam.settings?.showResultsAfterSubmit && result && (
          <div className="bg-white p-6 rounded-xl shadow-sm border mt-4 w-full max-w-md">
            <h3 className="font-bold text-lg mb-4 border-b pb-2">Your Score</h3>
            <div className="grid grid-cols-2 gap-4 text-left">
              <div className="bg-gray-50 p-3 rounded-lg border">
                <div className="text-sm text-gray-500">Score</div>
                <div className="text-xl font-bold text-primary-600">{result.score}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border">
                <div className="text-sm text-gray-500">Correct</div>
                <div className="text-xl font-bold text-success-600">{result.totalCorrect}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border">
                <div className="text-sm text-gray-500">Wrong</div>
                <div className="text-xl font-bold text-error-600">{result.totalWrong}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border">
                <div className="text-sm text-gray-500">Unattempted</div>
                <div className="text-xl font-bold text-gray-600">{result.totalUnattempted}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (exam.security?.requireFullScreen && !isFullscreen) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-900 text-white p-6 text-center space-y-6">
        <ShieldAlert className="w-20 h-20 text-warning-500" />
        <h1 className="text-3xl font-bold">Full Screen Required</h1>
        <p className="text-gray-300 max-w-md">This exam requires you to be in full-screen mode. Exiting full screen will be recorded as a violation.</p>
        <Button variant="primary" size="lg" onClick={requestFullscreen}>Enter Full Screen to Start</Button>
      </div>
    );
  }

  const currentQuestion = questions?.[currentQIdx];
  const currentAnswer = currentQuestion && submission.answers?.find(a => a.questionId === currentQuestion._id);

  if (!currentQuestion) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-50 text-gray-700 p-6 text-center space-y-4">
        <AlertTriangle className="w-16 h-16 text-warning-500 animate-bounce" />
        <h1 className="text-2xl font-bold">No Questions Available</h1>
        <p className="text-gray-500 max-w-sm">This exam does not contain any questions yet. Please contact your instructor or administrator.</p>
        <Button variant="primary" onClick={() => window.close()}>Close Window</Button>
      </div>
    );
  }

  const counts = {
    notVisited: questions?.length || 0,
    notAnswered: 0,
    answered: 0,
    markedForReview: 0,
    answeredAndMarked: 0
  };
  
  submission?.answers?.forEach(ans => {
    if (ans.status === 'NOT_ANSWERED') { counts.notAnswered++; counts.notVisited--; }
    else if (ans.status === 'ANSWERED') { counts.answered++; counts.notVisited--; }
    else if (ans.status === 'MARKED_FOR_REVIEW') { counts.markedForReview++; counts.notVisited--; }
    else if (ans.status === 'ANSWERED_AND_MARKED_FOR_REVIEW') { counts.answeredAndMarked++; counts.notVisited--; }
  });

  return (
    <div className="flex h-screen bg-white overflow-hidden select-none font-sans">
      {exam.security?.enableProctoring && <canvas ref={canvasRef} className="hidden" />}

      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-gray-300">
        <header className="bg-[#1c75b8] text-white h-[60px] flex items-center px-6 z-10 flex-shrink-0">
          <div className="font-bold text-xl truncate w-full tracking-wide">
             {exam.settings?.title || exam.title || 'Online Assessment'}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto relative bg-white">
           <div className="absolute inset-0 pointer-events-none opacity-5 flex items-center justify-center flex-wrap gap-10 overflow-hidden z-0">
              {Array.from({length: 30}).map((_, i) => (
                <span key={i} className="text-2xl font-bold rotate-45">CANDIDATE</span>
              ))}
           </div>

           <div className="p-6 relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-5">
                <h2 className="text-lg font-bold text-gray-800">Q.{currentQIdx + 1}</h2>
                <div className="flex gap-4 text-sm font-bold bg-gray-100 px-3 py-1 rounded">
                  <span className="text-green-700">+{currentQuestion.marks || 4} Marks</span>
                  <span className="text-red-700">-{currentQuestion.negativeMarks || 1} Marks</span>
                </div>
              </div>

              <div className="prose max-w-none text-gray-900 text-base mb-8 font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: currentQuestion.questionText }} />

              <div className="space-y-3 flex-1 ml-4">
                {currentQuestion.options?.map((opt, idx) => {
                  const isSelected = currentAnswer?.selectedOptionId === opt._id;
                  return (
                    <label 
                      key={opt._id}
                      className="flex items-start gap-4 p-2 rounded hover:bg-gray-50 cursor-pointer group"
                    >
                      <input 
                        type="radio" 
                        name="question_option" 
                        className="w-4 h-4 mt-1 text-[#1c75b8] border-gray-400 focus:ring-[#1c75b8] cursor-pointer"
                        checked={isSelected}
                        onChange={() => handleOptionSelect(currentQuestion._id, opt._id)}
                      />
                      <div className="text-gray-800 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: opt.text }} />
                    </label>
                  );
                })}
              </div>
           </div>
        </main>
        
        <div className="bg-[#f5f5f5] p-3 flex justify-between items-center border-t border-gray-300 flex-shrink-0 shadow-[0_-2px_5px_rgba(0,0,0,0.05)]">
           <div className="flex flex-wrap gap-2">
             <button className="bg-[#5cb85c] hover:bg-[#4cae4c] text-white rounded-[3px] text-[13px] px-4 py-2 font-bold shadow-sm transition-colors uppercase tracking-tight" onClick={() => handleSaveAndNext(currentQuestion._id)}>
               Save & Next
             </button>
             <button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-[3px] text-[13px] px-4 py-2 font-bold shadow-sm transition-colors uppercase tracking-tight" onClick={() => handleClearResponse(currentQuestion._id)}>
               Clear Response
             </button>
             <button className="bg-[#f0ad4e] hover:bg-[#eea236] text-white rounded-[3px] text-[13px] px-4 py-2 font-bold shadow-sm transition-colors uppercase tracking-tight" onClick={() => handleSaveAndMarkReview(currentQuestion._id)}>
               Save & Mark For Review
             </button>
             <button className="bg-[#337ab7] hover:bg-[#286090] text-white rounded-[3px] text-[13px] px-4 py-2 font-bold shadow-sm transition-colors uppercase tracking-tight" onClick={() => handleMarkReviewAndNext(currentQuestion._id)}>
               Mark For Review & Next
             </button>
           </div>
           <div className="flex gap-2">
              <button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-[3px] text-[13px] px-4 py-2 font-bold shadow-sm disabled:opacity-50 transition-colors uppercase tracking-tight" disabled={currentQIdx === 0} onClick={() => goToPrev()}>
                &lt;&lt; Back
              </button>
              <button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-[3px] text-[13px] px-4 py-2 font-bold shadow-sm disabled:opacity-50 transition-colors uppercase tracking-tight" disabled={currentQIdx === questions.length - 1} onClick={() => goToNext()}>
                Next &gt;&gt;
              </button>
           </div>
        </div>
      </div>

      <aside className="w-[320px] bg-[#eef1f8] flex flex-col flex-shrink-0 z-20">
         <div className="bg-white flex flex-col border-b border-gray-300 p-3 pb-2 shadow-sm">
           {exam.security?.enableProctoring && (
             <div className="w-full bg-black rounded overflow-hidden relative mb-3 flex-shrink-0 border border-gray-200" style={{ height: '140px' }}>
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded-full border border-white/20">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-white text-[10px] font-bold tracking-wider uppercase">Live</span>
                </div>
             </div>
           )}
           <div className="flex items-start justify-between">
              <div className="flex-1">
                 <div className="text-[11px] text-gray-500 uppercase font-bold tracking-wide">Candidate</div>
                 <div className="text-[15px] font-bold text-gray-800 leading-tight">
                   Public User
                 </div>
              </div>
              <div className="text-right ml-2">
                <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wide mb-1">Time Left</div>
                <div className="bg-[#e4f3f9] border border-[#bce8f1] text-[#31708f] font-bold px-2 py-1 rounded text-[15px] inline-block tracking-widest shadow-inner">
                  {formatTime(timeLeft)}
                </div>
              </div>
           </div>
         </div>

         <div className="p-3 bg-[#e8f1f8] grid grid-cols-2 gap-x-1 gap-y-2 text-[11px] font-bold text-gray-700 border-b border-white border-t border-t-gray-200/50">
            <div className="flex items-center gap-2">
               <div className="w-[30px] h-[26px] bg-[#f0f0f0] border border-[#cccccc] shadow-[inset_0_-2px_0_rgba(0,0,0,0.05)] flex items-center justify-center font-bold text-gray-700 rounded-[3px]">
                 {counts.notVisited}
               </div> 
               <span className="leading-none mt-1">Not Visited</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-[30px] h-[26px] bg-[#d9534f] border border-[#d43f3a] text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] flex items-center justify-center font-bold rounded-t-[3px] rounded-bl-[3px] rounded-br-[10px]">
                 {counts.notAnswered}
               </div>
               <span className="leading-none mt-1">Not Answered</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-[30px] h-[26px] bg-[#5cb85c] border border-[#4cae4c] text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] flex items-center justify-center font-bold rounded-t-[3px] rounded-bl-[3px] rounded-br-[10px]">
                 {counts.answered}
               </div>
               <span className="leading-none mt-1">Answered</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-[28px] h-[28px] bg-[#9b59b6] border border-[#8e44ad] text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] flex items-center justify-center font-bold rounded-full">
                 {counts.markedForReview}
               </div>
               <span className="leading-none mt-1">Marked for Review</span>
            </div>
            <div className="flex items-center gap-2 col-span-2 mt-1">
               <div className="w-[28px] h-[28px] bg-[#9b59b6] border border-[#8e44ad] text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] flex items-center justify-center font-bold rounded-full relative">
                 {counts.answeredAndMarked}
                 <div className="absolute bottom-[2px] right-[2px] w-[8px] h-[8px] bg-[#5cb85c] rounded-full border border-white"></div>
               </div>
               <span className="leading-tight mt-1 text-[10px]">Answered & Marked for Review<br/>(will be considered for evaluation)</span>
            </div>
         </div>

         <div className="bg-[#428bca] text-white flex overflow-x-auto shadow-inner h-[38px] flex-shrink-0">
            {subjects.map(sub => (
              <button
                key={sub}
                onClick={() => {
                  setActiveSubject(sub);
                  const firstIdx = questions.findIndex(q => getSubjectName(q) === sub);
                  if (firstIdx !== -1) setCurrentQIdx(firstIdx);
                }}
                className={\`px-3 py-0 text-[12px] font-bold whitespace-nowrap transition-colors uppercase tracking-tight flex-1 \${activeSubject === sub ? 'bg-white text-gray-800' : 'hover:bg-[#3276b1]'}\`}
              >
                {sub}
              </button>
            ))}
         </div>

         <div className="bg-[#eef1f8] p-3 flex-1 overflow-y-auto">
           <div className="text-[12px] font-bold text-gray-700 mb-2 uppercase tracking-wide px-1">Choose a Question</div>
           <div className="grid grid-cols-5 gap-2 px-1">
             {questions.map((q, i) => {
               if (getSubjectName(q) !== activeSubject) return null;
               
               const ans = submission?.answers?.find(a => a.questionId === q._id);
               
               let styleClass = "bg-[#f0f0f0] border-[#cccccc] text-gray-700 shadow-[inset_0_-2px_0_rgba(0,0,0,0.05)] rounded-[3px]";
               let innerContent: any = i + 1;
               
               if (ans) {
                 if (ans.status === 'NOT_ANSWERED') {
                   styleClass = "bg-[#d9534f] border-[#d43f3a] text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] rounded-t-[3px] rounded-bl-[3px] rounded-br-[12px]";
                 } else if (ans.status === 'ANSWERED') {
                   styleClass = "bg-[#5cb85c] border-[#4cae4c] text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] rounded-t-[3px] rounded-bl-[3px] rounded-br-[12px]";
                 } else if (ans.status === 'MARKED_FOR_REVIEW') {
                   style, styleClass = "bg-[#9b59b6] border-[#8e44ad] text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] rounded-full";
                 } else if (ans.status === 'ANSWERED_AND_MARKED_FOR_REVIEW') {
                   styleClass = "bg-[#9b59b6] border-[#8e44ad] text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] rounded-full relative";
                   innerContent = (
                     <>
                       {i + 1}
                       <div className="absolute bottom-[2px] right-[2px] w-[8px] h-[8px] bg-[#5cb85c] rounded-full border border-white"></div>
                     </>
                   );
                 }
               }
               
               const isActive = currentQIdx === i;

               return (
                 <button
                   key={q._id}
                   onClick={() => setCurrentQIdx(i)}
                   className={\`w-full aspect-square flex items-center justify-center text-[13px] font-bold border transition-all \${styleClass} \${isActive ? 'ring-[3px] ring-blue-300 scale-105' : 'hover:opacity-90'}\`}
                 >
                   {innerContent}
                 </button>
               );
             })}
           </div>
         </div>
         
         <div className="p-3 bg-[#e8f1f8] border-t border-gray-300 flex justify-center shadow-[0_-2px_5px_rgba(0,0,0,0.05)]">
            <button className="bg-[#5cb85c] hover:bg-[#4cae4c] border border-[#4cae4c] text-white w-full rounded-[3px] py-2.5 text-[15px] font-bold shadow-md transition-colors uppercase tracking-widest" onClick={handleManualSubmit} disabled={submitting}>
              Submit Exam
            </button>
         </div>
      </aside>
    
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
           <div className="bg-white p-6 rounded-lg shadow-2xl max-w-sm w-full mx-4 border-t-4 border-[#1c75b8]">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Submit Exam?</h3>
              <p className="text-gray-600 mb-6 text-sm">Are you sure you want to submit? You cannot change your answers after submission.</p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowSubmitModal(false)}>Cancel</Button>
                <Button variant="primary" className="bg-[#1c75b8] hover:bg-[#155a8f]" onClick={confirmSubmit}>Yes, Submit</Button>
              </div>
           </div>
        </div>
      )}
    
    </div>
  );
}
`;

fs.writeFileSync('src/app/e/[id]/PublicExamPlayer.tsx', content);
