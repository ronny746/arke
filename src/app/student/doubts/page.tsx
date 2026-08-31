"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { MessageSquare, CheckCircle, Clock, Send, UploadCloud, Paperclip, X, Loader2, Video, Mic, Search } from "lucide-react";
import { toast } from 'react-hot-toast';
import { AdvancedEditor } from '@/components/ui/AdvancedEditor';

export default function StudentDoubtsPage() {
  const [batches, setBatches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [activeTab, setActiveTab] = useState<'MY_DOUBTS' | 'PUBLIC_FEED'>('MY_DOUBTS');
  const [myDoubtsFilter, setMyDoubtsFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED'>('ALL');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  
  // Doubt form states
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quillRef = useRef<any>(null);

  // Voice Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [attachments, setAttachments] = useState<string[]>([]);
  
  const [doubts, setDoubts] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    let decodedId = '';
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        decodedId = payload.userId || payload.id || payload._id || '';
      } catch (e) {
        console.error("Failed to decode token", e);
      }
    }
    
    if (userStr) {
      const parsedUser = JSON.parse(userStr);
      setCurrentUser(parsedUser);
      setCurrentUserId(decodedId || parsedUser._id || parsedUser.id || '');
    } else if (decodedId) {
      setCurrentUserId(decodedId);
    }
    
    // Fetch batches
    fetch('/api/v1/batches/my-batches', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setBatches(data.data);
        if (data.data.length > 0) {
          setSelectedBatch(data.data[0]._id);
        }
      }
    });

    // Fetch teachers (Bulletproof fetch for any case variations)
    fetch('/api/v1/users?role=teacher', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.data) {
        const teacherUsers = data.data.filter((u: any) => u.role && u.role.toLowerCase() === 'teacher');
        setTeachers(teacherUsers);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      fetchDoubts();
    }
  }, [selectedBatch]);

  const fetchDoubts = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/v1/doubts/batch/${selectedBatch}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDoubts(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('/api/v1/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        setAttachments(prev => [...prev, data.data.url]);
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate empty question (quill leaves <p><br></p>)
    const textOnly = question.replace(/<[^>]*>?/gm, '').trim();
    if (!selectedBatch || !selectedTeacher || (!textOnly && attachments.length === 0)) return;

    setSubmitting(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/v1/doubts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          batchId: selectedBatch,
          teacherId: selectedTeacher,
          question,
          attachments
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setQuestion("");
        setAttachments([]);
        fetchDoubts();
        setShowForm(false);
        toast.success("Doubt submitted successfully!");
      } else {
        toast.error(data.message || 'Failed to submit doubt');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  // Recording Handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
        
        // Stop mic
        stream.getTracks().forEach(track => track.stop());
        
        setIsUploading(true);
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('file', file);
        
        try {
          const res = await fetch('/api/v1/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          });
          const data = await res.json();
          if (data.success && data.data?.url) {
            setAttachments(prev => [...prev, data.data.url]);
          }
        } catch (error) {
          console.error("Voice upload error:", error);
        } finally {
          setIsUploading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Microphone access denied", err);
      alert("Microphone access denied. Please allow microphone permissions in your browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };



  const [searchFeed, setSearchFeed] = useState("");
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 shadow-sm border border-primary-100/50">
            <MessageSquare size={20} />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-surface-900">Q&A / Doubts</h1>
            <p className="text-surface-500 text-xs">Ask your doubts and view solutions for your batch.</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-colors flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span> Ask Doubt
        </button>
      </div>

      {/* Ask a Doubt Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur-sm z-10">
              <h2 className="text-lg font-bold text-gray-900">Ask a New Doubt</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-surface-700 mb-1">Batch</label>
                    <select 
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm font-medium text-surface-800"
                      value={selectedBatch}
                      onChange={(e) => setSelectedBatch(e.target.value)}
                      required
                    >
                      <option value="" disabled className="text-gray-900">Select batch</option>
                      {batches.map((b: any) => (
                        <option key={b._id} value={b._id} className="text-gray-900">{b.name} - {b.section}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-surface-700 mb-1">Teacher</label>
                    <select 
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm font-medium text-surface-800"
                      value={selectedTeacher}
                      onChange={(e) => setSelectedTeacher(e.target.value)}
                      required
                    >
                      <option value="" disabled className="text-gray-900">Select teacher</option>
                      {teachers.map((t: any) => (
                        <option key={t._id} value={t._id} className="text-gray-900">{t.firstName} {t.lastName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-surface-700 mb-1">Your Question</label>
                  <div className="bg-white rounded-xl border border-primary-200 overflow-hidden focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500 transition-all">
                    <AdvancedEditor 
                      value={question} 
                      onChange={setQuestion} 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-surface-700 mb-1">Attachments (Images, PDF, Video)</label>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          multiple
                          accept="image/*,video/*,.pdf"
                        />
                        <button 
                          type="button" 
                          className="px-4 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary-100 transition-colors border border-primary-200/50"
                        >
                          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip size={16} />}
                          {isUploading ? 'Uploading...' : 'Attach Files'}
                        </button>
                      </div>

                      <div className="relative flex items-center bg-gray-50 rounded-lg border border-gray-200">
                        {isRecording ? (
                          <>
                            <div className="px-4 py-2 flex items-center gap-2 text-red-500 font-bold text-sm bg-red-50 rounded-l-lg animate-pulse">
                              <span className="w-2 h-2 rounded-full bg-red-500"></span>
                              {formatTime(recordingTime)}
                            </div>
                            <button
                              type="button"
                              onClick={stopRecording}
                              className="px-4 py-2 text-red-600 hover:bg-red-100 border-l border-red-100 font-bold text-sm transition-colors rounded-r-lg"
                            >
                              Stop
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={startRecording}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 font-bold text-sm flex items-center gap-2 transition-colors rounded-lg"
                          >
                            <Mic size={16} className="text-primary-500" />
                            Record Voice
                          </button>
                        )}
                      </div>
                    </div>

                    {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {attachments.map((url, idx) => {
                            const isAudio = url.match(/\.(mp3|wav|ogg|m4a|webm)$/i);
                            const isVideo = url.match(/\.(mp4|mkv|mov)$/i);
                            const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)$/i);

                            if (isAudio) {
                              return (
                                <div key={idx} className="relative group flex items-center bg-gray-50 rounded-full pr-8 border border-gray-200">
                                  <audio src={url} controls className="h-10 w-48" />
                                  <button 
                                    type="button"
                                    onClick={() => removeAttachment(idx)}
                                    className="absolute right-2 text-gray-400 hover:text-red-500 transition-colors"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              );
                            }

                            if (isVideo) {
                              return (
                                <div key={idx} className="relative group w-32 h-20 rounded-xl overflow-hidden border border-gray-200 bg-black">
                                  <video src={url} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Video className="text-white w-6 h-6 mb-1" />
                                    <button 
                                      type="button"
                                      onClick={() => removeAttachment(idx)}
                                      className="absolute top-1 right-1 text-white bg-black/50 rounded-full p-1 hover:bg-red-500 transition-colors"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div key={idx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0">
                                {isImage ? (
                                  <img src={url} alt="Attachment" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-xs text-gray-500 font-medium">
                                    <Paperclip size={16} className="mb-1" /> File
                                  </div>
                                )}
                                <button 
                                  type="button"
                                  onClick={() => removeAttachment(idx)}
                                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                                >
                                  <X size={20} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                    )}
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full mt-4 py-3 px-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                  {submitting ? 'Submitting...' : 'Post Doubt'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Public Doubts Feed */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setActiveTab('MY_DOUBTS')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'MY_DOUBTS' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              My Doubts
            </button>
            <button
              onClick={() => setActiveTab('PUBLIC_FEED')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'PUBLIC_FEED' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Public Feed
            </button>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {activeTab === 'MY_DOUBTS' && (
              <select
                className="p-2 text-xs font-bold bg-white text-surface-700 border border-surface-200 rounded-xl outline-none shadow-sm focus:ring-2 focus:ring-surface-200"
                value={myDoubtsFilter}
                onChange={(e: any) => setMyDoubtsFilter(e.target.value)}
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            )}
            <div className="relative flex-1 sm:flex-none">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search doubts..."
                value={searchFeed}
                onChange={e => setSearchFeed(e.target.value)}
                className="pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all w-48"
              />
            </div>
            <select 
              className="p-2 text-xs font-bold bg-white text-surface-700 border border-surface-200 rounded-xl outline-none shadow-sm focus:ring-2 focus:ring-surface-200"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
            >
              <option value="ALL" className="text-gray-900">All Batches</option>
              {batches.map((b: any) => (
                <option key={b._id} value={b._id} className="text-gray-900">{b.name} - {b.section}</option>
              ))}
            </select>
          </div>
        </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-surface-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary-500" />
              <p className="font-medium text-sm">Loading batch doubts...</p>
            </div>
          ) : doubts
                .filter((d: any) => {
                  if (activeTab === 'MY_DOUBTS') {
                    if (!currentUserId) return false;
                    const currentId = String(currentUserId).trim();
                    let doubtSid = '';
                    if (d.studentId) {
                      if (typeof d.studentId === 'string') doubtSid = d.studentId;
                      else if (typeof d.studentId === 'object') doubtSid = d.studentId._id || d.studentId.id || '';
                    }
                    if (!currentId || !doubtSid) return false;
                    return currentId === String(doubtSid).trim();
                  }
                  return true;
                })
                .filter((d: any) => activeTab === 'MY_DOUBTS' && myDoubtsFilter !== 'ALL' ? d.status === myDoubtsFilter : true)
                .filter((d: any) => !searchFeed || d.question?.toLowerCase().includes(searchFeed.toLowerCase()) || (d.studentId?.firstName + ' ' + d.studentId?.lastName).toLowerCase().includes(searchFeed.toLowerCase())).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white/50 backdrop-blur-sm rounded-2xl border border-dashed border-gray-300">
              <MessageSquare className="w-8 h-8 text-gray-400 mb-3" />
              <h3 className="text-base font-bold text-gray-900 mb-1">It's quiet here</h3>
              <p className="text-gray-500 text-sm">
                {activeTab === 'MY_DOUBTS' 
                  ? `You haven't asked any doubts yet. (Debug ID: ${currentUserId || 'none'} vs ${doubts.length ? doubts[0]?.studentId?._id || doubts[0]?.studentId?.id || doubts[0]?.studentId || 'no_doubt_id' : 'no_doubts'})` 
                  : 'No doubts found.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {doubts
                .filter((d: any) => {
                  if (activeTab === 'MY_DOUBTS') {
                    if (!currentUserId) return false;
                    const currentId = String(currentUserId).trim();
                    let doubtSid = '';
                    if (d.studentId) {
                      if (typeof d.studentId === 'string') doubtSid = d.studentId;
                      else if (typeof d.studentId === 'object') doubtSid = d.studentId._id || d.studentId.id || '';
                    }
                    if (!currentId || !doubtSid) return false;
                    return currentId === String(doubtSid).trim();
                  }
                  return true;
                })
                .filter((d: any) => activeTab === 'MY_DOUBTS' && myDoubtsFilter !== 'ALL' ? d.status === myDoubtsFilter : true)
                .filter((d: any) => !searchFeed || d.question?.toLowerCase().includes(searchFeed.toLowerCase()) || (d.studentId?.firstName + ' ' + d.studentId?.lastName).toLowerCase().includes(searchFeed.toLowerCase())).map((doubt: any) => (
                <div key={doubt._id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center text-xs font-black text-primary-700 shadow-sm border border-primary-200/50">
                        {doubt.studentId?.firstName?.charAt(0) || doubt.studentId?.name?.charAt(0) || 'S'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-surface-900">
                          {doubt.studentId?.firstName ? `${doubt.studentId.firstName} ${doubt.studentId.lastName || ''}` : (doubt.studentId?.name || 'Student')}
                        </p>
                        <p className="text-xs text-surface-500">{new Date(doubt.createdAt).toLocaleDateString()} at {new Date(doubt.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                    {doubt.status === 'RESOLVED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200/60">
                        <CheckCircle size={12} /> Resolved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                        <Clock size={12} /> Pending
                      </span>
                    )}
                  </div>
                  
                  {/* Question Area */}
                  <div className="mb-3">
                    <h3 className="text-[10px] font-black text-surface-400 uppercase tracking-wider mb-1.5">Question</h3>
                    <div className="text-surface-800 text-sm prose prose-sm max-w-none prose-p:my-0.5 prose-ul:my-0.5" dangerouslySetInnerHTML={{ __html: doubt.question }} />
                    
                    {doubt.attachments && doubt.attachments.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        {doubt.attachments.map((url: string, idx: number) => {
                          const isAudio = url.match(/.(mp3|wav|ogg|m4a|webm)$/i);
                          const isVideo = url.match(/.(mp4|mkv|mov)$/i);
                          const isImage = url.match(/.(jpeg|jpg|gif|png|webp)$/i);
                          if (isAudio) return <audio key={idx} src={url} controls className="h-9 w-56 rounded-full shadow-sm border border-surface-200" />;
                          if (isVideo) return <div key={idx} className="rounded-xl overflow-hidden shadow-sm border border-surface-200 bg-black w-40 h-24"><video src={url} controls className="w-full h-full object-contain" /></div>;
                          return <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block w-20 h-20 rounded-xl overflow-hidden border border-surface-200 hover:opacity-90 bg-surface-50 flex-shrink-0">{isImage ? <img src={url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-surface-500"><Paperclip size={16} /></div>}</a>;
                        })}
                      </div>
                    )}
                  </div>

                  {/* Solution Area */}
                  {doubt.status === 'RESOLVED' && (
                    <div className="bg-gradient-to-br from-green-50/50 to-emerald-50/30 rounded-xl p-3.5 border border-green-100">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded-full bg-green-200 flex items-center justify-center text-[10px] font-black text-green-800">
                          {doubt.teacherId?.firstName?.charAt(0) || 'T'}
                        </div>
                        <span className="text-[10px] font-black text-green-800 tracking-wide uppercase">Solution by {doubt.teacherId?.firstName} {doubt.teacherId?.lastName}</span>
                      </div>
                      <div className="text-green-900 text-sm prose prose-sm prose-green max-w-none prose-p:my-0.5 prose-ul:my-0.5" dangerouslySetInnerHTML={{ __html: doubt.solution }} />
                      {doubt.solutionAttachments && doubt.solutionAttachments.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          {doubt.solutionAttachments.map((url: string, idx: number) => {
                            const isAudio = url.match(/.(mp3|wav|ogg|m4a|webm)$/i);
                            const isVideo = url.match(/.(mp4|mkv|mov)$/i);
                            const isImage = url.match(/.(jpeg|jpg|gif|png|webp)$/i);
                            if (isAudio) return <audio key={idx} src={url} controls className="h-9 w-56 rounded-full shadow-sm border border-gray-200" />;
                            if (isVideo) return <div key={idx} className="rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-black w-40 h-24"><video src={url} controls className="w-full h-full object-contain" /></div>;
                            return <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block w-16 h-16 rounded-xl overflow-hidden border border-gray-200 hover:opacity-90 bg-white flex-shrink-0">{isImage ? <img src={url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-gray-500"><Paperclip size={16} /></div>}</a>;
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
