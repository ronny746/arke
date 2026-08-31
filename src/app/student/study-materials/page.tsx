"use client";

import { useState, useEffect } from 'react';
import { BookOpen, Folder, File as FileIcon, ExternalLink, Video } from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card, Badge } from '@/components/ui/index.jsx';
import { studentAPI } from '@/api/index.js';
import toast from 'react-hot-toast';

export default function StudentStudyMaterialsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [groupedData, setGroupedData] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await studentAPI.getResources();
      const resources = res.data?.data || [];
      setData(resources);

      // Group by folderPath
      const grouped = resources.reduce((acc, curr) => {
        const path = curr.folderPath || '/';
        if (!acc[path]) acc[path] = [];
        acc[path].push(curr);
        return acc;
      }, {});
      setGroupedData(grouped);
    } catch (error) {
      toast.error('Failed to load study materials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Study Materials" subtitle="Loading your resources..." breadcrumbs={['Home', 'Academics', 'Study Materials']} />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Study Materials"
        subtitle="Access your class notes, past papers, and video lectures"
        breadcrumbs={['Home', 'Academics', 'Study Materials']}
      />

      {Object.keys(groupedData).length === 0 ? (
        <Card className="p-12 text-center text-surface-500 border border-dashed bg-surface-50 dark:bg-surface-800">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <h3 className="text-lg font-semibold text-surface-700 dark:text-surface-200">No Study Materials</h3>
          <p className="mt-1 text-sm">Your teachers haven't uploaded any materials for your class yet.</p>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedData).map(([folderPath, items]) => (
            <div key={folderPath} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-surface-200 pb-2">
                <Folder className="text-primary-500" size={20} />
                <h3 className="text-lg font-bold text-surface-800 dark:text-white">
                  {folderPath === '/' ? 'General' : folderPath}
                </h3>
                <span className="text-xs font-medium bg-surface-100 text-surface-500 px-2 py-0.5 rounded-full ml-2">
                  {items.length} items
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => (
                  <Card key={item._id} className="p-4 flex flex-col justify-between hover:border-primary-300 transition-colors cursor-pointer group" onClick={() => window.open(item.fileUrl, '_blank')}>
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 group-hover:bg-primary-100 transition-colors">
                        {item.type === 'VIDEO' ? <Video size={24} /> : <FileIcon size={24} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-surface-800 dark:text-white truncate" title={item.title}>
                          {item.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <Badge variant={item.type === 'VIDEO' ? 'danger' : 'primary'} className="text-[10px]">
                            {item.type}
                          </Badge>
                          {item.subjectId && (
                            <span className="text-xs text-surface-500 truncate" title={item.subjectId.name}>
                              • {item.subjectId.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {item.description && (
                      <p className="mt-3 text-xs text-surface-600 dark:text-surface-400 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <div className="mt-4 pt-3 border-t border-surface-100 flex items-center justify-between text-xs font-medium text-primary-600">
                      <span>{item.type === 'VIDEO' ? 'Watch Video' : 'Open Document'}</span>
                      <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
