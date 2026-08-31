"use client";

import { useState, useEffect, useMemo } from 'react';
import { BookOpen, Plus, Trash, Folder, File as FileIcon, ExternalLink, Video, MoveRight, Menu } from 'lucide-react';
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
  const [data, setData] = useState([]);
  const [selectedResource, setSelectedResource] = useState(null);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  const [selectedBatchId, setSelectedBatchId] = useState('all');

  const [showMoveModal, setShowMoveModal] = useState(false);
  const [materialToMove, setMaterialToMove] = useState(null);
  
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [materialToRename, setMaterialToRename] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [newBatchId, setNewBatchId] = useState('');
  const [newBatchIds, setNewBatchIds] = useState([]);
  const [newFolderPath, setNewFolderPath] = useState('/');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
        adminAPI.getResources(),
        adminAPI.getBatches(),
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

  const handleDelete = (id) => {
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

  const handleEditClick = (item) => {
    setMaterialToRename(item);
    setNewTitle(item.title || '');
    setNewBatchId(item.batchId?._id || item.batchId || 'all');
    setNewBatchIds(item.batchIds?.map(b => b?._id || b) || []);
    setShowRenameModal(true);
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      setUploading(true);
      await adminAPI.updateResource(materialToRename._id || materialToRename.id, { 
        title: newTitle.trim(),
        batchId: newBatchIds.length === 0 ? null : newBatchId === 'all' ? null : newBatchId,
        batchIds: newBatchIds
      });
      toast.success("Updated successfully!");
      setShowRenameModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to rename");
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
      await adminAPI.createResource({
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

      await adminAPI.createResource(submitData);
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

  const handleMoveSubmit = async (e) => {
    e.preventDefault();
    if (!materialToMove) return;
    try {
      setUploading(true);
      
      // If moving a folder, we might need to change the base path for it.
      // But updateResource currently just updates folderPath.
      // Wait, moving a folder and all its contents in the backend is tricky if we don't update children.
      // The user just wants to move the item.
      await adminAPI.updateResource(materialToMove._id, { 
        batchId: newBatchId === 'all' ? null : newBatchId,
        folderPath: newFolderPath
      });
      toast.success("Material moved successfully!");
      setShowMoveModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to move material");
    } finally {
      setUploading(false);
    }
  };

  // Get unique folder paths for the selected newBatchId
  const availableFolders = useMemo(() => {
    const folders = new Set(['/']);
    data.forEach(item => {
      const itemBatchId = item.batchId?._id || item.batchId || 'all';
      if (itemBatchId === newBatchId || (newBatchId === 'all' && !item.batchId)) {
        if (item.type === 'FOLDER') {
           let path = item.folderPath || '/';
           if (!path.startsWith('/')) path = '/' + path;
           if (!path.endsWith('/')) path = path + '/';
           folders.add(path + item.title + '/');
        }
      }
    });
    return Array.from(folders).sort();
  }, [data, newBatchId]);

  // Filter subjects based on selected class
  const availableSubjects = formData.batchId 
    ? subjects.filter(s => (s.batchId?._id || s.batchId) === formData.batchId)
    : subjects;

  const filteredData = selectedBatchId === 'all' 
    ? data.filter(item => !item.batchId && (!item.batchIds || item.batchIds.length === 0))
    : data.filter(item => {
        const itemBatchId = item.batchId?._id || item.batchId;
        const itemBatchIds = item.batchIds?.map(b => b?._id || b) || [];
        
        if (String(itemBatchId) === String(selectedBatchId)) return true;
        if (itemBatchIds.some(id => String(id) === String(selectedBatchId))) return true;

        if (item.type === 'FOLDER') {
           let folderFullPath = item.folderPath || '/';
           if (!folderFullPath.startsWith('/')) folderFullPath = '/' + folderFullPath;
           if (!folderFullPath.endsWith('/')) folderFullPath += '/';
           folderFullPath += item.title + '/';

           return data.some(child => {
              const childBatchId = child.batchId?._id || child.batchId;
              const childBatchIds = child.batchIds?.map(b => b?._id || b) || [];
              
              const belongsToClass = String(childBatchId) === String(selectedBatchId) || childBatchIds.some(id => String(id) === String(selectedBatchId));
              if (!belongsToClass) return false;
              
              let childPath = child.folderPath || '/';
              if (!childPath.startsWith('/')) childPath = '/' + childPath;
              if (!childPath.endsWith('/')) childPath += '/';
              
              return childPath.startsWith(folderFullPath);
           });
        }
        return false;
      });

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
            onToggleActive={handleToggleActive}
            onView={(file) => setSelectedResource(file)} 
            onEdit={handleEditClick}
            onMove={(file) => {
              setMaterialToMove(file);
              setNewBatchId(file.batchId?._id || file.batchId || 'all');
              setNewFolderPath(file.folderPath || '/');
              setShowMoveModal(true);
            }}
          />
        </div>
      </div>

      {selectedResource && (
        <ResourceViewerModal 
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
        />
      )}

      <Modal isOpen={showRenameModal} onClose={() => setShowRenameModal(false)} size="md">
        <ModalHeader title="Edit Material" onClose={() => setShowRenameModal(false)} />
        <ModalBody>
          <form onSubmit={handleRenameSubmit} className="space-y-4 p-4">
            <FormField label="Name">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Enter name"
                required
              />
            </FormField>
            
            {selectedBatchId === 'all' && (
              <FormField label="Class Access (Multiple Selection Allowed)">
                <div className="flex flex-col gap-2 max-h-44 overflow-y-auto p-3 border border-gray-200 rounded-xl bg-white shadow-inner">
                  <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                      checked={newBatchIds.length === 0}
                      onChange={(e) => {
                        if (e.target.checked) setNewBatchIds([]);
                      }}
                    />
                    <span className={newBatchIds.length === 0 ? "font-semibold text-primary-700" : "font-medium"}>All Classes (Global)</span>
                  </label>
                  
                  <div className="h-px bg-gray-100 mx-2"></div>
                  
                  {classes.map(c => (
                    <label key={c._id} className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        checked={newBatchIds.includes(c._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewBatchIds(prev => [...prev, c._id]);
                          } else {
                            setNewBatchIds(prev => prev.filter(id => id !== c._id));
                          }
                        }}
                      />
                      <span className={newBatchIds.includes(c._id) ? "font-semibold text-primary-700" : "font-medium"}>{c.name} {c.section}</span>
                    </label>
                  ))}
                </div>
              </FormField>
            )}
            
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="outline" type="button" onClick={() => setShowRenameModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploading || !newTitle.trim()}>
                {uploading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </ModalBody>
      </Modal>

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

      <Modal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        size="md"
      >
        <ModalHeader title="Move Material" onClose={() => setShowMoveModal(false)} />
        <form onSubmit={handleMoveSubmit} className="flex flex-col min-h-0 flex-1">
          <ModalBody className="space-y-4">
             <p className="text-sm text-surface-600">
               Select a new batch to move <b>{materialToMove?.title}</b> to.
             </p>
             <Select
                label="Target Batch"
                value={newBatchId}
                onChange={e => setNewBatchId(e.target.value)}
                required
              >
                <option value="all">All Batches (Common)</option>
                {classes.map(c => (
                  <option key={c._id} value={c._id}>{c.name} {c.section}</option>
                ))}
              </Select>
              
              <Select
                label="Target Folder"
                value={newFolderPath}
                onChange={e => setNewFolderPath(e.target.value)}
                required
              >
                {availableFolders.map(folder => (
                  <option key={folder} value={folder}>{folder}</option>
                ))}
              </Select>
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
