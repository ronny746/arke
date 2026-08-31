import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Download, FileText, CheckCircle, AlertCircle, Paperclip, File, Image, Film } from 'lucide-react';

interface SharedFile {
  _id: string;
  filename: string;
  downloadUrl: string;
  senderName: string;
  createdAt: string;
}

interface FilesPanelProps {
  roomCode: string;
  socket: Socket;
  token: string;
}

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext || '')) return <Image className="w-4 h-4" />;
  if (['mp4','mov','avi','mkv'].includes(ext || '')) return <Film className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
};

const getFileColor = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext || '')) return 'from-pink-500 to-rose-600';
  if (['mp4','mov','avi','mkv'].includes(ext || '')) return 'from-blue-500 to-indigo-600';
  if (['pdf'].includes(ext || '')) return 'from-red-500 to-red-700';
  if (['doc','docx'].includes(ext || '')) return 'from-sky-500 to-blue-600';
  if (['xls','xlsx'].includes(ext || '')) return 'from-green-500 to-emerald-600';
  if (['ppt','pptx'].includes(ext || '')) return 'from-orange-500 to-amber-600';
  return 'from-violet-500 to-purple-600';
};

export default function FilesPanel({ roomCode, socket, token }: FilesPanelProps) {
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomCode}/files`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) setFiles(data);
      } catch (err) {
        console.error('Error fetching file list:', err);
      }
    };
    fetchFiles();

    const handleFileShared = (newFile: SharedFile) => {
      setFiles(prev => [...prev, newFile]);
    };
    socket.on('file-shared', handleFileShared);
    return () => { socket.off('file-shared', handleFileShared); };
  }, [roomCode, socket, token]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadStatus(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('roomCode', roomCode);
    try {
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setUploadStatus({ type: 'success', message: `✓ ${file.name} shared!` });
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setUploadStatus(null), 3000);
    } catch (err: any) {
      setUploadStatus({ type: 'error', message: err.message || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  return (
    <div className="flex flex-col h-full text-inherit" style={{ background: 'transparent' }}>
      {/* Drop Zone / Upload */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--cr-border)' }}>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all duration-200 ${
            dragOver
              ? 'border-violet-500 bg-violet-500/10'
              : 'hover:border-violet-400/50'
          } ${uploading ? 'opacity-50 cursor-wait' : ''}`}
          style={{
            borderColor: dragOver ? undefined : 'var(--cr-border)',
            background: 'var(--cr-subtle)'
          }}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs" style={{ color: 'var(--cr-muted)' }}>Uploading file...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                <Paperclip className="w-5 h-5 text-violet-500" />
              </div>
              <p className="text-xs" style={{ color: 'var(--cr-muted)' }}>
                <span className="text-violet-600 dark:text-violet-400 font-bold">Click to upload</span> or drag & drop
              </p>
            </div>
          )}
        </div>

        {uploadStatus && (
          <div className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${
            uploadStatus.type === 'success'
              ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400'
              : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
          }`}>
            {uploadStatus.type === 'success'
              ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
              : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
            <span className="break-words font-medium">{uploadStatus.message}</span>
          </div>
        )}
      </div>

      {/* Files List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-8 text-center" style={{ color: 'var(--cr-muted)' }}>
            <File className="w-8 h-8 opacity-40" />
            <p className="text-xs">No files shared yet in this class</p>
          </div>
        ) : (
          files.map((file) => (
            <div key={file._id}
              className="flex items-center gap-3 p-3 rounded-2xl border transition-all group shadow-sm hover:border-violet-500/40"
              style={{ background: 'var(--cr-subtle)', borderColor: 'var(--cr-border)' }}>
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getFileColor(file.filename)} flex items-center justify-center text-white flex-shrink-0 shadow-sm`}>
                {getFileIcon(file.filename)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold truncate">{file.filename}</h4>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--cr-muted)' }}>
                  {file.senderName} · {new Date(file.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <a href={file.downloadUrl} download
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-violet-600/10 hover:bg-violet-600 hover:text-white text-violet-600 dark:text-violet-300 transition flex-shrink-0"
                title="Download">
                <Download className="w-3.5 h-3.5" />
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
