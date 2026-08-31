import React, { useState, useRef } from 'react';
import { UploadCloud, X, FileText, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axiosInstance.js';

export function FileUpload({ 
  onUploadComplete, 
  onChange,
  value = '', 
  accept = "*", 
  maxSizeMB = 10,
  label = "Upload File" 
}) {
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [localFile, setLocalFile] = useState(null);
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    // If onChange is provided, we don't auto-upload
    if (onChange) {
      setLocalFile(file);
      onChange(file);
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Direct call to axiosInstance for upload
      const res = await axiosInstance.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      if (res.data?.success) {
        if (onUploadComplete) onUploadComplete(res.data.data.url);
        toast.success('File uploaded successfully');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload Error:', error);
      toast.error(error.response?.data?.error || 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  const onDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    if (onUploadComplete) onUploadComplete('');
    if (onChange) {
      onChange(null);
      setLocalFile(null);
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const displayValue = value || (localFile ? localFile.name : '');

  if (displayValue) {
    return (
      <div className="flex items-center justify-between p-3 border border-success-200 bg-success-50 dark:border-success-900/30 dark:bg-success-900/10 rounded-xl">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-2 bg-success-100 dark:bg-success-900/30 text-success rounded-lg shrink-0">
            <CheckCircle size={20} />
          </div>
          <div className="truncate">
            <p className="text-sm font-medium text-surface-900 dark:text-white truncate">{localFile ? 'File Selected' : 'File Uploaded'}</p>
            {value ? (
              <a href={value} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline truncate inline-block max-w-xs">
                {value.split('/').pop() || 'View File'}
              </a>
            ) : (
              <span className="text-xs text-surface-500 truncate inline-block max-w-xs">{localFile?.name}</span>
            )}
          </div>
        </div>
        <button 
          type="button"
          onClick={removeFile}
          className="p-1.5 text-surface-400 hover:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer
        ${dragActive ? 'border-primary bg-primary/5' : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'}
        ${loading ? 'opacity-70 pointer-events-none' : ''}
      `}
      onDragEnter={onDrag}
      onDragLeave={onDrag}
      onDragOver={onDrag}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={handleChange}
        disabled={loading}
      />
      
      <div className="flex flex-col items-center gap-2">
        {loading ? (
          <>
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-medium text-surface-900 dark:text-white mt-2">Uploading... {uploadProgress}%</p>
            <div className="w-full max-w-[200px] h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
          </>
        ) : (
          <>
            <div className="p-3 bg-surface-100 dark:bg-surface-800 rounded-full text-surface-400 mb-2">
              <UploadCloud size={24} />
            </div>
            <p className="text-sm font-medium text-surface-900 dark:text-white">
              <span className="text-primary hover:underline">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-surface-500">
              {label} (Max {maxSizeMB}MB)
            </p>
          </>
        )}
      </div>
    </div>
  );
}
