import React, { useState, useMemo } from 'react';
import { Folder, FileText, Video, ChevronRight, File as FileIcon, Trash, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button.jsx';
import { cn } from '@/utils/helpers.js';

export function FileExplorer({ files, onDelete, onView, currentPath, onNavigate, onCreateFolder }) {

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
      case 'VIDEO': return <Video className="w-10 h-10 text-red-500" />;
      case 'NOTES': return <FileText className="w-10 h-10 text-blue-500" />;
      default: return <FileIcon className="w-10 h-10 text-gray-500" />;
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {folders.map(folder => (
              <div 
                key={folder._id}
                className="group relative flex flex-col items-center p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-surface-700 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-all text-center"
              >
                {/* Actions overlay */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/90 dark:bg-surface-800/90 rounded-lg shadow-sm p-1 backdrop-blur-sm z-10">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(folder._id); }}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md"
                    title="Delete"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>

                <div 
                  onClick={() => onNavigate(currentPath + folder.title + '/')}
                  className="cursor-pointer flex flex-col items-center w-full"
                >
                  <Folder className="w-12 h-12 text-yellow-400 mb-3 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 line-clamp-2 w-full">{folder.title}</span>
                </div>
              </div>
            ))}

            {currentFiles.map(file => (
              <div 
                key={file._id}
                className="group relative flex flex-col items-center p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-surface-700 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-all text-center"
              >
                {/* Actions overlay */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/90 dark:bg-surface-800/90 rounded-lg shadow-sm p-1 backdrop-blur-sm z-10">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onView(file); }}
                    className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-md"
                    title="Open"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(file._id); }}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md"
                    title="Delete"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>

                <div 
                  onClick={() => onView(file)}
                  className="cursor-pointer flex flex-col items-center w-full"
                >
                  <div className="mb-3 group-hover:scale-110 transition-transform">
                    {getFileIcon(file.type)}
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 line-clamp-2 w-full">{file.title}</span>
                  {(file.classId?.name || file.subjectId?.name) && (
                    <span className="text-xs text-gray-500 mt-1 line-clamp-1 w-full">
                      {file.classId?.name} {file.subjectId?.name ? `- ${file.subjectId?.name}` : ''}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
