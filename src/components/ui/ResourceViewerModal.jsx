"use client";

import { useEffect } from 'react';
import { X, Video, FileText, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

// Dynamically import SecurePDFViewer without SSR to prevent canvas SSR issues
const SecurePDFViewer = dynamic(() => import('./SecurePDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-950 text-gray-400 gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-[#C99A2E] border-t-transparent animate-spin" />
      <p className="text-xs font-bold uppercase tracking-wider">Loading Protected Reader...</p>
    </div>
  )
});

export default function ResourceViewerModal({ resource, onClose, hideDownload = true }) {
  if (!resource) return null;

  const isVideo = resource.type === 'VIDEO';
  const url = resource.fileUrl;
  const isPdf = url && (url.toLowerCase().includes('.pdf') || resource.type === 'NOTES' || resource.type === 'PAST_PAPER' || resource.type === 'SYLLABUS');
  const isImage = url && url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i);

  // Keyboard shortcut protection
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && ['p', 's', 'u'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  // If it's a YouTube link, convert it to a secure embed URL
  const getEmbedUrl = (url) => {
    if (!url) return '';
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(youtubeRegex);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}?autoplay=1&modestbranding=1&rel=0`;
    }
    return url;
  };

  const isYoutube = url && (url.includes('youtube.com') || url.includes('youtu.be'));

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md" 
        style={{ zIndex: 9999 }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="bg-gray-950 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden relative border border-white/10 ring-1 ring-white/5"
        >
          {/* Header - Protected Mode Style */}
          <div className="flex items-center justify-between px-5 py-3 bg-gray-900/90 backdrop-blur-md shrink-0 border-b border-white/10 z-10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm shrink-0">
                {isVideo ? (
                  <Video className="w-5 h-5 text-blue-400" strokeWidth={2} />
                ) : (
                  <FileText className="w-5 h-5 text-[#C99A2E]" strokeWidth={2} />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-gray-100 tracking-tight line-clamp-1">
                  {resource.title}
                </h3>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <Shield size={11} /> Protected Classroom Content
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-red-500/20 hover:text-red-400 rounded-full transition-colors"
                title="Close"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Protected Content Area */}
          <div className="flex-1 bg-black/70 relative flex items-center justify-center overflow-hidden">
            {isVideo ? (
              isYoutube ? (
                <iframe
                  src={getEmbedUrl(url)}
                  className="w-full h-full absolute inset-0 bg-black"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={url}
                  controls
                  autoPlay
                  controlsList="nodownload noplaybackrate"
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full h-full object-contain absolute inset-0 bg-black outline-none"
                />
              )
            ) : isImage ? (
              <div className="w-full h-full flex items-center justify-center p-4 relative overflow-auto">
                <img 
                  src={url} 
                  alt={resource.title}
                  onContextMenu={(e) => e.preventDefault()}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl pointer-events-none select-none"
                />
              </div>
            ) : (
              <div className="w-full h-full absolute inset-0 overflow-hidden">
                <SecurePDFViewer fileUrl={url} resourceId={resource._id} title={resource.title} />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
