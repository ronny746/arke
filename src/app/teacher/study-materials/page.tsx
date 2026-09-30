"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  Folder, 
  File as FileIcon, 
  ExternalLink, 
  Video, 
  Menu,
  Lock,
  Unlock,
  Layers,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card, Badge } from '@/components/ui/index.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { FileExplorer } from '@/components/ui/FileExplorer.jsx';
import ResourceViewerModal from '@/components/ui/ResourceViewerModal.jsx';
import { teacherAPI } from '@/api/index.js';
import toast from 'react-hot-toast';

export default function TeacherStudyMaterialsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentPath, setCurrentPath] = useState('/');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedResource, setSelectedResource] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resourcesRes, classesRes, subjectsRes] = await Promise.all([
        teacherAPI.getResources(),
        teacherAPI.getViewBatches(),
        teacherAPI.getSubjects()
      ]);
      const fetchedClasses = classesRes.data?.data || [];
      setData(resourcesRes.data?.data || []);
      setClasses(fetchedClasses);
      setSubjects(subjectsRes.data?.data || []);

      if (fetchedClasses.length > 0 && !selectedBatchId) {
        setSelectedBatchId(fetchedClasses[0]._id || fetchedClasses[0].id);
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
    return classes.find(c => (c._id || c.id) === selectedBatchId);
  }, [classes, selectedBatchId]);

  const selectedCourse = useMemo(() => {
    return selectedBatch?.courseId;
  }, [selectedBatch]);

  // Group classes by Course for clean hierarchy in sidebar
  const groupedBatches = useMemo(() => {
    const groups: { [key: string]: { courseName: string; batches: any[] } } = {};
    
    classes.forEach(cls => {
      const course = cls.courseId;
      const courseId = course?._id || course?.id || 'standalone';
      const courseName = course?.name || 'General Batches';

      if (!groups[courseId]) {
        groups[courseId] = { courseName, batches: [] };
      }
      groups[courseId].batches.push(cls);
    });

    return Object.values(groups);
  }, [classes]);

  const handleToggleUnlock = async (resource: any, unlock: boolean) => {
    if (!selectedBatchId) {
      toast.error("Please select a batch first");
      return;
    }

    try {
      await teacherAPI.toggleUnlockResource(resource._id || resource.id, {
        batchId: selectedBatchId,
        unlock
      });

      toast.success(
        unlock 
          ? `Unlocked for ${selectedBatch?.name || 'this batch'}!` 
          : `Locked for ${selectedBatch?.name || 'this batch'}!`
      );

      // Optimistically update local state
      setData(prev => prev.map(item => {
        if (item._id === (resource._id || resource.id)) {
          let updatedList = (item.unlockedBatches || []).map((b: any) => (b._id || b)?.toString());
          if (unlock) {
            if (!updatedList.includes(selectedBatchId.toString())) {
              updatedList.push(selectedBatchId.toString());
            }
          } else {
            updatedList = updatedList.filter((id: string) => id !== selectedBatchId.toString());
          }
          return { ...item, unlockedBatches: updatedList };
        }
        return item;
      }));

      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update unlock status");
    }
  };

  const handleBatchUnlockAll = async (unlock: boolean) => {
    if (!selectedBatchId) return;
    const confirmMsg = unlock
      ? `Unlock all items in "${currentPath}" for ${selectedBatch?.name}? Students in this batch will gain immediate access.`
      : `Lock all items in "${currentPath}" for ${selectedBatch?.name}? Students in this batch will no longer be able to view them.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      // Find current folder's materials
      const itemsInFolder = filteredData.filter(f => {
        let p = f.folderPath || '/';
        if (!p.startsWith('/')) p = '/' + p;
        if (!p.endsWith('/')) p = p + '/';
        return p === currentPath;
      });

      await Promise.all(
        itemsInFolder.map(item => 
          teacherAPI.toggleUnlockResource(item._id, { batchId: selectedBatchId, unlock })
        )
      );

      toast.success(unlock ? "All materials unlocked for this batch!" : "All materials locked for this batch!");
      fetchData();
    } catch (err) {
      toast.error("Failed to update all materials");
    }
  };

  // Materials available for this batch (either assigned to the batch's course or direct to the batch)
  const filteredData = useMemo(() => {
    if (!selectedBatchId) return [];

    const courseId = selectedCourse?._id?.toString() || selectedCourse?.id?.toString() || (typeof selectedBatch?.courseId === 'string' ? selectedBatch.courseId : selectedBatch?.courseId?._id?.toString());

    return data.filter(item => {
      const itemBatchId = item.batchId?._id?.toString() || item.batchId?.toString();
      const itemBatchIds = item.batchIds?.map((b: any) => (b?._id || b)?.toString()) || [];
      const itemCourseIds = item.courseIds?.map((c: any) => (c?._id || c)?.toString()) || [];

      // If directly assigned to batch
      if (itemBatchId === selectedBatchId.toString()) return true;
      if (itemBatchIds.includes(selectedBatchId.toString())) return true;

      // If assigned to the batch's course
      if (courseId && itemCourseIds.includes(courseId)) return true;

      // If it's a folder, check if it contains any matching children
      if (item.type === 'FOLDER') {
        let folderFullPath = item.folderPath || '/';
        if (!folderFullPath.startsWith('/')) folderFullPath = '/' + folderFullPath;
        if (!folderFullPath.endsWith('/')) folderFullPath += '/';
        folderFullPath += item.title + '/';

        return data.some(child => {
          const childBatchId = child.batchId?._id?.toString() || child.batchId?.toString();
          const childBatchIds = child.batchIds?.map((b: any) => (b?._id || b)?.toString()) || [];
          const childCourseIds = child.courseIds?.map((c: any) => (c?._id || c)?.toString()) || [];

          const belongs = childBatchId === selectedBatchId.toString() || 
                          childBatchIds.includes(selectedBatchId.toString()) ||
                          (courseId && childCourseIds.includes(courseId));

          if (!belongs) return false;
          let childPath = child.folderPath || '/';
          if (!childPath.startsWith('/')) childPath = '/' + childPath;
          if (!childPath.endsWith('/')) childPath += '/';
          return childPath.startsWith(folderFullPath);
        });
      }

      // If it's a file inside a folder, check if any parent folder belongs to the batch/course
      let path = item.folderPath || '/';
      if (path !== '/') {
        const pathParts = path.split('/').filter(Boolean);
        let curr = '/';
        for (const part of pathParts) {
          const parentFolder = data.find(f => f.type === 'FOLDER' && f.title === part && f.folderPath === curr);
          if (parentFolder) {
            const pfCourseIds = parentFolder.courseIds?.map((c: any) => (c?._id || c)?.toString()) || [];
            const pfBatchId = parentFolder.batchId?._id?.toString() || parentFolder.batchId?.toString();
            const pfBatchIds = parentFolder.batchIds?.map((b: any) => (b?._id || b)?.toString()) || [];

            if (courseId && pfCourseIds.includes(courseId)) return true;
            if (pfBatchId === selectedBatchId.toString()) return true;
            if (pfBatchIds.includes(selectedBatchId.toString())) return true;
          }
          curr += part + '/';
        }
      }

      return false;
    });
  }, [data, selectedBatchId, selectedBatch, selectedCourse]);

  const unlockedCount = useMemo(() => {
    return filteredData.filter(item => 
      item.type !== 'FOLDER' && item.unlockedBatches?.some((b: any) => (b?._id || b)?.toString() === selectedBatchId?.toString())
    ).length;
  }, [filteredData, selectedBatchId]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Study Materials"
        subtitle="Unlock notes, chapters, and past papers for students per batch as the syllabus progresses"
        breadcrumbs={['Home', 'Academics', 'Study Materials']}
      />

      {/* Batch Control Header & Unlocking Overview */}
      {selectedBatch && (
        <div className="rounded-3xl bg-gradient-to-r from-[#0B132B] via-[#162044] to-[#1E293B] text-white p-6 shadow-xl border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#C99A2E]/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

          <div className="relative z-10 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-[#C99A2E] text-[#0B132B] shadow-sm">
                Active Batch
              </span>
              {selectedCourse && (
                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-white/10 text-gray-200 border border-white/15">
                  Course: {selectedCourse.name}
                </span>
              )}
            </div>
            
            <h2 className="text-2xl font-black text-white tracking-tight">
              {selectedBatch.name} {selectedBatch.section ? `• Section ${selectedBatch.section}` : ''}
            </h2>

            <p className="text-xs sm:text-sm text-gray-300 font-medium max-w-2xl leading-relaxed">
              Unlock materials when you teach corresponding topics. Students in this batch only get access to unlocked materials.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold text-white flex items-center gap-2.5 shadow-sm">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>{unlockedCount} / {filteredData.filter(d => d.type !== 'FOLDER').length} Unlocked</span>
            </div>

            <button
              onClick={() => handleBatchUnlockAll(true)}
              className="px-4 py-2.5 rounded-2xl text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
            >
              <Unlock size={14} />
              <span>Unlock Folder</span>
            </button>

            <button
              onClick={() => handleBatchUnlockAll(false)}
              className="px-4 py-2.5 rounded-2xl text-xs font-black bg-white/15 hover:bg-white/25 text-white transition-all border border-white/20 flex items-center gap-1.5"
            >
              <Lock size={14} />
              <span>Lock Folder</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-270px)] min-h-[580px]">
        {/* Drive Sidebar */}
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

          <div className="space-y-4 overflow-y-auto pr-1">
            {groupedBatches.map((group, idx) => (
              <div key={idx} className="space-y-1">
                <div className="px-3 pt-1 flex items-center gap-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <GraduationCap size={13} className="text-amber-500" />
                  <span className="truncate">{group.courseName}</span>
                </div>
                
                {group.batches.map(cls => {
                  const bId = cls._id || cls.id;
                  const isSelected = selectedBatchId === bId;

                  return (
                    <button
                      key={bId}
                      onClick={() => { setSelectedBatchId(bId); setCurrentPath('/'); }}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all text-sm ${
                        isSelected
                          ? "bg-[#0B132B] text-white font-bold shadow-md shadow-navy/20"
                          : "text-gray-700 hover:bg-gray-100 font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Folder size={18} className={isSelected ? "text-[#C99A2E] fill-[#C99A2E]/30" : "text-gray-400 fill-gray-100"} />
                        <span className="truncate">{cls.name} {cls.section || ''}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
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
          <FileExplorer 
            files={filteredData} 
            currentPath={currentPath}
            onNavigate={setCurrentPath}
            onView={(file) => setSelectedResource(file)}
            onToggleUnlock={handleToggleUnlock}
            selectedBatchId={selectedBatchId}
            isTeacherView={true}
          />
        </div>
      </div>

      {selectedResource && (
        <ResourceViewerModal 
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
        />
      )}
    </div>
  );
}
