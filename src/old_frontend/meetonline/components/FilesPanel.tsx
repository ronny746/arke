import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { FileUp, Download, FileText, CheckCircle, AlertCircle } from 'lucide-react';

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

export default function FilesPanel({ roomCode, socket, token }: FilesPanelProps) {
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // 1. Fetch file history
    const fetchFiles = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomCode}/files`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (res.ok) {
          setFiles(data);
        }
      } catch (err) {
        console.error('Error fetching file list:', err);
      }
    };

    fetchFiles();

    // 2. Socket listener for real-time files shared
    const handleFileShared = (newFile: SharedFile) => {
      setFiles(prev => [...prev, newFile]);
    };

    socket.on('file-shared', handleFileShared);

    return () => {
      socket.off('file-shared', handleFileShared);
    };
  }, [roomCode, socket, token]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('roomCode', roomCode);

    try {
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadStatus({ type: 'success', message: `Successfully shared ${selectedFile.name}` });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setUploadStatus({ type: 'error', message: err.message || 'Error uploading file' });
    } finally {
      setUploading(false);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white/40 backdrop-blur-md">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase">Classroom Files</h3>
      </div>

      {/* Upload trigger */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={triggerUpload}
          disabled={uploading}
          className="w-full flex items-center justify-center space-x-2 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-semibold text-sm transition shadow-md shadow-brand-500/10 disabled:opacity-50"
        >
          <FileUp className="w-4 h-4" />
          <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
        </button>

        {uploadStatus && (
          <div className={`mt-3 p-3 rounded-xl flex items-start space-x-2 text-xs border ${
            uploadStatus.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {uploadStatus.type === 'success' ? (
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            <span className="break-words">{uploadStatus.message}</span>
          </div>
        )}
      </div>

      {/* Files List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {files.length === 0 ? (
          <div className="text-center text-slate-400 py-8 text-xs italic">
            No files shared yet in this class.
          </div>
        ) : (
          files.map((file) => (
            <div key={file._id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/60 shadow-sm hover:border-brand-200 transition">
              <div className="flex items-center space-x-3 min-w-0 pr-2">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-xs text-slate-800 truncate" title={file.filename}>
                    {file.filename}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    By {file.senderName} • {new Date(file.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <a
                href={file.downloadUrl}
                download
                className="p-2 rounded-lg bg-slate-100 hover:bg-brand-50 hover:text-brand-600 text-slate-500 transition shrink-0"
                title="Download File"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
