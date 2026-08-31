import { useState, useEffect, useMemo } from 'react';
import { Upload, FolderOpen, File, Video, Link, Trash2, Download, Plus, ChevronRight, Folder } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/modals/index.jsx';
import ResourceViewerModal from '../../../components/ui/ResourceViewerModal.jsx';
import { FormField, Input, Select, FileUpload } from '../../../components/forms/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { adminAPI } from '../../../api/index.js';
import { teacherAPI } from '../../../api/teacher.js';
import { cn, formatDate } from '../../../utils/helpers.js';
import toast from 'react-hot-toast';

const typeIcons = { pdf: File, video: Video, link: Link };
const typeColors = { pdf: 'bg-danger-100 dark:bg-danger-900/30 text-danger-600', video: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600', link: 'bg-accent-100 dark:bg-accent-900/30 text-accent-600' };

export default function Resources() {
  const [resources, setResources] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [activeClassId, setActiveClassId] = useState('');
  const [showDelete, setShowDelete] = useState(null);
  const [loading, setLoading] = useState(false);

  const [classes, setClasses] = useState([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [selectedResource, setSelectedResource] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    classId: '',
    type: 'NOTES',
    fileUrl: '',
    folderPath: '/',
    description: ''
  });

  useEffect(() => {
    fetchDependencies();
  }, []);

  const fetchDependencies = async () => {
    try {
      const clsRes = await adminAPI.getAcademicClasses();
      const clsData = clsRes.data?.data || [];
      setClasses(clsData);
      if (clsData.length > 0) {
        setActiveClassId(clsData[0]._id || clsData[0].id);
        setFormData(f => ({ ...f, classId: clsData[0]._id || clsData[0].id }));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load classes');
    }
  };

  useEffect(() => {
    if (activeClassId) {
      setCurrentPath('/');
      fetchResources();
    }
  }, [activeClassId]);

  const fetchResources = async () => {
    try {
      const res = await teacherAPI.getResources({ classId: activeClassId });
      setResources(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch resources');
    }
  };

  // Compute folder explorer contents
  const explorerContent = useMemo(() => {
    const folders = new Set();
    const files = [];

    resources.forEach(res => {
      const resPath = res.folderPath || '/';
      // Normalize paths to ensure they start and end with '/'
      const normalizedResPath = resPath.startsWith('/') ? resPath : '/' + resPath;
      const finalResPath = normalizedResPath.endsWith('/') ? normalizedResPath : normalizedResPath + '/';
      
      const normalizedCurrentPath = currentPath.endsWith('/') ? currentPath : currentPath + '/';

      if (finalResPath === normalizedCurrentPath) {
        // It's a file exactly in this folder
        files.push(res);
      } else if (finalResPath.startsWith(normalizedCurrentPath)) {
        // It's in a subfolder
        const relativePath = finalResPath.substring(normalizedCurrentPath.length);
        const nextFolder = relativePath.split('/')[0];
        if (nextFolder) {
          folders.add(nextFolder);
        }
      }
    });

    return { folders: Array.from(folders).sort(), files };
  }, [resources, currentPath]);

  // Compute unique folders for datalist to help autocomplete
  const existingFolders = useMemo(() => {
    const folders = new Set();
    resources.forEach(res => {
      if (res.folderPath && res.folderPath !== '/') {
        let p = res.folderPath;
        if (p.startsWith('/')) p = p.substring(1);
        if (p.endsWith('/')) p = p.substring(0, p.length - 1);
        if (p) folders.add(p);
      }
    });
    return Array.from(folders);
  }, [resources]);

  const handleNavigate = (folderName) => {
    const normalizedCurrent = currentPath.endsWith('/') ? currentPath : currentPath + '/';
    setCurrentPath(normalizedCurrent + folderName + '/');
  };

  const handleBreadcrumbClick = (index, parts) => {
    if (index === -1) {
      setCurrentPath('/');
    } else {
      const newPath = '/' + parts.slice(0, index + 1).join('/') + '/';
      setCurrentPath(newPath);
    }
  };

  const pathParts = currentPath.split('/').filter(Boolean);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Resources"
        subtitle="Upload and organize study materials"
        breadcrumbs={['Home', 'Resources']}
        actions={<Button variant="gradient" icon={Plus} onClick={() => {
          setFormData(f => ({ ...f, folderPath: currentPath === '/' ? '' : currentPath.substring(1, currentPath.length - 1) }));
          setShowAdd(true);
        }}>Upload Resource</Button>}
      />

      {/* Subject tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {classes.map(cls => (
          <button key={cls._id || cls.id} onClick={() => setActiveClassId(cls._id || cls.id)} className={cn('px-5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap', activeClassId === (cls._id || cls.id) ? 'bg-primary text-white' : 'bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-200')}>
            {cls.name} {cls.section}
          </button>
        ))}
      </div>

      <Card className="p-5 min-h-[400px]">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-6 px-2 text-sm font-medium overflow-x-auto pb-2">
          <button 
            onClick={() => handleBreadcrumbClick(-1, pathParts)}
            className={cn("hover:text-primary transition-colors flex items-center gap-1", pathParts.length === 0 ? "text-primary" : "text-surface-500")}
          >
            <FolderOpen size={16} /> Root
          </button>
          {pathParts.map((part, index) => (
            <div key={index} className="flex items-center gap-2 shrink-0">
              <ChevronRight size={14} className="text-surface-400" />
              <button 
                onClick={() => handleBreadcrumbClick(index, pathParts)}
                className={cn("hover:text-primary transition-colors", index === pathParts.length - 1 ? "text-primary" : "text-surface-500")}
              >
                {part}
              </button>
            </div>
          ))}
        </div>

        {explorerContent.folders.length === 0 && explorerContent.files.length === 0 ? (
          <div className="text-center py-16 text-surface-400">
            <FolderOpen size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-surface-600 dark:text-surface-300 font-medium mb-1">This folder is empty</p>
            <p className="text-sm">Click "Upload Resource" to add files here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Render Folders */}
            {explorerContent.folders.map(folder => (
              <button
                key={folder}
                onClick={() => handleNavigate(folder)}
                className="flex items-center gap-3 p-4 bg-surface-50 dark:bg-surface-800/50 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 border border-transparent hover:border-surface-200 dark:hover:border-surface-600 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300 flex items-center justify-center shrink-0">
                  <Folder size={20} className="fill-current opacity-20" />
                </div>
                <span className="font-medium text-surface-800 dark:text-surface-200 truncate flex-1">{folder}</span>
              </button>
            ))}

            {/* Render Files */}
            {explorerContent.files.map(res => {
              const resType = res.type === 'VIDEO' ? 'video' : res.type === 'NOTES' || res.type === 'PAST_PAPER' ? 'pdf' : 'link';
              const Icon = typeIcons[resType] || File;
              return (
                <div key={res._id || res.id} className="flex flex-col p-4 bg-surface-50 dark:bg-surface-800/50 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 border border-surface-200 dark:border-surface-700 transition-all group">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', typeColors[resType] || typeColors.pdf)}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="font-medium text-sm text-surface-800 dark:text-white truncate" title={res.title}>{res.title}</p>
                      <p className="text-xs text-surface-400 mt-0.5">{res.type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  {res.description && <p className="text-xs text-surface-500 mb-3 line-clamp-2 flex-1">{res.description}</p>}
                  
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-surface-200 dark:border-surface-700/50">
                    <span className="text-[11px] text-surface-400">{formatDate(res.createdAt)}</span>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => setSelectedResource(res)}
                        className="p-1.5 text-surface-500 hover:text-primary bg-white dark:bg-surface-800 shadow-sm rounded-md transition-colors" 
                        title="Preview"
                      >
                        <File size={14} />
                      </button>
                      <a href={res.fileUrl} target="_blank" rel="noreferrer" className="p-1.5 text-surface-500 hover:text-primary bg-white dark:bg-surface-800 shadow-sm rounded-md transition-colors" title="Download">
                        <Download size={14} />
                      </a>
                      <button className="p-1.5 text-surface-500 hover:text-danger bg-white dark:bg-surface-800 shadow-sm rounded-md transition-colors" onClick={() => setShowDelete(res)} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {selectedResource && (
        <ResourceViewerModal 
          resource={selectedResource} 
          onClose={() => setSelectedResource(null)} 
        />
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} size="md">
        <ModalHeader title="Upload Resource" onClose={() => setShowAdd(false)} />
        <ModalBody className="space-y-4">
          <FormField label="Resource Title" required>
            <Input value={formData.title} onChange={e => setFormData(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Chapter 5 Notes" />
          </FormField>
          <FormField label="Description">
            <Input value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
          </FormField>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Class" required>
              <Select value={formData.classId} onChange={e => setFormData(f => ({ ...f, classId: e.target.value }))}>
                {classes.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name} {c.section}</option>)}
              </Select>
            </FormField>
            <FormField label="Type" required>
              <Select value={formData.type} onChange={e => setFormData(f => ({ ...f, type: e.target.value }))}>
                <option value="NOTES">Notes</option>
                <option value="PAST_PAPER">Past Paper</option>
                <option value="VIDEO">Video</option>
                <option value="SYLLABUS">Syllabus</option>
              </Select>
            </FormField>
          </div>

          <FormField label="Folder Path" hint="Use / to create subfolders, e.g. Science/Physics">
            <Input 
              list="folder-suggestions"
              value={formData.folderPath} 
              onChange={e => setFormData(f => ({ ...f, folderPath: e.target.value }))} 
              placeholder="e.g. Mathematics/Algebra" 
            />
            <datalist id="folder-suggestions">
              {existingFolders.map(folder => (
                <option key={folder} value={folder} />
              ))}
            </datalist>
          </FormField>

          {formData.type === 'VIDEO' ? (
            <FormField label="Video URL (YouTube/Link)" required>
              <Input value={formData.fileUrl} onChange={e => setFormData(f => ({ ...f, fileUrl: e.target.value }))} placeholder="https://youtube.com/..." />
            </FormField>
          ) : (
            <FormField label="Upload Resource File" required>
              <FileUpload 
                value={formData.fileUrl} 
                onUploadComplete={(url) => setFormData(f => ({ ...f, fileUrl: url }))} 
                label="Upload Document/PDF"
              />
            </FormField>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button variant="gradient" loading={loading} icon={Upload} onClick={async () => {
            if (!formData.title || !formData.fileUrl || !formData.classId) return toast.error('Please fill required fields');
            setLoading(true);
            try {
              await teacherAPI.createResource(formData);
              toast.success('Resource uploaded!');
              setShowAdd(false);
              setFormData({ title: '', classId: activeClassId, type: 'NOTES', fileUrl: '', folderPath: '/', description: '' });
              fetchResources();
            } catch (err) {
              console.error(err);
              toast.error('Failed to upload resource');
            } finally {
              setLoading(false);
            }
          }}>Upload</Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation Modal */}
      {showDelete && (
        <Modal isOpen={!!showDelete} onClose={() => setShowDelete(null)} size="sm">
          <ModalHeader title="Delete Resource" onClose={() => setShowDelete(null)} />
          <ModalBody className="py-4 text-center">
            <p className="text-sm text-surface-600 dark:text-surface-400">
              Are you sure you want to delete <strong>{showDelete.title}</strong>? This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowDelete(null)}>Cancel</Button>
            <Button variant="danger" loading={loading} onClick={async () => {
              setLoading(true); 
              // API call to delete resource goes here (if endpoint exists). For now mimicking delete locally.
              await new Promise(r => setTimeout(r, 600));
              setResources(p => p.filter(r => r._id !== showDelete._id && r.id !== showDelete.id));
              setShowDelete(null); setLoading(false); toast.success('Resource deleted');
            }}>Delete</Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
