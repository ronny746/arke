"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';

import { Clock, AlertTriangle, CheckCircle, ChevronRight, ChevronLeft, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button.jsx';
import { studentAPI } from '@/api/index.js';
import toast from 'react-hot-toast';

export default function ExamPlayer() {
  const { id } = useParams();
  const router = useRouter();
  
  const getSubjectName = (q) => q?.subject?.name || q?.subjectName || (typeof q?.subject === 'string' ? q.subject : 'General');

  const [examState, setExamState] = useState(null); // Contains exam settings and questions
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [violations, setViolations] = useState({ tabSwitches: 0, fullScreenExits: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [activeSubject, setActiveSubject] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Webcam Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  const timerRef = useRef(null);
  const snapshotIntervalRef = useRef(null);

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
        await studentAPI.uploadSnapshot(id, formData);
      } catch (e) {
        console.error('Failed to upload snapshot', e);
      }
    }, 'image/jpeg', 0.5); // 50% quality to save bandwidth
  };

  const handleAutoSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    clearInterval(timerRef.current);
    clearInterval(snapshotIntervalRef.current);
    
    try {
      await studentAPI.submitExam(id, { isAutoSubmit: true, violations });
      setSubmitted(true);
      toast.success('Time is up! Exam auto-submitted.');
      cleanupSecurity();
      router.push('/student/exams');
    } catch (e) {
      toast.error('Failed to submit exam');
      setSubmitting(false);
    }
  }, [id, violations, submitting, router]);

  // Setup Exam Datart
  useEffect(() => {
    const initializeExam = async () => {
      try {
        const res = await studentAPI.startExam(id);
        const { submission: sub, questions, settings, security } = res.data.data;
        
        const sortedQuestions = (questions || []).sort((a, b) => (a.order || 0) - (b.order || 0));
        setExamState({
          ...res.data.data,
          questions: sortedQuestions
        });
        setSubmission(sub);
        
        if (sortedQuestions.length > 0) {
          setActiveSubject(getSubjectName(sortedQuestions[0]));
        } else {
          setActiveSubject('General');
        }
        
        // Calculate remaining time
        const start = new Date(sub.startTime).getTime();
        const durationMs = settings.durationMinutes * 60 * 1000;
        const now = Date.now();
        const elapsed = now - start;
        let remaining = Math.max(0, Math.floor((durationMs - elapsed) / 1000));
        setTimeLeft(remaining);
        
        if (sub.violations) {
          setViolations({
            tabSwitches: sub.violations.tabSwitches || 0,
            fullScreenExits: sub.violations.fullScreenExits || 0
          });
        }

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

        // Security Setup
        if (security.enableProctoring) startWebcam(security.proctoringIntervalSeconds);
        if (security.disableCopyPaste) setupAntiCopy();
        
        setLoading(false);
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Failed to load exam');
        router.push('/student/exams');
      }
    };

    initializeExam();

    return () => {
      clearInterval(timerRef.current);
      clearInterval(snapshotIntervalRef.current);
      stopWebcam();
      cleanupSecurity();
    };
  }, [id]);

  // Handle Mobile Device Detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle Tab Switch (Visibility API)
  useEffect(() => {
    if (!examState || submitting) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const newViolations = { ...violations, tabSwitches: violations.tabSwitches + 1 };
        setViolations(newViolations);
        toast.error('Warning: Tab switch detected! This incident has been recorded.', { duration: 5000, icon: '🚨' });
        
        // Save violation to DB immediately
        studentAPI.saveAnswer(id, { violations: newViolations }).catch(()=>console.error('Failed to log violation'));

        if (examState.security.maxTabSwitchesAllowed && newViolations.tabSwitches >= examState.security.maxTabSwitchesAllowed) {
          toast.error('Maximum violations reached. Auto-submitting exam.');
          handleAutoSubmit();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [examState, violations, submitting]);

  // Handle Fullscreen Enforcement
  useEffect(() => {
    if (!examState || submitting || !examState.security.requireFullScreen) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        const newViolations = { ...violations, fullScreenExits: violations.fullScreenExits + 1 };
        setViolations(newViolations);
        toast.error('Warning: You exited full screen! Return immediately.', { duration: 5000, icon: '🚨' });
        studentAPI.saveAnswer(id, { violations: newViolations }).catch(console.error);
      } else {
        setIsFullscreen(true);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [examState, violations, submitting]);

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

  const setupAntiCopy = () => {
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('copy', (e) => e.preventDefault());
    document.addEventListener('cut', (e) => e.preventDefault());
    document.addEventListener('paste', (e) => e.preventDefault());
  };

  const cleanupSecurity = () => {
    document.removeEventListener('contextmenu', (e) => e.preventDefault());
    document.removeEventListener('copy', (e) => e.preventDefault());
    document.removeEventListener('cut', (e) => e.preventDefault());
    document.removeEventListener('paste', (e) => e.preventDefault());
    if (document.fullscreenElement) document.exitFullscreen().catch(e => console.error(e));
  };

  // Webcam Setup
  const startWebcam = async (intervalSeconds) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(e => console.error("Play error:", e));
        };
      }
      
      // Start taking snapshots
      snapshotIntervalRef.current = setInterval(() => {
        takeAndUploadSnapshot();
      }, intervalSeconds * 1000);
      
    } catch (err) {
      toast.error('Webcam permission is required for this exam!');
      console.error(err);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  // Handle Answers
  const handleOptionSelect = async (questionId, optionId) => {
    // Optimistic UI update
    const newAnswers = [...(submission.answers || [])];
    const existingIdx = newAnswers.findIndex(a => a.questionId === questionId);
    
    if (existingIdx !== -1) {
      newAnswers[existingIdx].selectedOptionId = optionId;
      newAnswers[existingIdx].status = newAnswers[existingIdx].status === 'MARKED_FOR_REVIEW' ? 'ANSWERED_AND_MARKED_FOR_REVIEW' : 'ANSWERED';
    } else {
      newAnswers.push({ questionId, selectedOptionId: optionId, status: 'ANSWERED' });
    }
    setSubmission({ ...submission, answers: newAnswers });

    // Sync with backend
    try {
      await studentAPI.saveAnswer(id, { questionId, selectedOptionId: optionId });
    } catch (error) {
      toast.error('Failed to save answer. Connection issue.');
    }
  };

  const handleMarkReview = async (questionId) => {
    const newAnswers = [...(submission.answers || [])];
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
    await studentAPI.saveAnswer(id, { questionId, status: newStatus });
  };

  const handleClearResponse = async (questionId) => {
    const newAnswers = [...(submission.answers || [])];
    const existingIdx = newAnswers.findIndex(a => a.questionId === questionId);
    
    if (existingIdx !== -1) {
      newAnswers[existingIdx].selectedOptionId = null;
      newAnswers[existingIdx].status = 'NOT_ANSWERED';
      setSubmission({ ...submission, answers: newAnswers });
      await studentAPI.saveAnswer(id, { questionId, selectedOptionId: null, status: 'NOT_ANSWERED' });
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!submitted && !submitting) {
        fetch(import.meta.env.VITE_API_BASE_URL + `/student/exams/${id}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ isAutoSubmit: true, violations }),
          keepalive: true
        }).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [id, submitted, submitting, violations]);

  const handleManualSubmit = () => {
    if (submitting) return;
    setShowSubmitModal(true);
  };

  const confirmSubmit = async () => {
    setShowSubmitModal(false);
    setSubmitting(true);
    clearInterval(timerRef.current);
    clearInterval(snapshotIntervalRef.current);
    
    try {
      await studentAPI.submitExam(id, { isAutoSubmit: false, violations });
      setSubmitted(true);
      toast.success('Exam submitted successfully!');
      cleanupSecurity();
      router.push('/student/exams');
    } catch (e) {
      toast.error('Failed to submit exam');
      setSubmitting(false);
    }
  };

  const getQuestionStatusColor = (qId) => {
    const ans = submission?.answers?.find(a => a.questionId === qId);
    if (!ans) return 'bg-gray-100 text-gray-700 border-gray-300';
    if (ans.status === 'ANSWERED') return 'bg-success-500 text-white border-success-600';
    if (ans.status === 'MARKED_FOR_REVIEW') return 'bg-warning-500 text-white border-warning-600';
    if (ans.status === 'ANSWERED_AND_MARKED_FOR_REVIEW') return 'bg-primary-500 text-white border-primary-600'; // purple-ish
    return 'bg-gray-100 text-gray-700 border-gray-300';
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  if (isMobile) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-900 text-white p-6 text-center space-y-6">
        <ShieldAlert className="w-20 h-20 text-danger-500" />
        <h1 className="text-3xl font-bold">Mobile Access Restricted</h1>
        <p className="text-gray-300 max-w-md">This test cannot be taken on a mobile device. Please switch to a laptop, desktop, or a device with a larger screen to start the test.</p>
        <Button variant="primary" size="lg" onClick={() => router.push('/student/exams')}>Go Back</Button>
      </div>
    );
  }

  if (examState?.security?.requireFullScreen && !isFullscreen) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-900 text-white p-6 text-center space-y-6">
        <ShieldAlert className="w-20 h-20 text-warning-500" />
        <h1 className="text-3xl font-bold">Full Screen Required</h1>
        <p className="text-gray-300 max-w-md">This exam requires you to be in full-screen mode to prevent cheating. Exiting full screen will be recorded as a violation.</p>
        <Button variant="primary" size="lg" onClick={requestFullscreen}>Enter Full Screen to Start</Button>
      </div>
    );
  }

  const currentQuestion = examState?.questions?.[currentQIdx];
  const currentAnswer = currentQuestion && submission?.answers?.find(a => a.questionId === currentQuestion._id);
  
  const subjects = examState?.questions ? [...new Set(examState.questions.map(q => getSubjectName(q)))] : [];
  const questionsInSubject = examState?.questions ? examState.questions.filter(q => getSubjectName(q) === activeSubject) : [];

  if (!currentQuestion) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-50 text-gray-700 p-6 text-center space-y-4">
        <AlertTriangle className="w-16 h-16 text-warning-500 animate-bounce" />
        <h1 className="text-2xl font-bold">No Questions Available</h1>
        <p className="text-gray-500 max-w-sm">This exam does not contain any questions yet. Please contact your instructor or administrator.</p>
        <Button variant="primary" onClick={() => router.push('/student/exams')}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden select-none">
      {/* Hidden Canvas for Proctoring Screenshots */}
      {examState.security.enableProctoring && (
        <canvas ref={canvasRef} className="hidden" />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b h-16 flex items-center justify-between px-6 shadow-sm z-10 flex-shrink-0">
          <div className="font-bold text-xl text-gray-900 truncate pr-4">{examState.settings.title || 'Online Exam'}</div>
          
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

        {/* Subject Tabs */}
        {subjects.length > 1 && (
          <div className="bg-white border-b flex overflow-x-auto">
            {subjects.map(sub => (
              <button
                key={sub}
                onClick={() => {
                  setActiveSubject(sub);
                  const firstIdx = examState.questions.findIndex(q => getSubjectName(q) === sub);
                  if (firstIdx !== -1) setCurrentQIdx(firstIdx);
                }}
                className={`px-6 py-3 font-semibold whitespace-nowrap transition-colors ${activeSubject === sub ? 'border-b-2 border-primary-600 text-primary-600 bg-primary-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        {/* Question Area */}
        <main className="flex-1 overflow-y-auto p-8 relative">
           {/* Watermark to deter photo capture */}
           <div className="absolute inset-0 pointer-events-none opacity-5 flex items-center justify-center flex-wrap gap-10 overflow-hidden z-0">
              {Array.from({length: 20}).map((_, i) => (
                <span key={i} className="text-2xl font-bold rotate-45">{submission.student}</span>
              ))}
           </div>

           <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border p-8 relative z-10">
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

              {/* Bottom Actions */}
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
                    onClick={() => {
                      const nextIdx = currentQIdx - 1;
                      setCurrentQIdx(nextIdx);
                      setActiveSubject(getSubjectName(examState.questions[nextIdx]));
                    }}
                   >
                     Previous
                   </Button>
                   <Button 
                    variant="primary" 
                    icon={ChevronRight} 
                    disabled={currentQIdx === examState.questions.length - 1}
                    onClick={() => {
                      const nextIdx = currentQIdx + 1;
                      setCurrentQIdx(nextIdx);
                      setActiveSubject(getSubjectName(examState.questions[nextIdx]));
                    }}
                    className="flex-row-reverse"
                   >
                     Save & Next
                   </Button>
                 </div>
              </div>
           </div>
        </main>
      </div>

      {/* Right Sidebar (Palette & Camera) */}
      
      <aside className="w-80 bg-white border-l h-full flex flex-col flex-shrink-0 z-20">
         {/* Camera View */}
         <div className="p-4 border-b bg-gray-50 flex flex-col items-center">
            <h3 className="font-bold text-gray-800 mb-2 self-start text-sm">Live Proctoring</h3>
            <div className="w-full bg-black rounded-lg overflow-hidden relative" style={{ aspectRatio: '4/3' }}>
               <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
               <div className="absolute bottom-2 left-2 flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-error-500 animate-pulse"></div>
                 <span className="text-white text-xs font-semibold drop-shadow-md">Recording</span>
               </div>
            </div>
         </div>

          {/* Palette Scroll Area */}
          <div className="p-4 flex-1 overflow-y-auto space-y-6">
            {subjects.map(subject => {
              const subjectQuestions = examState.questions.map((q, i) => ({ q, i })).filter(({ q }) => getSubjectName(q) === subject);
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
