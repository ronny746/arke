import { useState, useEffect } from 'react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/modals/index.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { FormField, FileUpload } from '../../../components/forms/index.jsx';
import { studentAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Upload } from 'lucide-react';

const getPreviewUrl = (url) => {
  if (!url) return '';
  if (url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i)) return url;
  return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
};

export default function Academics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [subjectsMap, setSubjectsMap] = useState({});
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitForm, setSubmitForm] = useState({ content: '', attachments: '' });

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const [assignments, homework, subjectsRes, submissionsRes] = await Promise.all([
        studentAPI.getAssignments().catch(() => ({ data: { data: [] } })),
        studentAPI.getHomework().catch(() => ({ data: { data: [] } })),
        studentAPI.getSubjects().catch(() => ({ data: { data: [] } })),
        studentAPI.getMySubmissions().catch(() => ({ data: { data: [] } }))
      ]);
      
      const combined = [
        ...(Array.isArray(assignments.data?.data) ? assignments.data.data.map(d => ({ ...d, taskType: 'Assignment' })) : []),
        ...(Array.isArray(homework.data?.data) ? homework.data.data.map(d => ({ ...d, taskType: 'Homework' })) : [])
      ];
      
      setData(combined);

      const subMap = {};
      if (Array.isArray(subjectsRes.data?.data)) {
        subjectsRes.data.data.forEach(sub => {
          subMap[sub._id || sub.id] = sub.name;
        });
      }
      setSubjectsMap(subMap);
      setMySubmissions(Array.isArray(submissionsRes.data?.data) ? submissionsRes.data.data : []);
    } catch (err) {
      toast.error('Failed to load academic tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const openSubmitModal = (task) => {
    setSelectedTask(task);
    setSubmitForm({ content: '', attachments: '' });
    setIsSubmitModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!submitForm.content && !submitForm.attachments) {
      toast.error('Please provide content or an attachment link');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        content: submitForm.content,
        attachments: submitForm.attachments ? [submitForm.attachments] : []
      };
      
      if (selectedTask.taskType === 'Assignment') {
        await studentAPI.submitAssignment(selectedTask._id || selectedTask.id, payload);
      } else {
        await studentAPI.submitHomework(selectedTask._id || selectedTask.id, payload);
      }
      
      toast.success(`${selectedTask.taskType} submitted successfully!`);
      setIsSubmitModalOpen(false);
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { header: 'Type', accessorKey: 'taskType' },
    { header: 'Title', accessorKey: 'title' },
    { 
      header: 'Subject', 
      cell: (r) => {
        if (r.subjectId?.name) return r.subjectId.name;
        if (typeof r.subjectId === 'string' && subjectsMap[r.subjectId]) return subjectsMap[r.subjectId];
        return 'N/A';
      }
    },
    { 
      header: 'Due Date', 
      cell: (r) => r.dueDate ? format(new Date(r.dueDate), 'MMM dd, yyyy') : 'N/A'
    },
    { 
      header: 'Status', 
      cell: (r) => {
        const rowId = String(r._id || r.id);
        const submission = mySubmissions.find(s => String(s.assignmentId?._id || s.assignmentId) === rowId);
        if (submission) {
          if (submission.status === 'graded') {
            return (
              <span className={`px-2 py-1 text-xs font-medium rounded-full bg-accent-100 text-accent-700`}>
                Graded ({submission.marksObtained}/{r.maxMarks})
              </span>
            );
          }
          return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full bg-success-100 text-success-700`}>
              Submitted
            </span>
          );
        }
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full bg-warning-100 text-warning-700`}>
            Pending
          </span>
        );
      }
    },
    {
      header: 'Actions',
      cell: (r) => {
        const isSubmitted = mySubmissions.some(s => s.assignmentId === (r._id || r.id));
        return (
          <Button variant="outline" size="sm" onClick={() => openSubmitModal(r)} icon={Upload} disabled={isSubmitted}>
            {isSubmitted ? 'Submitted' : 'Submit'}
          </Button>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Homework & Assignments" 
        subtitle="View and submit your academic tasks" 
      />
      <Card className="p-5 sm:p-6">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          searchPlaceholder="Search tasks..."
        />
      </Card>

      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        size="lg"
      >
        <ModalHeader title={`Submit ${selectedTask?.taskType}`} onClose={() => setIsSubmitModalOpen(false)} />
        <ModalBody>
          <div className="space-y-4">
            <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-xl mb-4">
              <h4 className="font-medium text-surface-900 dark:text-white">{selectedTask?.title}</h4>
              <p className="text-sm text-surface-500 mt-1">{selectedTask?.description}</p>
              {selectedTask?.attachments && selectedTask.attachments.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Reference Document:</p>
                  <div className="w-full bg-surface-100 dark:bg-surface-900 rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700">
                    <iframe 
                      src={getPreviewUrl(selectedTask.attachments[0])} 
                      className="w-full h-64 sm:h-80" 
                      title="Document Preview"
                    />
                  </div>
                  <div className="mt-2 flex justify-end">
                    <a href={selectedTask.attachments[0]} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary-700 dark:text-primary-300 rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors">
                      <Upload size={14} className="rotate-180" />
                      Open in New Tab
                    </a>
                  </div>
                </div>
              )}
            </div>
            
            <FormField label="Submission Notes">
              <textarea
                className="w-full px-3 py-2 border border-surface-200 dark:border-surface-700 rounded-xl bg-transparent focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                rows={4}
                placeholder="Write any notes to your teacher here..."
                value={submitForm.content}
                onChange={(e) => setSubmitForm({ ...submitForm, content: e.target.value })}
              />
            </FormField>
            
            <FormField label="Upload Submission File">
              <FileUpload 
                value={submitForm.attachments} 
                onUploadComplete={(url) => setSubmitForm({ ...submitForm, attachments: url })}
                label="Upload Scanned Document / PDF"
              />
            </FormField>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsSubmitModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Work'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
