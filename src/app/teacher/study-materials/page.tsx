"use client";

import { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash, Folder, File as FileIcon, ExternalLink, Video, MoveRight, Menu } from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card, Badge } from '@/components/ui/index.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/modals/index.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Input, Select, FormField } from '@/components/forms/index.jsx';
import { FileUpload } from '@/components/forms/FileUpload.jsx';
import { FileExplorer } from '@/components/ui/FileExplorer.jsx';
import ResourceViewerModal from '@/components/ui/ResourceViewerModal.jsx';
import { teacherAPI } from '@/api/index.js';
import toast from 'react-hot-toast';

export default function TeacherStudyMaterialsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newBatchId, setNewBatchId] = useState('');
  const [newFolderPath, setNewFolderPath] = useState('/');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentPath, setCurrentPath] = useState('/');
  const [selectedBatchId, setSelectedBatchId] = useState('all');
  const [selectedResource, setSelectedResource] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    batchId: '',
    subjectId: '',
    type: 'NOTES',
    folderPath: '/',
    description: '',
    fileUrl: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resourcesRes, classesRes, subjectsRes] = await Promise.all([
        teacherAPI.getResources(),
        teacherAPI.getViewBatches(),
        teacherAPI.getSubjects()
      ]);
      setData(resourcesRes.data?.data || []);
      setClasses(classesRes.data?.data || []);
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

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this material?")) return;
    try {
      await teacherAPI.deleteResource(id);
      toast.success("Material deleted successfully");
      fetchData();
    } catch (err) {
      toast.error("Failed to delete material");
    }
  };

  const handleCreateFolder = async () => {
    const folderName = window.prompt("Enter folder name:");
    if (!folderName) return;
    
    try {
      await teacherAPI.createResource({
        title: folderName,
        type: 'FOLDER',
        folderPath: currentPath,
        batchId: selectedBatchId === 'all' ? null : selectedBatchId,
        fileUrl: null
      });
      toast.success("Folder created successfully");
      fetchData();
    } catch (err) {
      toast.error("Failed to create folder");
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fileUrl) {
      return toast.error("Please upload a file or provide a URL first.");
    }
    
    try {
      setUploading(true);
      const submitData = { 
        ...formData, 
        folderPath: currentPath,
        batchId: selectedBatchId === 'all' ? null : selectedBatchId
      };
      if (!submitData.subjectId) delete submitData.subjectId;
      if (!submitData.batchId) delete submitData.batchId;

      await teacherAPI.createResource(submitData);
      toast.success("Material uploaded successfully!");
      setShowUploadModal(false);
      setFormData({
        title: '',
        batchId: '',
        subjectId: '',
        type: 'NOTES',
        folderPath: '/',
        description: '',
        fileUrl: ''
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload material");
    } finally {
      setUploading(false);
    }
  };

  // Filter subjects based on selected class
  const availableSubjects = formData.batchId 
    ? subjects.filter(s => (s.batchId?._id || s.batchId) === formData.batchId)
    : subjects;

  const filteredData = selectedBatchId === 'all' 
    ? data.filter(item => !item.batchId)
    : data.filter(item => {
        const itemBatchId = item.batchId?._id || item.batchId;
        if (String(itemBatchId) === String(selectedBatchId)) return true;

        if (item.type === 'FOLDER') {
          let folderFullPath = item.folderPath || '/';
          if (!folderFullPath.startsWith('/')) folderFullPath = '/' + folderFullPath;
          if (!folderFullPath.endsWith('/')) folderFullPath += '/';
          folderFullPath += item.title + '/';

          return data.some(child => {
             const childBatchId = child.batchId?._id || child.batchId;
             if (String(childBatchId) !== String(selectedBatchId)) return false;
             
             let childPath = child.folderPath || '/';
             if (!childPath.startsWith('/')) childPath = '/' + childPath;
             if (!childPath.endsWith('/')) childPath += '/';
             
             return childPath.startsWith(folderFullPath);
          });
        }
        return false;
      });

  const columns = [
    { 
      header: 'Material', 
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
            {row.type === 'VIDEO' ? <Video size={20} /> : <FileIcon size={20} />}
          </div>
          <div>
            <p className="font-semibold text-surface-800 dark:text-white line-clamp-1">{row.title}</p>
            <div className="flex items-center gap-2 text-xs text-surface-500 mt-1">
              <span className="flex items-center gap-1"><Folder size={12} /> {row.folderPath}</span>
            </div>
          </div>
        </div>
      )
    },
    { 
      header: 'Details', 
      cell: (row) => (
        <div className="flex flex-col gap-1 text-sm">
          <span className="text-surface-700 font-medium">{row.batchId?.name}</span>
          <span className="text-surface-500 text-xs">{row.subjectId?.name || 'All Subjects'}</span>
        </div>
      )
    },
    { 
      header: 'Type', 
      cell: (row) => (
        <Badge variant={row.type === 'VIDEO' ? 'danger' : 'primary'}>
          {row.type}
        </Badge>
      )
    },
    {
      header: 'Actions',
      cell: (row) => {
        const actions = [
          {
            icon: ExternalLink,
            label: 'View File',
            onClick: () => window.open(row.fileUrl, '_blank')
          },
          {
            icon: Trash,
            label: 'Delete',
            onClick: () => handleDelete(row._id)
          }
        ];
        return <RowActions actions={actions} />;
      }
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Study Materials"
        subtitle="Manage notes, papers, and videos for students"
        breadcrumbs={['Home', 'Academics', 'Study Materials']}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" icon={Folder} onClick={handleCreateFolder}>
              New Folder
            </Button>
            <Button variant="gradient" icon={Plus} onClick={() => {
              setFormData(f => ({ ...f, batchId: selectedBatchId === 'all' ? '' : selectedBatchId }));
              setShowUploadModal(true);
            }}>
              Upload Material
            </Button>
          </div>
        }
      />

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)] min-h-[600px]">
        {/* Drive Sidebar */}
        <div className={`flex-shrink-0 flex flex-col gap-2 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm overflow-y-auto transition-all duration-300 relative ${isSidebarOpen ? 'w-full lg:w-64 opacity-100' : 'w-0 opacity-0 p-0 border-0 overflow-hidden hidden lg:flex'}`}>
          <div className="flex items-center justify-between mb-2 px-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Drive Folders</h3>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Menu size={16} />
            </button>
          </div>
          
          <button
            onClick={() => { setSelectedBatchId('all'); setCurrentPath('/'); }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
              selectedBatchId === 'all'
                ? "bg-primary-50 text-primary-700"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Folder size={18} className={selectedBatchId === 'all' ? "text-primary-500 fill-primary-100" : "text-gray-400 fill-gray-100"} />
            Global Materials
          </button>
          
          <div className="h-px bg-gray-100 my-2 mx-2"></div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-3">Classes</h3>

          {classes.map(cls => (
            <button
              key={cls._id || cls.id}
              onClick={() => { setSelectedBatchId(cls._id || cls.id); setCurrentPath('/'); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                selectedBatchId === (cls._id || cls.id)
                  ? "bg-primary-50 text-primary-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Folder size={18} className={selectedBatchId === (cls._id || cls.id) ? "text-primary-500 fill-primary-100" : "text-gray-400 fill-gray-100"} />
              {cls.name} {cls.section || ''}
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

        {/* Drive Content */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-w-0">
          <FileExplorer 
            files={filteredData} 
            currentPath={currentPath}
            onNavigate={setCurrentPath}
            onDelete={handleDelete} 
            onView={(file) => setSelectedResource(file)} 
          />
        </div>
      </div>

      {selectedResource && (
        <ResourceViewerModal 
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
        />
      )}

      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        size="lg"
      >
        <ModalHeader title="Upload Study Material" onClose={() => setShowUploadModal(false)} />
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
                <label className="form-label text-sm font-medium">Upload File <span className="text-danger-500">*</span></label>
                <FileUpload 
                  onUploadComplete={(url) => setFormData({ ...formData, fileUrl: url })}
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  maxSizeMB={50}
                />
                {formData.fileUrl && (
                  <p className="text-success-600 text-xs font-medium mt-1">✓ File uploaded and ready to save.</p>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" type="button" onClick={() => setShowUploadModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={uploading}>
              Save Material
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
