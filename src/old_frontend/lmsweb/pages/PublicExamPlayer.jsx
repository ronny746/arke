import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, ShieldAlert, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { publicAPI } from '../api/publicAPI.js';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function PublicExamPlayer({ exam, questions, token }) {
  const navigate = useNavigate();
  const [submission, setSubmission] = useState({ answers: [] });
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
  
  const subjects = [...new Set(questions.map(q => q.subject || 'General'))];

  const timerRef = useRef(null);

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
      } catch (e) {
        console.error('Failed to upload snapshot', e);
      }
    }, 'image/jpeg', 0.5);
  };

  const cleanupSecurity = () => {
    document.removeEventListener('contextmenu', (e) => e.preventDefault());
    document.removeEventListener('copy', (e) => e.preventDefault());
    document.removeEventListener('cut', (e) => e.preventDefault());
    document.removeEventListener('paste', (e) => e.preventDefault());
    if (document.fullscreenElement) document.exitFullscreen().catch(e => console.error(e));
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

  // Auto-submit when tab is closed
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!submitted && !submitting) {
        // We can't await here, so we use fetch keepalive or navigator.sendBeacon
        const url = `${import.meta.env.VITE_API_URL}/api/public/exams/${exam._id}/submit`;
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
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
             videoRef.current.play().catch(e => console.error("Play error:", e));
          };
        }
        
        // Start taking periodic snapshots
        if (exam.security?.enableProctoring) {
          const intervalSeconds = exam.security.proctoringIntervalSeconds || 5;
          snapshotIntervalRef.current = setInterval(() => {
            takeAndUploadSnapshot();
          }, intervalSeconds * 1000);
        }
      } catch (err) {
        console.error('Camera access denied:', err);
        toast.error('Please allow camera permissions in your browser to start the exam.', { duration: 5000 });
      }
    };
    startCamera();


    // Start Timer
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

  // Handle Tab Switch (Visibility API)
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

  // Handle Fullscreen Enforcement
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

  // Re-attach camera stream if component re-renders (e.g. after fullscreen)
  useEffect(() => {
    if (isFullscreen && videoRef.current && streamRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.onloadedmetadata = () => {
         videoRef.current.play().catch(e => console.error("Play error:", e));
      };
    }
  }, [isFullscreen]);

  const requestFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.error('Fullscreen request failed:', e);
    }
  };



  const handleOptionSelect = (questionId, optionId) => {
    const newAnswers = [...submission.answers];
    const existingIdx = newAnswers.findIndex(a => a.questionId === questionId);
    
    if (existingIdx !== -1) {
      newAnswers[existingIdx].selectedOptionId = optionId;
      newAnswers[existingIdx].status = newAnswers[existingIdx].status === 'MARKED_FOR_REVIEW' ? 'ANSWERED_AND_MARKED_FOR_REVIEW' : 'ANSWERED';
    } else {
      newAnswers.push({ questionId, selectedOptionId: optionId, status: 'ANSWERED' });
    }
    setSubmission({ ...submission, answers: newAnswers });
  };

  const handleMarkReview = (questionId) => {
    const newAnswers = [...submission.answers];
    const existingIdx = newAnswers.findIndex(a => a.questionId === questionId);
    
    let newStatus = 'MARKED_FOR_REVIEW';
    if (existingIdx !== -1) {
      if (newAnswers[existingIdx].selectedOptionId) {
        newStatus = newAnswers[existingIdx].status === 'ANSWERED_AND_MARKED_FOR_REVIEW' ? 'ANSWERED' : 'ANSWERED_AND_MARKED_FOR_REVIEW';
      } else {
        newStatus = newAnswers[existingIdx].status === 'MARKED_FOR_REVIEW' ? 'NOT_ANSWERED' : 'MARKED_FOR_REVIEW';
      }
      newAnswers[existingIdx].status = newStatus;
    } else {
      newAnswers.push({ questionId, status: newStatus });
    }
    
    setSubmission({ ...submission, answers: newAnswers });
  };

  const handleClearResponse = (questionId) => {
    const newAnswers = [...submission.answers];
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
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
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

  const currentQuestion = questions[currentQIdx];
  const currentAnswer = submission.answers?.find(a => a.questionId === currentQuestion._id);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden select-none">
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b h-16 flex items-center justify-between px-6 shadow-sm z-10 flex-shrink-0">
          <div className="font-bold text-xl text-gray-900 truncate pr-4">{exam.title}</div>
          
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2 px-4 py-2 bg-error-50 rounded-lg border border-error-100">
                <Clock className={`w-5 h-5 ${timeLeft < 300 ? 'text-error-600 animate-pulse' : 'text-gray-600'}`} />
                <span className={`font-mono text-xl font-bold ${timeLeft < 300 ? 'text-error-600' : 'text-gray-800'}`}>
                  {formatTime(timeLeft)}
                </span>
             </div>
             <Button variant="gradient" onClick={handleManualSubmit} disabled={submitting}>
                Submit Exam
             </Button>
          </div>
        </header>

        {/* Question Area */}
        <main className="flex-1 overflow-y-auto p-8 relative">
           <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border p-8 relative z-10">
              <div className="flex justify-between items-center border-b pb-4 mb-6">
                <h2 className="text-xl font-bold text-gray-800">Question {currentQIdx + 1}</h2>
                <div className="flex gap-4 text-sm font-semibold">
                  <span className="text-success-600">+{currentQuestion.marks || 4} Marks</span>
                  <span className="text-error-600">-{currentQuestion.negativeMarks || 1} Marks</span>
                </div>
              </div>

              <div className="prose max-w-none text-gray-900 text-lg mb-8" dangerouslySetInnerHTML={{ __html: currentQuestion.questionText }} />

              <div className="space-y-4">
                {currentQuestion.options?.map((opt) => {
                  const isSelected = currentAnswer?.selectedOptionId === opt._id;
                  return (
                    <div 
                      key={opt._id}
                      onClick={() => handleOptionSelect(currentQuestion._id, opt._id)}
                      className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full border-2 mr-4 mt-0.5 ${
                        isSelected ? 'border-primary-500 bg-primary-500 text-white' : 'border-gray-300'
                      }`}>
                        {isSelected && <div className="w-2 h-2 bg-white rounded-full"/>}
                      </div>
                      <div className="flex-1 text-gray-800" dangerouslySetInnerHTML={{ __html: opt.text }} />
                    </div>
                  );
                })}
              </div>

              <div className="mt-10 pt-6 border-t flex justify-between items-center">
                 <div className="flex gap-3">
                   <Button variant="outline" onClick={() => handleMarkReview(currentQuestion._id)}>
                     {currentAnswer?.status?.includes('MARKED') ? 'Unmark Review' : 'Mark for Review'}
                   </Button>
                   <Button variant="outline" className="text-gray-500" onClick={() => handleClearResponse(currentQuestion._id)}>
                     Clear Response
                   </Button>
                 </div>
                 <div className="flex gap-3">
                   <Button 
                    variant="outline" 
                    icon={ChevronLeft} 
                    disabled={currentQIdx === 0}
                    onClick={() => setCurrentQIdx(c => c - 1)}
                   >
                     Previous
                   </Button>
                   <Button 
                    variant="primary" 
                    icon={ChevronRight} 
                    disabled={currentQIdx === questions.length - 1}
                    onClick={() => setCurrentQIdx(c => c + 1)}
                    className="flex-row-reverse"
                   >
                     Save & Next
                   </Button>
                 </div>
              </div>
           </div>
        </main>
      </div>

      
      <aside className="w-80 bg-white border-l h-full flex flex-col flex-shrink-0 z-20">
         {/* Camera View */}
         <div className="p-4 border-b bg-gray-50 flex flex-col items-center">
            <h3 className="font-bold text-gray-800 mb-2 self-start text-sm">Live Proctoring</h3>
            <div className="bg-gray-900 rounded-lg overflow-hidden aspect-video relative flex items-center justify-center w-full">
               <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }}></video>
               {/* Hidden canvas for taking snapshots */}
               <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
               <div className="absolute top-2 left-2 px-2 py-1 bg-black bg-opacity-50 text-white text-xs font-medium rounded backdrop-blur-sm flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                 Recording
               </div>
            </div>
         </div>

          {/* Palette Scroll Area */}
          <div className="p-4 flex-1 overflow-y-auto space-y-6">
            {subjects.map(subject => {
              const subjectQuestions = questions.map((q, i) => ({ q, i })).filter(({ q }) => (q.subject || 'General') === subject);
              if (subjectQuestions.length === 0) return null;
              
              return (
                <div key={subject}>
                  <h3 className="text-sm font-bold text-gray-700 mb-3 border-b pb-1">{subject}</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {subjectQuestions.map(({ q, i }) => {
                      const ans = submission?.answers?.find(a => a.questionId === q._id);
                      let statusClass = 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'; // Not Visited
                      
                      if (currentQIdx === i) {
                        statusClass = 'border-primary-500 ring-2 ring-primary-200 text-primary-700 bg-primary-50';
                      } else if (ans) {
                        if (ans.status === 'ANSWERED') statusClass = 'bg-success-500 border-success-600 text-white';
                        else if (ans.status === 'MARKED_FOR_REVIEW') statusClass = 'bg-warning-500 border-warning-600 text-white';
                        else if (ans.status === 'ANSWERED_AND_MARKED_FOR_REVIEW') statusClass = 'bg-primary-500 border-primary-600 text-white';
                      }

                      return (
                        <button
                          key={q._id}
                          onClick={() => setCurrentQIdx(i)}
                          className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium border transition-all shadow-sm ${statusClass}`}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

         <div className="p-4 border-t bg-gray-50 space-y-2 text-xs text-gray-600">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-success-500"></div> Answered</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-error-500"></div> Not Answered</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-warning-500"></div> Marked</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-primary-500"></div> Ans & Marked</div>
         </div>
      </aside>
    
    
      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
           <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Submit Exam?</h3>
              <p className="text-gray-600 mb-6">Are you sure you want to submit? You cannot change your answers after submission.</p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowSubmitModal(false)}>Cancel</Button>
                <Button variant="primary" onClick={confirmSubmit}>Yes, Submit</Button>
              </div>
           </div>
        </div>
      )}
    
    </div>
  );
}
