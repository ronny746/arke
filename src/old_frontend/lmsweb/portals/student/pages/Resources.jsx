import { useState, useEffect, useMemo } from 'react';
import { FolderOpen, File, Video, Link, Download, ChevronRight, Folder } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import ResourceViewerModal from '../../../components/ui/ResourceViewerModal.jsx';
import { studentAPI } from '../../../api/index.js';
import { cn, formatDate } from '../../../utils/helpers.js';
import toast from 'react-hot-toast';

const typeIcons = { pdf: File, video: Video, link: Link };
const typeColors = { 
  pdf: 'bg-danger-100 dark:bg-danger-900/30 text-danger-600', 
  video: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600', 
  link: 'bg-accent-100 dark:bg-accent-900/30 text-accent-600' 
};

const getPreviewUrl = (url) => {
  if (!url) return '';
  if (url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i)) return url;
  if (url.includes('youtube.com') || url.includes('youtu.be')) return url; // Let videos open directly or handle in UI
  return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
};

export default function Resources() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  const [selectedResource, setSelectedResource] = useState(null);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await studentAPI.getResources();
      setResources(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch study materials');
    } finally {
      setLoading(false);
    }
  };

  // Compute folder explorer contents
  const explorerContent = useMemo(() => {
    const folders = new Set();
    const files = [];

    resources.forEach(res => {
      const resPath = res.folderPath || '/';
      const normalizedResPath = resPath.startsWith('/') ? resPath : '/' + resPath;
      const finalResPath = normalizedResPath.endsWith('/') ? normalizedResPath : normalizedResPath + '/';
      
      const normalizedCurrentPath = currentPath.endsWith('/') ? currentPath : currentPath + '/';

      if (finalResPath === normalizedCurrentPath) {
        files.push(res);
      } else if (finalResPath.startsWith(normalizedCurrentPath)) {
        const relativePath = finalResPath.substring(normalizedCurrentPath.length);
        const nextFolder = relativePath.split('/')[0];
        if (nextFolder) {
          folders.add(nextFolder);
        }
      }
    });

    return { folders: Array.from(folders).sort(), files };
  }, [resources, currentPath]);

  const handleNavigate = (folderName) => {
    const normalizedCurrent = currentPath.endsWith('/') ? currentPath : currentPath + '/';
    setCurrentPath(normalizedCurrent + folderName + '/');
  };

  const handleBreadcrumbClick = (index, parts) => {
    if (index === -1) {
      setCurrentPath('/');
    } else {
      const newPath = '/' + parts.slice(0, index + 1).join('/') + '/';
      setCurrentPath(newPath);
    }
  };

  const pathParts = currentPath.split('/').filter(Boolean);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Study Materials"
        subtitle="Access class notes, videos, and syllabus"
        breadcrumbs={['Home', 'Study Materials']}
      />

      <Card className="p-5 min-h-[400px]">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-6 px-2 text-sm font-medium overflow-x-auto pb-2">
          <button 
            onClick={() => handleBreadcrumbClick(-1, pathParts)}
            className={cn("hover:text-primary transition-colors flex items-center gap-1", pathParts.length === 0 ? "text-primary" : "text-surface-500")}
          >
            <FolderOpen size={16} /> Root
          </button>
          {pathParts.map((part, index) => (
            <div key={index} className="flex items-center gap-2 shrink-0">
              <ChevronRight size={14} className="text-surface-400" />
              <button 
                onClick={() => handleBreadcrumbClick(index, pathParts)}
                className={cn("hover:text-primary transition-colors", index === pathParts.length - 1 ? "text-primary" : "text-surface-500")}
              >
                {part}
              </button>
            </div>
          ))}
        </div>

        {loading ? (
          <p className="text-center py-8 text-surface-500">Loading study materials...</p>
        ) : explorerContent.folders.length === 0 && explorerContent.files.length === 0 ? (
          <div className="text-center py-16 text-surface-400">
            <FolderOpen size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-surface-600 dark:text-surface-300 font-medium mb-1">This folder is empty</p>
            <p className="text-sm">No resources have been uploaded here yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Render Folders */}
            {explorerContent.folders.map(folder => (
              <button
                key={folder}
                onClick={() => handleNavigate(folder)}
                className="flex items-center gap-3 p-4 bg-surface-50 dark:bg-surface-800/50 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 border border-transparent hover:border-surface-200 dark:hover:border-surface-600 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300 flex items-center justify-center shrink-0">
                  <Folder size={20} className="fill-current opacity-20" />
                </div>
                <span className="font-medium text-surface-800 dark:text-surface-200 truncate flex-1">{folder}</span>
              </button>
            ))}

            {/* Render Files */}
            {explorerContent.files.map(res => {
              const resType = res.type === 'VIDEO' ? 'video' : res.type === 'NOTES' || res.type === 'PAST_PAPER' ? 'pdf' : 'link';
              const Icon = typeIcons[resType] || File;
              
              return (
                <div key={res._id || res.id} className="flex flex-col p-4 bg-surface-50 dark:bg-surface-800/50 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 border border-surface-200 dark:border-surface-600/50 transition-all">
                  <div className="flex items-start gap-4 mb-3">
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', typeColors[resType] || typeColors.pdf)}>
                      <Icon size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-surface-800 dark:text-white line-clamp-1" title={res.title}>{res.title}</p>
                      <p className="text-xs text-surface-400 mt-1">{res.type.replace('_', ' ')} • {formatDate(res.createdAt)}</p>
                    </div>
                  </div>
                  {res.description && <p className="text-sm text-surface-500 mb-3 line-clamp-2">{res.description}</p>}
                  
                  <div className="mt-auto pt-3 border-t border-surface-200 dark:border-surface-600 flex justify-end gap-3">
                    {res.type === 'VIDEO' ? (
                      <button 
                        onClick={() => setSelectedResource(res)}
                        className="btn-primary btn-sm flex items-center gap-1.5 w-full justify-center"
                      >
                        <Video size={14} /> Watch Video
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={() => setSelectedResource(res)}
                          className="btn-outline btn-sm flex-1 text-center"
                        >
                          Preview
                        </button>
                        <a 
                          href={res.fileUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="btn-primary btn-sm flex items-center justify-center gap-1.5 flex-1"
                        >
                          <Download size={14} /> Download
                        </a>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      {selectedResource && (
        <ResourceViewerModal 
          resource={selectedResource} 
          onClose={() => setSelectedResource(null)} 
        />
      )}
    </div>
  );
}
