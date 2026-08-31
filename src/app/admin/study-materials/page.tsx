"use client";

import { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash, Folder, File as FileIcon, ExternalLink, Video } from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card, Badge } from '@/components/ui/index.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/modals/index.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Input, Select, FormField, FileUpload } from '@/components/forms/index.jsx';
import { FileExplorer } from '@/components/ui/FileExplorer.jsx';
import { adminAPI } from '@/api/index.js';
import toast from 'react-hot-toast';

export default function AdminStudyMaterialsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    classId: '',
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
        adminAPI.getResources(),
        adminAPI.getAcademicClasses(),
        adminAPI.getSubjects()
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
      await adminAPI.deleteResource(id);
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
      await adminAPI.createResource({
        title: folderName,
        type: 'FOLDER',
        folderPath: currentPath,
        classId: null,
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
      const submitData = { ...formData, folderPath: currentPath };
      await adminAPI.createResource(submitData);
      toast.success("Material uploaded successfully!");
      setShowUploadModal(false);
      setFormData({
        title: '',
        classId: '',
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
  const availableSubjects = formData.classId 
    ? subjects.filter(s => (s.classId?._id || s.classId) === formData.classId)
    : subjects;

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
          <span className="text-surface-700 font-medium">{row.classId?.name}</span>
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
            <Button variant="gradient" icon={Plus} onClick={() => setShowUploadModal(true)}>
              Upload Material
            </Button>
          </div>
        }
      />

      <div className="h-[600px]">
        <FileExplorer 
          files={data} 
          currentPath={currentPath}
          onNavigate={setCurrentPath}
          onDelete={handleDelete} 
          onView={(file) => window.open(file.fileUrl, '_blank')} 
        />
      </div>

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

              <Select
                label="Class / Batch (Optional)"
                value={formData.classId}
                onChange={e => setFormData({ ...formData, classId: e.target.value })}
              >
                <option value="">Select a class...</option>
                {classes.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </Select>

              <Select
                label="Subject (Optional)"
                value={formData.subjectId}
                onChange={e => setFormData({ ...formData, subjectId: e.target.value })}
              >
                <option value="">All Subjects</option>
                {availableSubjects.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </Select>

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
