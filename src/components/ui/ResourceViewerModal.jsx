import { X, ExternalLink, Video, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ResourceViewerModal({ resource, onClose, hideDownload = false }) {
  if (!resource) return null;

  const isVideo = resource.type === 'VIDEO';
  const url = resource.fileUrl;
  
  // If it's a YouTube link, convert it to an embed URL
  const getEmbedUrl = (url) => {
    if (!url) return '';
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(youtubeRegex);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
    }
    return url;
  };

  const isYoutube = url && (url.includes('youtube.com') || url.includes('youtu.be'));
  
  // Helper to generate doc preview URL
  const getDocPreviewUrl = (docUrl) => {
    if (!docUrl) return '';
    if (docUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i)) return docUrl;
    return `https://docs.google.com/gview?url=${encodeURIComponent(docUrl)}&embedded=true`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md" style={{ zIndex: 9999 }}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-gray-950 rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl overflow-hidden relative border border-white/10 ring-1 ring-white/5"
        >
          {/* Header - Theater Mode Style */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-gray-900/80 backdrop-blur-md shrink-0 border-b border-white/10 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                {isVideo ? (
                  <Video className="w-5 h-5 text-blue-400" strokeWidth={2} />
                ) : (
                  <FileText className="w-5 h-5 text-indigo-400" strokeWidth={2} />
                )}
              </div>
              <h3 className="text-[17px] font-medium text-gray-100 tracking-wide line-clamp-1">
                {resource.title}
              </h3>
            </div>
            
            <div className="flex items-center gap-2">
              {!hideDownload && (
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink size={18} />
                </a>
              )}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-red-500/20 hover:text-red-400 rounded-full transition-colors"
                title="Close"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-black/60 relative flex items-center justify-center overflow-hidden">
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
                  controlsList="nodownload"
                  className="w-full h-full object-contain absolute inset-0 bg-black outline-none"
                />
              )
            ) : (
              <div className="w-full h-full absolute inset-0 bg-white dark:bg-gray-100 overflow-hidden">
                <iframe
                  src={getDocPreviewUrl(url)}
                  className="w-full h-full border-none shadow-inner"
                  title={resource.title}
                />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
