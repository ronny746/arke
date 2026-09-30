"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  Folder, 
  File as FileIcon, 
  ExternalLink, 
  Video, 
  Menu,
  GraduationCap,
  Sparkles,
  Lock,
  Unlock,
  CheckCircle2,
  Layers,
  FileText
} from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import ResourceViewerModal from '@/components/ui/ResourceViewerModal.jsx';
import { studentAPI } from '@/api/index.js';
import toast from 'react-hot-toast';
import { FileExplorer } from '@/components/ui/FileExplorer.jsx';

export default function StudentStudyMaterialsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [selectedSection, setSelectedSection] = useState<string>(''); // batchId
  const [currentPath, setCurrentPath] = useState('/');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [userBatches, setUserBatches] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [res, batchRes] = await Promise.all([
        studentAPI.getResources(),
        studentAPI.getMyBatches()
      ]);
      const resources = res.data?.data || [];
      const batches = batchRes.data?.data || [];
      setData(resources);
      setUserBatches(batches);
      if (batches.length > 0 && !selectedSection) {
        setSelectedSection(batches[0]._id || batches[0].id);
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

  const selectedBatch = useMemo(() => {
    return userBatches.find(b => (b._id || b.id) === selectedSection);
  }, [userBatches, selectedSection]);

  const filteredData = useMemo(() => {
    if (!selectedSection) return [];

    return data.filter(item => {
      const itemBatchId = item.batchId?._id?.toString() || item.batchId?.toString();
      const itemBatchIds = item.batchIds?.map((b: any) => (b?._id || b)?.toString()) || [];
      const isUnlocked = item.unlockedBatches?.some((b: any) => (b?._id || b)?.toString() === selectedSection.toString());
      const isGlobal = !itemBatchId && itemBatchIds.length === 0 && (!item.courseIds || item.courseIds.length === 0) && item.isBankMaterial !== true;

      if (isGlobal) return true;
      if (isUnlocked) return true;
      if (itemBatchId === selectedSection.toString()) return true;
      if (itemBatchIds.includes(selectedSection.toString())) return true;

      if (item.type === 'FOLDER') {
        let folderFullPath = item.folderPath || '/';
        if (!folderFullPath.startsWith('/')) folderFullPath = '/' + folderFullPath;
        if (!folderFullPath.endsWith('/')) folderFullPath += '/';
        folderFullPath += item.title + '/';

        return data.some(child => {
          const childBatchId = child.batchId?._id?.toString() || child.batchId?.toString();
          const childBatchIds = child.batchIds?.map((b: any) => (b?._id || b)?.toString()) || [];
          const childUnlocked = child.unlockedBatches?.some((b: any) => (b?._id || b)?.toString() === selectedSection.toString());
          const childGlobal = !childBatchId && childBatchIds.length === 0 && (!child.courseIds || child.courseIds.length === 0) && child.isBankMaterial !== true;

          const matches = childGlobal || childUnlocked || 
                          childBatchId === selectedSection.toString() || 
                          childBatchIds.includes(selectedSection.toString());
          if (!matches) return false;

          let childPath = child.folderPath || '/';
          if (!childPath.startsWith('/')) childPath = '/' + childPath;
          if (!childPath.endsWith('/')) childPath += '/';
          return childPath.startsWith(folderFullPath);
        });
      }

      // If it's a file inside a folder, check if any parent folder is unlocked for this batch
      let path = item.folderPath || '/';
      if (path !== '/') {
        const pathParts = path.split('/').filter(Boolean);
        let curr = '/';
        for (const part of pathParts) {
          const parentFolder = data.find(f => f.type === 'FOLDER' && f.title === part && f.folderPath === curr);
          if (parentFolder) {
            const pfUnlocked = parentFolder.unlockedBatches?.some((b: any) => (b?._id || b)?.toString() === selectedSection.toString());
            const pfBatchId = parentFolder.batchId?._id?.toString() || parentFolder.batchId?.toString();
            const pfBatchIds = parentFolder.batchIds?.map((b: any) => (b?._id || b)?.toString()) || [];

            if (pfUnlocked) return true;
            if (pfBatchId === selectedSection.toString()) return true;
            if (pfBatchIds.includes(selectedSection.toString())) return true;
          }
          curr += part + '/';
        }
      }

      return false;
    });
  }, [data, selectedSection]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in p-6">
        <PageHeader title="Study Materials" subtitle="Loading your resources..." breadcrumbs={['Home', 'Academics', 'Study Materials']} />
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B132B]"></div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Loading Classroom Materials...</p>
        </div>
      </div>
    );
  }

  const unlockedFilesCount = filteredData.filter(d => d.type !== 'FOLDER').length;
  const courseName = selectedBatch?.courseId 
    ? (typeof selectedBatch.courseId === 'object' ? selectedBatch.courseId.name : 'Course Curriculum')
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Study Materials"
        subtitle="Access class notes, past papers, assignments, and video lectures unlocked by your teachers"
        breadcrumbs={['Home', 'Academics', 'Study Materials']}
      />

      {/* Hero Active Batch Card with Vibrant Navy & Gold Styling */}
      {selectedBatch && (
        <div className="rounded-3xl bg-gradient-to-r from-[#0B132B] via-[#162044] to-[#1E293B] text-white p-6 shadow-xl border border-gray-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#C99A2E]/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-[#C99A2E] text-[#0B132B] shadow-sm">
                  Active Batch
                </span>
                {courseName && (
                  <span className="px-3 py-1 rounded-lg text-xs font-bold bg-white/10 text-gray-200 border border-white/15">
                    {courseName}
                  </span>
                )}
                {selectedBatch.type && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 text-gray-300 capitalize">
                    {selectedBatch.type} Mode
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {selectedBatch.name} {selectedBatch.section ? `• Section ${selectedBatch.section}` : ''}
              </h2>

              <p className="text-xs sm:text-sm text-gray-300 font-medium max-w-2xl">
                Materials are unlocked topic-by-topic as your faculty teaches each chapter in this batch.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-white flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">Available Notes</p>
                  <p className="text-lg font-black text-white leading-tight">{unlockedFilesCount} Unlocked</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Drive Layout */}
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-270px)] min-h-[580px]">
        
        {/* Batches Sidebar */}
        <div className={`flex-shrink-0 flex flex-col gap-2 bg-white rounded-3xl border border-gray-200/80 p-4 shadow-sm overflow-y-auto transition-all duration-300 relative ${isSidebarOpen ? 'w-full lg:w-72 opacity-100' : 'w-0 opacity-0 p-0 border-0 overflow-hidden hidden lg:flex'}`}>
          <div className="flex items-center justify-between mb-2 px-3">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">Your Batches</h3>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Menu size={16} />
            </button>
          </div>

          <div className="space-y-1.5 overflow-y-auto pr-1">
            {userBatches.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-400">No enrolled batches found.</div>
            ) : (
              userBatches.map(batch => {
                const bId = batch._id || batch.id;
                const isSelected = selectedSection === bId;

                return (
                  <button
                    key={bId}
                    onClick={() => { setSelectedSection(bId); setCurrentPath('/'); }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all text-sm ${
                      isSelected
                        ? "bg-[#0B132B] text-white font-bold shadow-md shadow-navy/20"
                        : "text-gray-700 hover:bg-gray-100 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Folder 
                        size={18} 
                        className={`shrink-0 ${isSelected ? "text-[#C99A2E] fill-[#C99A2E]/30" : "text-gray-400 fill-gray-100"}`} 
                      />
                      <span className="truncate text-left">{batch.name} {batch.section || ''}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Expand Sidebar Button (when collapsed) */}
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="hidden lg:flex items-center justify-center w-10 h-10 bg-white border border-gray-200 shadow-sm rounded-xl text-gray-500 hover:text-[#0B132B] transition-colors shrink-0"
            title="Expand Sidebar"
          >
            <Menu size={20} />
          </button>
        )}

        {/* Drive Content */}
        <div className="flex-1 bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col min-w-0">
          {filteredData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/50">
              <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-sm">
                <Lock size={28} />
              </div>
              <h3 className="text-lg font-black text-gray-900">No Materials Unlocked Yet</h3>
              <p className="text-xs text-gray-500 mt-1.5 max-w-md leading-relaxed font-medium">
                Your faculty will unlock study notes, DPPs, and video modules for <b>{selectedBatch?.name || 'this batch'}</b> as you progress through each chapter in class.
              </p>
            </div>
          ) : (
            <FileExplorer 
              files={filteredData} 
              currentPath={currentPath}
              onNavigate={setCurrentPath}
              onView={(file) => setSelectedResource(file)}
              readOnly={true}
            />
          )}
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
