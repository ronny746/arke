import { X, ExternalLink } from 'lucide-react';

export default function ResourceViewerModal({ resource, onClose }) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-fade-in" style={{ zIndex: 9999 }}>
      <div className="bg-white dark:bg-surface-900 rounded-xl w-full max-w-6xl h-[80vh] flex flex-col shadow-2xl border border-surface-200 dark:border-surface-700 overflow-hidden relative">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700 shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-surface-900 dark:text-white line-clamp-1">
              {resource.title}
            </h3>
            <a 
              href={url} 
              target="_blank" 
              rel="noreferrer" 
              className="p-2 text-surface-500 hover:text-primary-500 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors"
              title="Open in new tab"
            >
              <ExternalLink size={18} />
            </a>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-surface-500 hover:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 bg-surface-50 dark:bg-black/50 relative">
          {isVideo ? (
            isYoutube ? (
              <iframe
                src={getEmbedUrl(url)}
                className="w-full h-full absolute inset-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                src={url}
                controls
                autoPlay
                className="w-full h-full object-contain absolute inset-0"
              />
            )
          ) : (
            <iframe
              src={getDocPreviewUrl(url)}
              className="w-full h-full absolute inset-0 bg-white"
              title={resource.title}
            />
          )}
        </div>
      </div>
    </div>
  );
}
