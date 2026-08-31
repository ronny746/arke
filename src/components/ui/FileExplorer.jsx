import React, { useState, useMemo } from 'react';
import { Folder, FileText, Video, ChevronRight, File as FileIcon, Trash, Download, MoveRight, Eye, EyeOff, Edit2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/Button.jsx';
import { cn } from '@/utils/helpers.js';
import { useDeveloperStore } from '@/store';

export function FileExplorer({ files, onDelete, onEdit, onView, onMove, onToggleActive, currentPath, onNavigate, onCreateFolder, readOnly = false }) {
  const { isDeveloperMode } = useDeveloperStore();

  // Parse files into folder structure based on currentPath
  const { folders, currentFiles } = useMemo(() => {
    const currentFiles = [];
    const currentFolders = [];

    files.forEach(file => {
      let path = file.folderPath || '/';
      if (!path.startsWith('/')) path = '/' + path;
      if (!path.endsWith('/')) path = path + '/';

      if (path === currentPath) {
        if (file.type === 'FOLDER') {
          currentFolders.push(file);
        } else {
          currentFiles.push(file);
        }
      }
    });

    return {
      folders: currentFolders.sort((a, b) => a.title.localeCompare(b.title)),
      currentFiles: currentFiles.sort((a, b) => a.title.localeCompare(b.title))
    };
  }, [files, currentPath]);

  const breadcrumbs = currentPath.split('/').filter(Boolean);

  const handleNavigate = (index) => {
    if (index === -1) {
      onNavigate('/');
    } else {
      const newPath = '/' + breadcrumbs.slice(0, index + 1).join('/') + '/';
      onNavigate(newPath);
    }
  };

  const getFileIcon = (type) => {
    switch(type) {
      case 'VIDEO': return <Video className="w-14 h-14 text-red-500 fill-red-100" strokeWidth={1.5} />;
      case 'NOTES': return <FileText className="w-14 h-14 text-blue-500 fill-blue-100" strokeWidth={1.5} />;
      default: return <FileIcon className="w-14 h-14 text-gray-500 fill-gray-100" strokeWidth={1.5} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-surface-900 rounded-t-xl overflow-x-auto">
        <button 
          onClick={() => handleNavigate(-1)}
          className="text-gray-600 dark:text-gray-300 hover:text-primary-600 font-medium"
        >
          Root
        </button>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <button 
              onClick={() => handleNavigate(idx)}
              className={cn(
                "hover:text-primary-600 font-medium whitespace-nowrap",
                idx === breadcrumbs.length - 1 ? "text-primary-600" : "text-gray-600 dark:text-gray-300"
              )}
            >
              {crumb}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Content Grid */}
      <div className="p-4 flex-1 overflow-y-auto">
        {folders.length === 0 && currentFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Folder className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-lg font-medium">This folder is empty</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {folders.map(folder => (
              <div 
                key={folder._id}
                className="group relative flex flex-col bg-white dark:bg-surface-800 rounded-2xl border border-gray-100 hover:border-yellow-200 hover:shadow-lg hover:-translate-y-1 transition-all overflow-hidden cursor-pointer"
                onClick={() => onNavigate(currentPath + folder.title + '/')}
              >
                  {!readOnly && (
                    <div className="absolute top-0 left-0 right-0 p-2.5 bg-gradient-to-b from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-wrap justify-end gap-1.5 z-20">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onEdit && onEdit(folder); }}
                        className="flex items-center gap-1 px-2 py-1 bg-white/95 hover:bg-blue-50 text-gray-700 hover:text-blue-600 rounded-md shadow-sm text-[11px] font-bold transition-colors backdrop-blur-sm"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onMove && onMove(folder); }}
                        className="flex items-center gap-1 px-2 py-1 bg-white/95 hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 rounded-md shadow-sm text-[11px] font-bold transition-colors backdrop-blur-sm"
                      >
                        <MoveRight className="w-3 h-3" /> Move
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onToggleActive && onToggleActive(folder); }}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 bg-white/95 rounded-md shadow-sm text-[11px] font-bold transition-colors backdrop-blur-sm",
                          folder.isActive !== false 
                            ? "hover:bg-yellow-50 text-gray-700 hover:text-yellow-600" 
                            : "hover:bg-green-50 text-gray-700 hover:text-green-600"
                        )}
                      >
                        {folder.isActive !== false ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {folder.isActive !== false ? "Unpublish" : "Publish"}
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDelete && onDelete(folder._id); }}
                        className="flex items-center gap-1 px-2 py-1 bg-white/95 hover:bg-red-50 text-gray-700 hover:text-red-600 rounded-md shadow-sm text-[11px] font-bold transition-colors backdrop-blur-sm"
                      >
                        <Trash className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  )}

                <div className="h-32 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-surface-700 dark:to-surface-800 flex items-center justify-center relative overflow-hidden group-hover:from-blue-100/80 group-hover:to-indigo-100/80 transition-colors">
                  <div className="p-3.5 bg-white/70 dark:bg-black/20 rounded-2xl backdrop-blur-md shadow-sm group-hover:scale-110 transition-transform duration-300 group-hover:shadow-md">
                    <Folder className="w-10 h-10 text-indigo-500 fill-indigo-100/50" strokeWidth={1.5} />
                  </div>
                </div>
                
                <div className="p-3.5 bg-white dark:bg-surface-800 flex flex-col items-center justify-center">
                  <span className="text-[15px] font-medium text-gray-800 dark:text-gray-100 line-clamp-1 w-full text-center" title={folder.title}>{folder.title}</span>
                  {!readOnly && !folder.batchId && (!folder.batchIds || folder.batchIds.length === 0) && (
                    <span className="text-[10px] text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full font-semibold mt-1">All Classes</span>
                  )}
                </div>
              </div>
            ))}

            {currentFiles.map(file => (
              <div 
                key={file._id}
                className="group relative flex flex-col bg-white dark:bg-surface-800 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer"
                onClick={() => onView(file)}
              >
                {/* Actions overlay */}
                {!readOnly && (
                  <div className="absolute top-0 left-0 right-0 p-2.5 bg-gradient-to-b from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-wrap justify-end gap-1.5 z-20">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEdit && onEdit(file); }}
                      className="flex items-center gap-1 px-2 py-1 bg-white/95 hover:bg-blue-50 text-gray-700 hover:text-blue-600 rounded-md shadow-sm text-[11px] font-bold transition-colors backdrop-blur-sm"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onMove && onMove(file); }}
                      className="flex items-center gap-1 px-2 py-1 bg-white/95 hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 rounded-md shadow-sm text-[11px] font-bold transition-colors backdrop-blur-sm"
                    >
                      <MoveRight className="w-3 h-3" /> Move
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onToggleActive && onToggleActive(file); }}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 bg-white/95 rounded-md shadow-sm text-[11px] font-bold transition-colors backdrop-blur-sm",
                        file.isActive !== false 
                          ? "hover:bg-yellow-50 text-gray-700 hover:text-yellow-600" 
                          : "hover:bg-green-50 text-gray-700 hover:text-green-600"
                      )}
                    >
                      {file.isActive !== false ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {file.isActive !== false ? "Unpublish" : "Publish"}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete && onDelete(file._id); }}
                      className="flex items-center gap-1 px-2 py-1 bg-white/95 hover:bg-red-50 text-gray-700 hover:text-red-600 rounded-md shadow-sm text-[11px] font-bold transition-colors backdrop-blur-sm"
                    >
                      <Trash className="w-3 h-3" /> Delete
                    </button>
                  </div>
                )}

                {/* Top Half: White Preview Area */}
                <div className="h-32 bg-white flex items-center justify-center p-4 relative overflow-hidden">
                   {/* Fake text lines for document preview effect */}
                   <div className="absolute inset-0 p-5 opacity-[0.03] flex flex-col gap-3">
                     <div className="h-2 w-3/4 bg-black rounded"></div>
                     <div className="h-2 w-full bg-black rounded"></div>
                     <div className="h-2 w-5/6 bg-black rounded"></div>
                     <div className="h-2 w-full bg-black rounded mt-2"></div>
                     <div className="h-2 w-4/5 bg-black rounded"></div>
                   </div>
                   {/* Centered Large Icon */}
                   <div className="transform group-hover:scale-110 transition-transform duration-300 z-10 opacity-80 group-hover:opacity-100">
                     {getFileIcon(file.type)}
                   </div>
                </div>
                
                {/* Bottom Half: Colored Footer (WhatsApp style) */}
                 <div className={cn("p-3 flex flex-col gap-1 relative z-20", file.isActive === false ? "bg-gray-600" : "bg-primary-700")}>
                   <div className="flex items-center gap-3">
                      {/* Mini Icon next to title */}
                      <div className="bg-white p-1.5 rounded shrink-0 shadow-sm flex items-center justify-center">
                         {file.type === 'VIDEO' ? <Video className="w-5 h-5 text-red-500 fill-red-100" /> : <FileText className="w-5 h-5 text-red-500 fill-red-100" />}
                      </div>
                      <span className="text-[15px] font-medium text-white line-clamp-1 w-full" title={file.title}>
                        {file.title} {file.isActive === false && "(Unpublished)"}
                      </span>
                   </div>
                   <div className="flex items-center justify-between mt-1.5 pl-11">
                     <span className="text-[11px] text-primary-100/80 line-clamp-1 font-medium">
                       {file.type} • {(file.batchId?.name || file.subjectId?.name) ? (file.batchId?.name || 'Global') : 'Global Material'}
                     </span>
                   </div>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
