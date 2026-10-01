"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  Plus, 
  Trash, 
  Folder, 
  File as FileIcon, 
  ExternalLink, 
  Video, 
  MoveRight, 
  Menu,
  Layers,
  Archive,
  Globe,
  CheckCircle2,
  Search,
  Sparkles,
  Info,
  GraduationCap
} from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card, Badge } from '@/components/ui/index.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/modals/index.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Input, Select, FormField } from '@/components/forms/index.jsx';
import { FileUpload } from '@/components/forms/FileUpload.jsx';
import { FileExplorer } from '@/components/ui/FileExplorer.jsx';
import ResourceViewerModal from '@/components/ui/ResourceViewerModal.jsx';
import { DeleteModal } from '@/components/modals/index.jsx';
import { adminAPI } from '@/api/index.js';
import toast from 'react-hot-toast';

export default function AdminStudyMaterialsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  
  // Navigation section: 'bank' (Material Bank), 'global' (Global Materials), 'course:<courseId>', 'batch:<batchId>'
  const [selectedNav, setSelectedNav] = useState('bank');

  const [showMoveModal, setShowMoveModal] = useState(false);
  const [materialToMove, setMaterialToMove] = useState<any>(null);
  
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [materialToRename, setMaterialToRename] = useState<any>(null);
  const [newTitle, setNewTitle] = useState('');
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  
  // Assign to Courses Modal
  const [showAssignCoursesModal, setShowAssignCoursesModal] = useState(false);
  const [materialToAssign, setMaterialToAssign] = useState<any>(null);
  const [assignCourseIds, setAssignCourseIds] = useState<string[]>([]);
  const [courseSearch, setCourseSearch] = useState('');

  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const [newBatchId, setNewBatchId] = useState('');
  const [newBatchIds, setNewBatchIds] = useState<string[]>([]);
  const [newFolderPath, setNewFolderPath] = useState('/');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Form State for upload
  const [formData, setFormData] = useState({
    title: '',
    batchId: '',
    subjectId: '',
    type: 'NOTES',
    folderPath: '/',
    description: '',
    fileUrl: '',
    courseIds: [] as string[],
    isBankMaterial: true
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resourcesRes, batchesRes, coursesRes, subjectsRes] = await Promise.all([
        adminAPI.getResources(),
        adminAPI.getBatches(),
        adminAPI.getCourses(),
        adminAPI.getSubjects()
      ]);
      setData(resourcesRes.data?.data || []);
      setClasses(batchesRes.data?.data || []);
      setCourses(coursesRes.data?.data || []);
      setSubjects(subjectsRes.data?.data || []);
    } catch (error) {
      toast.error('Failed to load study materials data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = (id: string) => {
    const resource = data.find(d => d._id === id) || { title: 'this material' };
    setItemToDelete({
      name: resource.title,
      onConfirm: async () => {
        try {
          await adminAPI.deleteResource(id);
          toast.success("Material moved to Recycle Bin!");
          fetchData();
        } catch (err) {
          toast.error("Failed to move to Recycle Bin");
        }
      }
    });
  };

  const handleEditClick = (item: any) => {
    setMaterialToRename(item);
    setNewTitle(item.title || '');
    setNewBatchId(item.batchId?._id || item.batchId || 'all');
    setNewBatchIds(item.batchIds?.map((b: any) => b?._id || b) || []);
    setSelectedCourseIds(item.courseIds?.map((c: any) => c?._id || c) || []);
    setShowRenameModal(true);
  };

  const handleOpenAssignModal = (item: any) => {
    setMaterialToAssign(item);
    const existing = (item.courseIds || []).map((c: any) => c?._id || c?.toString() || c);
    setAssignCourseIds(existing);
    setCourseSearch('');
    setShowAssignCoursesModal(true);
  };

  const handleAssignCoursesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialToAssign) return;

    try {
      setUploading(true);
      await adminAPI.assignCoursesToResource(materialToAssign._id || materialToAssign.id, assignCourseIds);
      toast.success("Courses assigned to material successfully!");
      setShowAssignCoursesModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to assign courses");
    } finally {
      setUploading(false);
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      setUploading(true);
      await adminAPI.updateResource(materialToRename._id || materialToRename.id, { 
        title: newTitle.trim(),
        batchId: newBatchIds.length === 0 ? null : newBatchId === 'all' ? null : newBatchId,
        batchIds: newBatchIds,
        courseIds: selectedCourseIds
      });
      toast.success("Updated successfully!");
      setShowRenameModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update material");
    } finally {
      setUploading(false);
    }
  };

  const handleToggleActive = async (resource: any) => {
    try {
      const newStatus = resource.isActive !== false ? false : true;
      await adminAPI.updateResource(resource._id || resource.id, { isActive: newStatus });
      toast.success(newStatus ? 'Material published successfully' : 'Material unpublished successfully');
      fetchData();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleCreateFolder = async () => {
    const folderName = window.prompt("Enter folder name:");
    if (!folderName) return;
    
    try {
      let initialCourseIds: string[] = [];
      if (selectedNav.startsWith('course:')) {
        initialCourseIds = [selectedNav.replace('course:', '')];
      }

      await adminAPI.createResource({
        title: folderName,
        type: 'FOLDER',
        folderPath: currentPath,
        isBankMaterial: true,
        courseIds: initialCourseIds,
        batchId: selectedNav.startsWith('batch:') ? selectedNav.replace('batch:', '') : null,
        fileUrl: null
      });
      toast.success("Folder created successfully");
      fetchData();
    } catch (err) {
      toast.error("Failed to create folder");
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fileUrl && formData.type !== 'FOLDER') {
      return toast.error("Please upload a file or provide a URL first.");
    }
    
    try {
      setUploading(true);
      let targetCourseIds = [...formData.courseIds];
      if (selectedNav.startsWith('course:') && !targetCourseIds.includes(selectedNav.replace('course:', ''))) {
        targetCourseIds.push(selectedNav.replace('course:', ''));
      }

      const submitData: any = { 
        ...formData, 
        folderPath: currentPath,
        courseIds: targetCourseIds,
        isBankMaterial: true,
        batchId: selectedNav.startsWith('batch:') ? selectedNav.replace('batch:', '') : null
      };
      if (!submitData.subjectId) delete submitData.subjectId;
      if (!submitData.batchId) delete submitData.batchId;

      await adminAPI.createResource(submitData);
      toast.success("Material uploaded successfully to Material Bank!");
      setShowUploadModal(false);
      setFormData({
        title: '',
        batchId: '',
        subjectId: '',
        type: 'NOTES',
        folderPath: '/',
        description: '',
        fileUrl: '',
        courseIds: [],
        isBankMaterial: true
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to upload material");
    } finally {
      setUploading(false);
    }
  };

  const handleMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialToMove) return;
    try {
      setUploading(true);
      await adminAPI.updateResource(materialToMove._id, { 
        batchId: newBatchId === 'all' ? null : newBatchId,
        folderPath: newFolderPath
      });
      toast.success("Material moved successfully!");
      setShowMoveModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to move material");
    } finally {
      setUploading(false);
    }
  };

  // Filter materials based on selected navigation item
  const filteredData = useMemo(() => {
    if (selectedNav === 'bank') {
      // In Material Bank view: show all materials in the central repository
      return data;
    }

    if (selectedNav === 'global') {
      // Global Materials: unassigned to any specific course and unassigned to specific batches
      return data.filter(item => {
        const hasCourses = item.courseIds && item.courseIds.length > 0;
        const hasBatches = item.batchId || (item.batchIds && item.batchIds.length > 0);
        return !hasCourses && !hasBatches;
      });
    }

    if (selectedNav.startsWith('course:')) {
      const courseId = selectedNav.replace('course:', '');
      return data.filter(item => {
        const itemCourseIds = item.courseIds?.map((c: any) => (c?._id || c)?.toString()) || [];
        if (itemCourseIds.includes(courseId)) return true;

        if (item.type === 'FOLDER') {
          let folderFullPath = item.folderPath || '/';
          if (!folderFullPath.startsWith('/')) folderFullPath = '/' + folderFullPath;
          if (!folderFullPath.endsWith('/')) folderFullPath += '/';
          folderFullPath += item.title + '/';

          return data.some(child => {
            const childCourseIds = child.courseIds?.map((c: any) => (c?._id || c)?.toString()) || [];
            if (!childCourseIds.includes(courseId)) return false;
            let childPath = child.folderPath || '/';
            if (!childPath.startsWith('/')) childPath = '/' + childPath;
            if (!childPath.endsWith('/')) childPath += '/';
            return childPath.startsWith(folderFullPath);
          });
        }
        return false;
      });
    }

    if (selectedNav.startsWith('batch:')) {
      const batchId = selectedNav.replace('batch:', '');
      return data.filter(item => {
        const itemBatchId = item.batchId?._id || item.batchId;
        const itemBatchIds = item.batchIds?.map((b: any) => b?._id || b) || [];
        const isUnlocked = item.unlockedBatches?.some((b: any) => (b?._id || b)?.toString() === batchId);

        if (String(itemBatchId) === String(batchId)) return true;
        if (itemBatchIds.some((id: any) => String(id) === String(batchId))) return true;
        if (isUnlocked) return true;

        if (item.type === 'FOLDER') {
          let folderFullPath = item.folderPath || '/';
          if (!folderFullPath.startsWith('/')) folderFullPath = '/' + folderFullPath;
          if (!folderFullPath.endsWith('/')) folderFullPath += '/';
          folderFullPath += item.title + '/';

          return data.some(child => {
            const childBatchId = child.batchId?._id || child.batchId;
            const childBatchIds = child.batchIds?.map((b: any) => b?._id || b) || [];
            const childUnlocked = child.unlockedBatches?.some((b: any) => (b?._id || b)?.toString() === batchId);
            const matches = String(childBatchId) === String(batchId) || 
                            childBatchIds.some((id: any) => String(id) === String(batchId)) || 
                            childUnlocked;
            if (!matches) return false;

            let childPath = child.folderPath || '/';
            if (!childPath.startsWith('/')) childPath = '/' + childPath;
            if (!childPath.endsWith('/')) childPath += '/';
            return childPath.startsWith(folderFullPath);
          });
        }
        return false;
      });
    }

    return data;
  }, [data, selectedNav]);

  // Current view info text
  const currentViewTitle = useMemo(() => {
    if (selectedNav === 'bank') return 'Material Bank (All Materials)';
    if (selectedNav === 'global') return 'Global Materials (Unassigned)';
    if (selectedNav.startsWith('course:')) {
      const cId = selectedNav.replace('course:', '');
      const course = courses.find(c => (c._id || c.id) === cId);
      return course ? `Course: ${course.name}` : 'Course Materials';
    }
    if (selectedNav.startsWith('batch:')) {
      const bId = selectedNav.replace('batch:', '');
      const batch = classes.find(b => (b._id || b.id) === bId);
      return batch ? `Batch: ${batch.name} ${batch.section || ''}` : 'Batch Materials';
    }
    return 'Study Materials';
  }, [selectedNav, courses, classes]);

  const bankMaterialsCount = data.length;
  const filteredCoursesForModal = courses.filter(c => 
    c.name?.toLowerCase().includes(courseSearch.toLowerCase()) || 
    c.tag?.toLowerCase().includes(courseSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Study Materials & Material Bank"
        subtitle="Organize master repository in Material Bank and assign materials to courses"
        breadcrumbs={['Home', 'Academics', 'Study Materials']}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" icon={Folder} onClick={handleCreateFolder}>
              New Folder
            </Button>
            <Button variant="gradient" icon={Plus} onClick={() => {
              let initialCourseIds: string[] = [];
              if (selectedNav.startsWith('course:')) {
                initialCourseIds = [selectedNav.replace('course:', '')];
              }
              setFormData({
                title: '',
                batchId: '',
                subjectId: '',
                type: 'NOTES',
                folderPath: currentPath,
                description: '',
                fileUrl: '',
                courseIds: initialCourseIds,
                isBankMaterial: true
              });
              setShowUploadModal(true);
            }}>
              Upload to Bank
            </Button>
          </div>
        }
      />

      {/* Info Alert for Material Bank */}
      {selectedNav === 'bank' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-primary-500/10 to-indigo-500/10 border border-amber-200/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Archive size={20} />
            </div>
            <div>
              <h4 className="font-black text-gray-900 text-sm flex items-center gap-2">
                Material Bank Repository
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                  {bankMaterialsCount} Total Items
                </span>
              </h4>
              <p className="text-xs text-gray-600 mt-0.5">
                Upload files and folders here once, then assign them to any course. Materials remain preserved in the bank even if courses are removed or replaced.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-220px)] min-h-[600px]">
        
        {/* Drive Sidebar */}
        <div className={`flex-shrink-0 flex flex-col gap-2 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm overflow-y-auto transition-all duration-300 relative ${isSidebarOpen ? 'w-full lg:w-72 opacity-100' : 'w-0 opacity-0 p-0 border-0 overflow-hidden hidden lg:flex'}`}>
          <div className="flex items-center justify-between mb-2 px-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Repository & Courses</h3>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Menu size={16} />
            </button>
          </div>
          
          {/* 1. MATERIAL BANK (Top Option) */}
          <button
            onClick={() => { setSelectedNav('bank'); setCurrentPath('/'); }}
            className={`flex items-center justify-between px-3.5 py-3 rounded-xl transition-all text-sm font-bold ${
              selectedNav === 'bank'
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20"
                : "text-gray-700 hover:bg-amber-50 hover:text-amber-800"
            }`}
          >
            <div className="flex items-center gap-3 truncate">
              <Archive size={18} className={selectedNav === 'bank' ? "text-white" : "text-amber-500"} />
              <span className="truncate">Material Bank</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${selectedNav === 'bank' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
              {bankMaterialsCount}
            </span>
          </button>

          {/* 2. GLOBAL MATERIALS (Below Material Bank) */}
          <button
            onClick={() => { setSelectedNav('global'); setCurrentPath('/'); }}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-sm font-medium ${
              selectedNav === 'global'
                ? "bg-primary-50 text-primary-700 font-bold border border-primary-100"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Globe size={18} className={selectedNav === 'global' ? "text-primary-500" : "text-gray-400"} />
            <span>Global Materials</span>
          </button>
          
          <div className="h-px bg-gray-100 my-2 mx-2"></div>
          
          {/* 3. COURSES SECTION */}
          <div className="px-3 flex items-center justify-between mb-1">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Courses</h3>
            <span className="text-[11px] font-bold text-gray-400">{courses.length}</span>
          </div>

          <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-420px)] pr-1">
            {courses.length === 0 ? (
              <p className="text-xs text-gray-400 px-3 py-2">No courses created yet.</p>
            ) : (
              courses.map(course => {
                const courseId = course._id || course.id;
                const isSelected = selectedNav === `course:${courseId}`;
                const assignedCount = data.filter(item => 
                  item.courseIds?.some((c: any) => (c?._id || c)?.toString() === courseId.toString())
                ).length;

                return (
                  <button
                    key={courseId}
                    onClick={() => { setSelectedNav(`course:${courseId}`); setCurrentPath('/'); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                      isSelected
                        ? "bg-primary-50 text-primary-800 font-bold border border-primary-100"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <GraduationCap size={16} className={isSelected ? "text-primary-600" : "text-gray-400"} />
                      <span className="truncate text-left">{course.name}</span>
                    </div>
                    {assignedCount > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ml-1 ${isSelected ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-600'}`}>
                        {assignedCount}
                      </span>
                    )}
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
            className="hidden lg:flex items-center justify-center w-10 h-10 bg-white border border-gray-200 shadow-sm rounded-xl text-gray-500 hover:text-primary-600 transition-colors shrink-0"
            title="Expand Sidebar"
          >
            <Menu size={20} />
          </button>
        )}

        {/* Drive Content Area */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-w-0">
          <div className="px-5 py-3.5 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Current View:</span>
              <span className="text-sm font-black text-gray-900">{currentViewTitle}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-800">
                {filteredData.length} item{filteredData.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            {selectedNav.startsWith('course:') && (
              <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60 flex items-center gap-1.5">
                <Info size={13} /> Materials assigned to this course from Material Bank
              </span>
            )}
          </div>

          <FileExplorer 
            files={filteredData} 
            currentPath={currentPath}
            onNavigate={setCurrentPath}
            onDelete={handleDelete} 
            onToggleActive={handleToggleActive}
            onView={(file) => setSelectedResource(file)} 
            onEdit={handleEditClick}
            onAssignCourses={handleOpenAssignModal}
            isAdminView={true}
            onMove={(file) => {
              setMaterialToMove(file);
              setNewBatchId(file.batchId?._id || file.batchId || 'all');
              setNewFolderPath(file.folderPath || '/');
              setShowMoveModal(true);
            }}
          />
        </div>
      </div>

      {/* Resource Viewer Modal */}
      {selectedResource && (
        <ResourceViewerModal 
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
        />
      )}

      {/* ASSIGN TO COURSES MODAL */}
      <Modal isOpen={showAssignCoursesModal} onClose={() => setShowAssignCoursesModal(false)} size="lg">
        <ModalHeader 
          title={`Assign to Courses: ${materialToAssign?.title || ''}`} 
          onClose={() => setShowAssignCoursesModal(false)} 
        />
        <form onSubmit={handleAssignCoursesSubmit} className="flex flex-col min-h-0 flex-1">
          <ModalBody className="space-y-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              Select all courses that should have access to <b>{materialToAssign?.title}</b>.
              {materialToAssign?.type === 'FOLDER' && (
                <span className="block text-amber-700 text-xs font-bold mt-1 bg-amber-50 p-2.5 rounded-xl border border-amber-200/60">
                  ⚡ Note: Assigning this folder will automatically apply these course assignments to all files and subfolders inside it!
                </span>
              )}
            </p>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search courses by name or tag..." 
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-gray-500">
                {assignCourseIds.length} course{assignCourseIds.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAssignCourseIds(courses.map(c => c._id || c.id))}
                  className="text-xs font-bold text-primary-600 hover:text-primary-700"
                >
                  Select All
                </button>
                <span className="text-gray-300">•</span>
                <button
                  type="button"
                  onClick={() => setAssignCourseIds([])}
                  className="text-xs font-bold text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto p-1 border border-gray-200 rounded-xl">
              {filteredCoursesForModal.length === 0 ? (
                <div className="col-span-2 py-8 text-center text-gray-400 text-xs">
                  No courses found matching "{courseSearch}"
                </div>
              ) : (
                filteredCoursesForModal.map(c => {
                  const cId = c._id || c.id;
                  const isChecked = assignCourseIds.includes(cId);

                  return (
                    <label 
                      key={cId}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isChecked 
                          ? 'bg-amber-50/70 border-amber-300 text-amber-900 shadow-xs' 
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAssignCourseIds(prev => [...prev, cId]);
                          } else {
                            setAssignCourseIds(prev => prev.filter(id => id !== cId));
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 mt-0.5 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate">{c.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {c.tag && (
                            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded">
                              {c.tag}
                            </span>
                          )}
                          {c.targetExam && c.targetExam !== 'ALL' && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded">
                              {c.targetExam}
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" type="button" onClick={() => setShowAssignCoursesModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={uploading}>
              Save Course Assignments
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* EDIT / RENAME MODAL */}
      <Modal isOpen={showRenameModal} onClose={() => setShowRenameModal(false)} size="md">
        <ModalHeader title="Edit Material" onClose={() => setShowRenameModal(false)} />
        <ModalBody>
          <form onSubmit={handleRenameSubmit} className="space-y-4 p-4">
            <FormField label="Title / Name">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Enter name"
                required
              />
            </FormField>

            <FormField label="Assigned Courses">
              <div className="max-h-44 overflow-y-auto p-2.5 border border-gray-200 rounded-xl space-y-1.5">
                {courses.map(c => {
                  const cId = c._id || c.id;
                  const isChecked = selectedCourseIds.includes(cId);
                  return (
                    <label key={cId} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 text-sm cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCourseIds(prev => [...prev, cId]);
                          } else {
                            setSelectedCourseIds(prev => prev.filter(id => id !== cId));
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className={isChecked ? "font-bold text-primary-800" : "font-medium text-gray-700"}>
                        {c.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </FormField>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="outline" type="button" onClick={() => setShowRenameModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploading || !newTitle.trim()}>
                {uploading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </ModalBody>
      </Modal>

      {/* UPLOAD MATERIAL MODAL */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        size="lg"
      >
        <ModalHeader title="Upload to Material Bank" onClose={() => setShowUploadModal(false)} />
        <form onSubmit={handleUploadSubmit} className="flex flex-col min-h-0 flex-1">
          <ModalBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Title"
                placeholder="e.g. Chapter 1 Thermodynamics Notes"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                required
              />
              
              <Select
                label="Type"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                required
                options={[
                  { label: 'Notes / PDF', value: 'NOTES' },
                  { label: 'Past Paper', value: 'PAST_PAPER' },
                  { label: 'Video', value: 'VIDEO' },
                  { label: 'Syllabus', value: 'SYLLABUS' }
                ]}
              />
            </div>

            {/* Course Assignment Multi-select during Upload */}
            <FormField label="Assign to Courses (Optional - Can also be done later)">
              <div className="max-h-36 overflow-y-auto p-2.5 border border-gray-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {courses.map(c => {
                  const cId = c._id || c.id;
                  const isChecked = formData.courseIds.includes(cId);
                  return (
                    <label key={cId} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 text-xs cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(f => ({ ...f, courseIds: [...f.courseIds, cId] }));
                          } else {
                            setFormData(f => ({ ...f, courseIds: f.courseIds.filter(id => id !== cId) }));
                          }
                        }}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className={isChecked ? "font-bold text-amber-900" : "font-medium text-gray-700 truncate"}>
                        {c.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </FormField>

            <FormField label="Description (Optional)">
              <textarea
                className="form-input resize-none"
                rows={2}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this material..."
              />
            </FormField>

            {formData.type === 'VIDEO' ? (
               <Input
                 label="Video URL (YouTube/Vimeo/S3)"
                 placeholder="https://..."
                 value={formData.fileUrl}
                 onChange={e => setFormData({ ...formData, fileUrl: e.target.value })}
                 required
                 hint="Paste the direct link to the video here."
               />
            ) : (
              <div className="space-y-1">
                <label className="form-label text-sm font-medium">Upload PDF File <span className="text-danger-500">*</span></label>
                <FileUpload 
                  onUploadComplete={(url) => setFormData({ ...formData, fileUrl: url })}
                  accept=".pdf"
                  maxSizeMB={50}
                />
                <p className="text-[11px] text-gray-500">Supported format: PDF only (.pdf) for protected in-app viewing.</p>
                {formData.fileUrl && (
                  <p className="text-success-600 text-xs font-medium mt-1">✓ PDF uploaded and ready to save.</p>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" type="button" onClick={() => setShowUploadModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={uploading}>
              Save to Material Bank
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* MOVE MODAL */}
      <Modal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        size="md"
      >
        <ModalHeader title="Move Material" onClose={() => setShowMoveModal(false)} />
        <form onSubmit={handleMoveSubmit} className="flex flex-col min-h-0 flex-1">
          <ModalBody className="space-y-4">
             <p className="text-sm text-surface-600">
               Select target folder path for <b>{materialToMove?.title}</b>.
             </p>
             <Input
                label="Target Folder Path"
                value={newFolderPath}
                onChange={e => setNewFolderPath(e.target.value)}
                placeholder="/ or /subject-name/"
                required
              />
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" type="button" onClick={() => setShowMoveModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={uploading}>
              Move Material
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* DELETE MODAL */}
      {itemToDelete && (
        <DeleteModal 
          isOpen={true} 
          onClose={() => setItemToDelete(null)} 
          onConfirm={async () => {
            setDeleting(true);
            await itemToDelete.onConfirm();
            setDeleting(false);
            setItemToDelete(null);
          }} 
          itemName={itemToDelete.name} 
          loading={deleting}
        />
      )}
    </div>
  );
}
