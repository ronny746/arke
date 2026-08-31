"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { MessageSquare, CheckCircle, Clock, Send, UploadCloud, Paperclip, X, Loader2, Video, Mic } from "lucide-react";
import { AdvancedEditor } from '@/components/ui/AdvancedEditor';

export default function TeacherDoubtsPage() {
  const [doubts, setDoubts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState("ALL");
  const [activeTab, setActiveTab] = useState<'PENDING' | 'RESOLVED'>('PENDING');
  
  // Resolve states
  const [resolvingId, setResolvingId] = useState("");
  const [solution, setSolution] = useState("");
  const [solutionAttachments, setSolutionAttachments] = useState<string[]>([]);
  
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
  
  useEffect(() => {
    fetchDoubts();
  }, []);

  const fetchDoubts = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/v1/doubts/teacher', {
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
        setSolutionAttachments(prev => [...prev, data.data.url]);
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setSolutionAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleResolve = async (id: string) => {
    const textOnly = solution.replace(/<[^>]*>?/gm, '').trim();
    if (!textOnly && solutionAttachments.length === 0) return;

    setSubmitting(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/v1/doubts/${id}/resolve`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          solution,
          solutionAttachments
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setResolvingId("");
        setSolution("");
        setSolutionAttachments([]);
        fetchDoubts();
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
            setSolutionAttachments(prev => [...prev, data.data.url]);
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

  const startResolving = (id: string) => {
    setResolvingId(id);
    setSolution("");
    setSolutionAttachments([]);
  };



  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shadow-sm">
          <MessageSquare size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Student Doubts</h1>
          <p className="text-gray-500 text-xs">Manage and resolve doubts asked by your students.</p>
        </div>
      </div>
      
      {/* Filters and Tabs */}
      {!loading && doubts.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setActiveTab('PENDING')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'PENDING' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Pending Doubts ({doubts.filter((d: any) => d.status !== 'RESOLVED' && (selectedBatch === 'ALL' || d.batchId?._id === selectedBatch)).length})
            </button>
            <button
              onClick={() => setActiveTab('RESOLVED')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'RESOLVED' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Resolved ({doubts.filter((d: any) => d.status === 'RESOLVED' && (selectedBatch === 'ALL' || d.batchId?._id === selectedBatch)).length})
            </button>
          </div>
          <select 
            className="p-2.5 text-sm font-bold bg-white text-gray-700 border border-gray-200 rounded-xl outline-none shadow-sm focus:ring-2 focus:ring-gray-200 min-w-[200px]"
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
          >
            <option value="ALL" className="text-gray-900">All Batches</option>
            {Array.from(new Set(doubts.map((d: any) => d.batchId?._id)))
              .map(id => doubts.find((d: any) => d.batchId?._id === id)?.batchId)
              .filter(Boolean)
              .map((b: any) => (
                <option key={b._id} value={b._id} className="text-gray-900">{b.name} - {b.section}</option>
              ))
            }
          </select>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-amber-500" />
            <p className="font-medium text-sm">Loading doubts...</p>
          </div>
        ) : doubts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3 text-green-500">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">All caught up!</h3>
            <p className="text-gray-500 text-sm">You don't have any pending doubts from students.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {doubts
              .filter((d: any) => selectedBatch === "ALL" || d.batchId?._id === selectedBatch)
              .filter((d: any) => activeTab === 'RESOLVED' ? d.status === 'RESOLVED' : d.status !== 'RESOLVED')
              .map((doubt: any) => (
              <div key={doubt._id} className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm hover:shadow-md hover:border-amber-200 transition-all">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xs font-black text-gray-600 shadow-sm border border-gray-300/50 shrink-0">
                      {doubt.studentId?.firstName?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{doubt.studentId?.firstName} {doubt.studentId?.lastName}</h4>
                      <p className="text-xs text-gray-500">
                        {doubt.batchId?.name} - {doubt.batchId?.section} • {new Date(doubt.createdAt).toLocaleDateString()}
                      </p>
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

                {/* Question Section */}
                <div className="bg-gray-50/80 rounded-lg p-3 mb-3 border border-gray-100">
                  <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Student's Question</h5>
                  <div className="text-gray-800 text-sm prose prose-sm max-w-none prose-p:my-0.5 prose-ul:my-0.5" dangerouslySetInnerHTML={{ __html: doubt.question }} />
                  
                  {/* Student Attachments */}
                  {doubt.attachments && doubt.attachments.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3 mt-4">
                      {doubt.attachments.map((url: string, idx: number) => {
                        const isAudio = url.match(/.(mp3|wav|ogg|m4a|webm)$/i);
                        const isVideo = url.match(/.(mp4|mkv|mov)$/i);
                        const isImage = url.match(/.(jpeg|jpg|gif|png|webp)$/i);

                        if (isAudio) {
                          return <audio key={idx} src={url} controls className="h-10 w-64 rounded-full shadow-sm border border-gray-200" />;
                        }

                        if (isVideo) {
                          return (
                            <div key={idx} className="rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-black w-48 h-28 flex items-center justify-center">
                              <video src={url} controls className="w-full h-full object-contain" />
                            </div>
                          );
                        }

                        return (
                          <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block w-20 h-20 rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity bg-white flex-shrink-0">
                            {isImage ? (
                              <img src={url} alt="Attachment" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-xs text-gray-500 font-medium">
                                <Paperclip size={20} className="mb-1" /> File
                              </div>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Solution Section */}
                {doubt.status === 'RESOLVED' ? (
                  <div className="bg-gradient-to-br from-green-50/50 to-emerald-50/30 rounded-xl p-4 border border-green-100 shadow-sm">
                    <h5 className="text-[10px] font-black text-green-700 uppercase tracking-wider mb-2">Your Solution</h5>
                    <div className="text-green-900 text-sm prose prose-sm prose-green max-w-none prose-p:my-0.5 prose-ul:my-0.5" dangerouslySetInnerHTML={{ __html: doubt.solution }} />
                    
                    {/* Solution Attachments */}
                    {doubt.solutionAttachments && doubt.solutionAttachments.length > 0 && (
                      <div className="flex flex-wrap items-center gap-3 mt-4">
                        {doubt.solutionAttachments.map((url: string, idx: number) => {
                          const isAudio = url.match(/.(mp3|wav|ogg|m4a|webm)$/i);
                          const isVideo = url.match(/.(mp4|mkv|mov)$/i);
                          const isImage = url.match(/.(jpeg|jpg|gif|png|webp)$/i);

                          if (isAudio) {
                            return <audio key={idx} src={url} controls className="h-10 w-64 rounded-full shadow-sm border border-gray-200" />;
                          }

                          if (isVideo) {
                            return (
                              <div key={idx} className="rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-black w-48 h-28 flex items-center justify-center">
                                <video src={url} controls className="w-full h-full object-contain" />
                              </div>
                            );
                          }

                          return (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block w-20 h-20 rounded-lg overflow-hidden border border-green-200 hover:opacity-90 transition-opacity bg-white flex-shrink-0">
                              {isImage ? (
                                <img src={url} alt="Attachment" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-xs text-green-700 font-medium">
                                  <Paperclip size={20} className="mb-1" /> File
                                </div>
                              )}
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {resolvingId === doubt._id ? (
                      <div className="space-y-3 bg-amber-50/30 p-4 rounded-xl border border-amber-100">
                        <h5 className="text-xs font-bold text-gray-800">Draft your solution</h5>
                        
                        <div className="bg-white rounded-lg border border-amber-200/60 overflow-hidden focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500 transition-all">
                          <AdvancedEditor 
                            value={solution} 
                            onChange={setSolution} 
                            className="min-h-[100px] bg-white border-none"
                            placeholder="Type your detailed solution here..."
                          />
                        </div>
                        
                        {/* Solution Attachments Upload */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            {isRecording ? (
                              <button 
                                type="button" 
                                onClick={stopRecording}
                                className="text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 animate-pulse"
                              >
                                <span className="w-2 h-2 rounded-full bg-red-600"></span>
                                {formatTime(recordingTime)} - Stop
                              </button>
                            ) : (
                              <button 
                                type="button" 
                                onClick={startRecording}
                                className="text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                              >
                                <Mic size={14} />
                                Record Voice
                              </button>
                            )}
                            <button 
                              type="button" 
                              onClick={() => fileInputRef.current?.click()}
                              className="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                            >
                              {isUploading && !isRecording ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
                              {isUploading && !isRecording ? 'Uploading...' : 'Attach Image/File'}
                            </button>
                            <input 
                              type="file" 
                              ref={fileInputRef} 
                              onChange={handleFileUpload} 
                              className="hidden" 
                              accept="image/*,.pdf,video/*,audio/*"
                            />
                          </div>
                          
                          {solutionAttachments.length > 0 && (
                            <div className="flex flex-wrap items-center gap-3 mt-3">
                              {solutionAttachments.map((url, idx) => {
                                const isAudio = url.match(/.(mp3|wav|ogg|m4a|webm)$/i);
                                const isVideo = url.match(/.(mp4|mkv|mov)$/i);
                                const isImage = url.match(/.(jpeg|jpg|gif|png|webp)$/i);

                                if (isAudio) {
                                  return (
                                    <div key={idx} className="relative group">
                                      <audio src={url} controls className="h-10 w-64 rounded-full shadow-sm border border-gray-200" />
                                      <button 
                                        type="button"
                                        onClick={() => removeAttachment(idx)}
                                        className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white shadow-md hover:bg-red-600 transition-colors z-10"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  );
                                }

                                if (isVideo) {
                                  return (
                                    <div key={idx} className="relative group rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-black w-40 h-24 flex items-center justify-center">
                                      <video src={url} controls className="w-full h-full object-contain" />
                                      <button 
                                        type="button"
                                        onClick={() => removeAttachment(idx)}
                                        className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white shadow-md hover:bg-red-600 transition-colors z-10"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  );
                                }

                                return (
                                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-200 w-20 h-20 bg-gray-50 flex-shrink-0">
                                    {isImage ? (
                                      <img src={url} alt="Attachment" className="w-full h-full object-cover" />
                                    ) : (
                                      <a href={url} target="_blank" rel="noopener noreferrer" className="w-full h-full flex flex-col items-center justify-center text-xs text-gray-500 hover:bg-gray-100 transition-colors">
                                        <Paperclip size={20} className="mb-1 text-gray-400" />
                                      </a>
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

                        <div className="flex gap-2 justify-end pt-2 border-t border-amber-100/50">
                          <button 
                            onClick={() => { setResolvingId(""); setSolution(""); setSolutionAttachments([]); }}
                            className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => handleResolve(doubt._id)}
                            disabled={submitting || isUploading}
                            className="px-6 py-2.5 text-sm font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50"
                          >
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            {submitting ? 'Sending...' : 'Submit Solution'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => startResolving(doubt._id)}
                        className="w-full py-4 border-2 border-dashed border-gray-200 hover:border-amber-400 hover:bg-amber-50 text-gray-500 hover:text-amber-700 font-bold rounded-2xl transition-all shadow-sm"
                      >
                        Write Solution
                      </button>
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
