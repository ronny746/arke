"use client";

import { useState, useEffect } from 'react';
import { BookOpen, Folder, File as FileIcon, ExternalLink, Video, Menu } from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card, Badge, IconButton } from '@/components/ui/index.jsx';
import ResourceViewerModal from '@/components/ui/ResourceViewerModal.jsx';
import { studentAPI } from '@/api/index.js';
import toast from 'react-hot-toast';
import { FileExplorer } from '@/components/ui/FileExplorer.jsx';
import { useMemo } from 'react';

export default function StudentStudyMaterialsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [selectedResource, setSelectedResource] = useState(null);
  const [selectedSection, setSelectedSection] = useState('global'); // 'classId' or 'global'
  const [currentPath, setCurrentPath] = useState('/');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [userBatches, setUserBatches] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [res, batchRes] = await Promise.all([
        studentAPI.getResources(),
        studentAPI.getMyBatches()
      ]);
      const resources = res.data?.data || [];
      console.log("RESOURCES: ", resources); setData(resources);
      const batches = batchRes.data?.data || [];
      setUserBatches(batches);
      if (batches.length > 0) {
        setSelectedSection(batches[0]._id);
      }
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
      <div className="flex items-center justify-between mb-2">
        <PageHeader
          title="Study Materials"
          subtitle="Access your class notes, past papers, and video lectures"
          breadcrumbs={['Home', 'Academics', 'Study Materials']}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)] min-h-[600px]">
        {/* Sidebar */}
        <div className={`flex-shrink-0 flex flex-col gap-2 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm overflow-y-auto transition-all duration-300 relative ${isSidebarOpen ? 'w-full lg:w-64 opacity-100' : 'w-0 opacity-0 p-0 border-0 overflow-hidden hidden lg:flex'}`}>
          <div className="flex items-center justify-between mb-2 px-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">My Classes</h3>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Menu size={16} />
            </button>
          </div>

          {userBatches.map(batch => (
            <button
              key={batch._id}
              onClick={() => { setSelectedSection(batch._id); setCurrentPath('/'); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium whitespace-nowrap ${
                selectedSection === batch._id
                  ? "bg-primary-50 text-primary-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Folder size={18} className={`shrink-0 ${selectedSection === batch._id ? "text-primary-500 fill-primary-100" : "text-gray-400 fill-gray-100"}`} />
              {batch.name} {batch.section || ''}
            </button>
          ))}
        </div>

        {/* Expand Sidebar Button (when collapsed) */}
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="hidden lg:flex items-center justify-center w-10 h-10 bg-white border border-gray-200 shadow-sm rounded-xl text-gray-500 hover:text-primary-600 transition-colors shrink-0"
            title="Expand Sidebar"
          >
            <Menu size={20} />
          </button>
        )}

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-w-0">
          <FileExplorer 
            files={data.filter(item => {
              const itemBatchId = item.batchId?._id || item.batchId;
              const itemBatchIds = item.batchIds?.map(b => b?._id || b) || [];
              const isGlobal = !itemBatchId && itemBatchIds.length === 0;

              if (selectedSection === 'global') return isGlobal;
              
              return isGlobal || 
                     String(itemBatchId) === String(selectedSection) || 
                     itemBatchIds.some(id => String(id) === String(selectedSection));
            })} 
            currentPath={currentPath}
            onNavigate={setCurrentPath}
            onView={(file) => setSelectedResource(file)}
            readOnly={true}
          />
        </div>
      </div>

      {selectedResource && (
        <ResourceViewerModal 
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
          hideDownload={true}
        />
      )}
    </div>
  );
}
