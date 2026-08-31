"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Clock, AlertTriangle, ShieldAlert, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button.jsx';
import { studentAPI } from '@/api/index.js';
import toast from 'react-hot-toast';

export default function ExamPlayer() {
  const { id } = useParams();
  const router = useRouter();
  
  const getSubjectName = (q) => q?.subject?.name || q?.subjectName || (typeof q?.subject === 'string' ? q.subject : 'General');

  const [examState, setExamState] = useState(null);
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
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshQuestion = () => {
    setIsRefreshing(true);
    // Add a slight delay so the user sees the refresh happening visually
    setTimeout(() => {
      // Incrementing the key will remount the component.
      // To ensure broken images are re-fetched, we append a timestamp to image sources in the question HTML.
      setRefreshKey(prev => prev + 1);
      setIsRefreshing(false);
    }, 500);
  };

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
    }, 'image/jpeg', 0.5);
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

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!examState || submitting) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const newViolations = { ...violations, tabSwitches: violations.tabSwitches + 1 };
        setViolations(newViolations);
        toast.error('Warning: Tab switch detected! This incident has been recorded.', { duration: 5000, icon: '🚨' });
        
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

  useEffect(() => {
    if (!loading && isFullscreen && examState?.security?.enableProctoring) {
      if (!streamRef.current) {
        startWebcam(examState.security.proctoringIntervalSeconds);
      }
    }
  }, [isFullscreen, loading, examState]);

  // Ensure stream stays attached if video element re-renders
  useEffect(() => {
    if (videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  });

  const requestFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreen(true);
    } catch (e) {
      toast.error('Could not enter full screen mode. Please try again.');
    }
  };

  const startWebcam = async (intervalSecs) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      if (intervalSecs && intervalSecs > 0) {
        snapshotIntervalRef.current = setInterval(takeAndUploadSnapshot, intervalSecs * 1000);
      }
    } catch (err) {
      toast.error('Webcam access required for this exam.');
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const setupAntiCopy = () => {
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('selectstart', e => e.preventDefault());
    document.addEventListener('copy', e => e.preventDefault());
  };

  const cleanupSecurity = () => {
    document.removeEventListener('contextmenu', e => e.preventDefault());
    document.removeEventListener('selectstart', e => e.preventDefault());
    document.removeEventListener('copy', e => e.preventDefault());
  };

  // Auto set to NOT_ANSWERED if not visited
  useEffect(() => {
    if (!examState || submitting) return;
    const qId = examState.questions[currentQIdx]?._id;
    if (!qId) return;
    
    const newAnswers = [...(submission?.answers || [])];
    const existingIdx = newAnswers.findIndex(a => a.questionId === qId);
    if (existingIdx === -1) {
      newAnswers.push({ questionId: qId, selectedOptionId: null, status: 'NOT_ANSWERED' });
      setSubmission({ ...submission, answers: newAnswers });
      studentAPI.saveAnswer(id, { questionId: qId, selectedOptionId: null, status: 'NOT_ANSWERED' }).catch(()=>{});
    }
  }, [currentQIdx, examState, submitting]);

  const handleOptionSelect = (questionId, optionId) => {
    const newAnswers = [...(submission?.answers || [])];
    const existingIdx = newAnswers.findIndex(a => a.questionId === questionId);
    
    if (existingIdx > -1) {
      newAnswers[existingIdx].selectedOptionId = optionId;
    } else {
      newAnswers.push({ questionId, selectedOptionId: optionId, status: 'NOT_ANSWERED' });
    }
    setSubmission({ ...submission, answers: newAnswers });
    studentAPI.saveAnswer(id, { questionId, selectedOptionId: optionId, status: newAnswers[existingIdx]?.status || 'NOT_ANSWERED' }).catch(()=>{});
  };

  const goToNext = () => {
    if (currentQIdx < examState.questions.length - 1) {
      const nextIdx = currentQIdx + 1;
      setCurrentQIdx(nextIdx);
      setActiveSubject(getSubjectName(examState.questions[nextIdx]));
    }
  };

  const goToPrev = () => {
    if (currentQIdx > 0) {
      const nextIdx = currentQIdx - 1;
      setCurrentQIdx(nextIdx);
      setActiveSubject(getSubjectName(examState.questions[nextIdx]));
    }
  };

  const updateStatusAndNext = async (qId, status) => {
    const newAnswers = [...(submission?.answers || [])];
    let ans = newAnswers.find(a => a.questionId === qId);
    if (!ans) {
      ans = { questionId: qId, selectedOptionId: null, status };
      newAnswers.push(ans);
    } else {
      ans.status = status;
    }
    setSubmission({ ...submission, answers: newAnswers });
    await studentAPI.saveAnswer(id, { questionId: qId, selectedOptionId: ans.selectedOptionId, status }).catch(()=>{});
    goToNext();
  };

  const handleSaveAndNext = (qId) => {
    const ans = submission?.answers?.find(a => a.questionId === qId);
    if (ans?.selectedOptionId) {
      updateStatusAndNext(qId, 'ANSWERED');
    } else {
      updateStatusAndNext(qId, 'NOT_ANSWERED');
    }
  };

  const handleSaveAndMarkReview = (qId) => {
    const ans = submission?.answers?.find(a => a.questionId === qId);
    if (ans?.selectedOptionId) {
      updateStatusAndNext(qId, 'ANSWERED_AND_MARKED_FOR_REVIEW');
    } else {
      toast.error('Please select an option first to Save & Mark for Review');
    }
  };

  const handleMarkReviewAndNext = (qId) => {
    updateStatusAndNext(qId, 'MARKED_FOR_REVIEW');
  };

  const handleClearResponse = async (questionId) => {
    const newAnswers = [...(submission?.answers || [])];
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
    const pad = (num) => String(num).padStart(2, '0');
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
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
    if (submitting) return;
    setSubmitting(true);
    if (document.fullscreenElement) document.exitFullscreen().catch(e => {});
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

  const counts = {
    notVisited: examState?.questions?.length || 0,
    notAnswered: 0,
    answered: 0,
    markedForReview: 0,
    answeredAndMarked: 0
  };
  
  submission?.answers?.forEach(ans => {
    if (ans.status === 'NOT_ANSWERED') {
       counts.notAnswered++;
       counts.notVisited--;
    } else if (ans.status === 'ANSWERED') {
       counts.answered++;
       counts.notVisited--;
    } else if (ans.status === 'MARKED_FOR_REVIEW') {
       counts.markedForReview++;
       counts.notVisited--;
    } else if (ans.status === 'ANSWERED_AND_MARKED_FOR_REVIEW') {
       counts.answeredAndMarked++;
       counts.notVisited--;
    }
  });

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
    <div className="flex h-screen bg-white overflow-hidden select-none font-sans">
      {/* Hidden Canvas for Proctoring Screenshots */}
      {examState.security.enableProctoring && (
        <canvas ref={canvasRef} className="hidden" />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-gray-300">
        {/* Top Header */}
        <header className="bg-[#1c75b8] text-white h-[60px] flex items-center px-6 z-10 flex-shrink-0">
          <div className="font-bold text-xl truncate w-full tracking-wide">
             {examState.settings.title || 'Online Assessment'}
          </div>
        </header>

        {/* Question Area */}
        <main className="flex-1 overflow-y-auto relative bg-white">
           {/* Watermark to deter photo capture */}
           <div className="absolute inset-0 pointer-events-none opacity-5 flex items-center justify-center flex-wrap gap-10 overflow-hidden z-0">
              {Array.from({length: 30}).map((_, i) => (
                <span key={i} className="text-2xl font-bold rotate-45">{submission.student || 'CANDIDATE'}</span>
              ))}
           </div>

           <div key={refreshKey} className={`p-6 relative z-10 flex flex-col h-full transition-opacity duration-300 ${isRefreshing ? 'opacity-20' : 'opacity-100'}`}>
              <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-5">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-gray-800">Q.{currentQIdx + 1}</h2>
                  <button 
                    onClick={handleRefreshQuestion}
                    disabled={isRefreshing}
                    className="flex items-center gap-1.5 text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors disabled:opacity-50"
                    title="Refresh Question (if images failed to load)"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                  </button>
                </div>
                <div className="flex gap-4 text-sm font-bold bg-gray-100 px-3 py-1 rounded">
                  <span className="text-green-700">+{currentQuestion.marks || 4} Marks</span>
                  <span className="text-red-700">-{currentQuestion.negativeMarks || 1} Marks</span>
                </div>
              </div>

              {/* Question Text */}
              <div 
                className="prose max-w-none text-gray-900 text-base mb-8 font-medium leading-relaxed" 
                dangerouslySetInnerHTML={{ 
                  __html: currentQuestion.questionText.replace(/src="([^"]+)"/g, (match, url) => `src="${url}${url.includes('?') ? '&' : '?'}retry=${refreshKey}"`) 
                }} 
              />

              {/* Options */}
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
                      <div 
                        className="text-gray-800 text-sm leading-relaxed" 
                        dangerouslySetInnerHTML={{ 
                          __html: opt.text.replace(/src="([^"]+)"/g, (match, url) => `src="${url}${url.includes('?') ? '&' : '?'}retry=${refreshKey}"`) 
                        }} 
                      />
                    </label>
                  );
                })}
              </div>
           </div>
        </main>
        
        {/* NTA Action Footer */}
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
              <button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-[3px] text-[13px] px-4 py-2 font-bold shadow-sm disabled:opacity-50 transition-colors uppercase tracking-tight" disabled={currentQIdx === examState.questions.length - 1} onClick={() => goToNext()}>
                Next &gt;&gt;
              </button>
           </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <aside className="w-[320px] bg-[#eef1f8] flex flex-col flex-shrink-0 z-20">
         
         {/* Live Proctoring & Candidate Info */}
         <div className="bg-white flex flex-col border-b border-gray-300 p-3 pb-2 shadow-sm">
           {examState.security.enableProctoring && (
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
                   {submission?.student?.firstName ? `${submission.student.firstName} ${submission.student.lastName}` : submission?.student?.name || submission?.publicUser?.name || 'Candidate'}
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

         {/* Legend */}
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

         {/* Subject Tabs */}
         <div className="bg-[#428bca] text-white flex overflow-x-auto shadow-inner h-[38px] flex-shrink-0">
            {subjects.map(sub => (
              <button
                key={sub}
                onClick={() => {
                  setActiveSubject(sub);
                  const firstIdx = examState.questions.findIndex(q => getSubjectName(q) === sub);
                  if (firstIdx !== -1) setCurrentQIdx(firstIdx);
                }}
                className={`px-3 py-0 text-[12px] font-bold whitespace-nowrap transition-colors uppercase tracking-tight flex-1 ${activeSubject === sub ? 'bg-white text-gray-800' : 'hover:bg-[#3276b1]'}`}
              >
                {sub}
              </button>
            ))}
         </div>

         {/* Question Palette */}
         <div className="bg-[#eef1f8] p-3 flex-1 overflow-y-auto">
           <div className="text-[12px] font-bold text-gray-700 mb-2 uppercase tracking-wide px-1">Choose a Question</div>
           <div className="grid grid-cols-5 gap-2 px-1">
             {examState.questions.map((q, i) => {
               if (getSubjectName(q) !== activeSubject) return null;
               
               const ans = submission?.answers?.find(a => a.questionId === q._id);
               
               // NTA Styles
               let styleClass = "bg-[#f0f0f0] border-[#cccccc] text-gray-700 shadow-[inset_0_-2px_0_rgba(0,0,0,0.05)] rounded-[3px]"; // NOT VISITED
               let innerContent = i + 1;
               
               if (ans) {
                 if (ans.status === 'NOT_ANSWERED') {
                   styleClass = "bg-[#d9534f] border-[#d43f3a] text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] rounded-t-[3px] rounded-bl-[3px] rounded-br-[12px]";
                 } else if (ans.status === 'ANSWERED') {
                   styleClass = "bg-[#5cb85c] border-[#4cae4c] text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] rounded-t-[3px] rounded-bl-[3px] rounded-br-[12px]";
                 } else if (ans.status === 'MARKED_FOR_REVIEW') {
                   styleClass = "bg-[#9b59b6] border-[#8e44ad] text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] rounded-full";
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
               
               // Highlight current question slightly if needed, but usually NTA doesn't heavily highlight the palette, just relies on the statuses. We'll add a subtle ring if active.
               const isActive = currentQIdx === i;

               return (
                 <button
                   key={q._id}
                   onClick={() => setCurrentQIdx(i)}
                   className={`w-full aspect-square flex items-center justify-center text-[13px] font-bold border transition-all ${styleClass} ${isActive ? 'ring-[3px] ring-blue-300 scale-105' : 'hover:opacity-90'}`}
                 >
                   {innerContent}
                 </button>
               );
             })}
           </div>
         </div>
         
         {/* Submit Area */}
         <div className="p-3 bg-[#e8f1f8] border-t border-gray-300 flex justify-center shadow-[0_-2px_5px_rgba(0,0,0,0.05)]">
            <button className="bg-[#5cb85c] hover:bg-[#4cae4c] border border-[#4cae4c] text-white w-full rounded-[3px] py-2.5 text-[15px] font-bold shadow-md transition-colors uppercase tracking-widest" onClick={handleManualSubmit} disabled={submitting}>
              Submit Exam
            </button>
         </div>
      </aside>
    
      {/* Submit Confirmation Modal */}
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
