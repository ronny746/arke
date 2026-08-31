import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, CheckCircle, FileText } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { DataTable, RowActions } from '../../../components/tables/DataTable.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { FileUpload } from '../../../components/forms/index.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/modals/index.jsx';
import { FormField, Input, Select, Textarea } from '../../../components/forms/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { adminAPI } from '../../../api/index.js';

import { formatDate, getStatusBadge, cn } from '../../../utils/helpers.js';
import toast from 'react-hot-toast';
export default function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showGrade, setShowGrade] = useState(null);
  const [showDelete, setShowDelete] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submissionsList, setSubmissionsList] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [gradesMap, setGradesMap] = useState({});
  const [form, setForm] = useState({ title: '', subjectId: '', classId: '', maxMarks: 25, dueDate: '', description: '', attachments: '' });
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const fetchDependencies = async () => {
    try {
      const [classRes, subRes] = await Promise.all([adminAPI.getAcademicClasses(), adminAPI.getSubjects()]);
      setClasses(Array.isArray(classRes.data?.data) ? classRes.data.data : []);
      setSubjects(Array.isArray(subRes.data?.data) ? subRes.data.data : []);
    } catch (e) { console.error('Failed to load dependencies', e); }
  };

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getAssignments();
      setAssignments(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (e) {
      console.error('Assignments Fetch Error:', e.response?.data || e.message);
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
    fetchAssignments();
  }, []);

  const columns = [
    {
      header: 'Assignment', accessorKey: 'title',
      cell: (r) => {
        const clsObj = classes.find(c => (c._id || c.id) === (r.classId?._id || r.classId));
        const subObj = subjects.find(s => (s._id || s.id) === (r.subjectId?._id || r.subjectId));
        const clsName = clsObj ? `${clsObj.name} ${clsObj.section || ''}` : 'N/A';
        const subName = subObj ? subObj.name : 'N/A';
        return (
          <div>
            <p className="font-medium text-sm text-surface-800 dark:text-white">{r.title}</p>
            <p className="text-xs text-surface-400">{subName} • {clsName}</p>
          </div>
        );
      },
    },
    { header: 'Max Marks', accessorKey: 'maxMarks', cell: (r) => <span className="font-medium">{r.maxMarks}</span> },
    {
      header: 'Submissions', 
      cell: (r) => (
        <span className="text-sm text-surface-500 font-medium">Click Actions to View</span>
      ),
    },
    { header: 'Due Date', accessorKey: 'dueDate', cell: (r) => {
      if (!r.dueDate) return 'N/A';
      const past = new Date(r.dueDate) < new Date();
      return <span className={cn('text-xs', past ? 'text-danger-500 font-medium' : 'text-surface-500 dark:text-surface-400')}>{formatDate(r.dueDate)}</span>;
    }},
    { header: 'Status', cell: (r) => {
      const past = new Date(r.dueDate) < new Date();
      return <span className={`px-2 py-1 text-xs font-medium rounded-full ${past ? 'bg-surface-200 text-surface-600' : 'bg-success/10 text-success'}`}>{past ? 'Closed' : 'Active'}</span>;
    } },
    {
      header: 'Actions', key: 'actions', sortable: false, width: '80px',
      cell: (row) => (
        <RowActions actions={[
          { label: 'Grade Submissions', icon: CheckCircle, onClick: () => {
            setShowGrade(row);
            fetchSubmissions(row._id || row.id);
          }},
          /* Edit and Delete API not available yet */
        ]} />
      ),
    },
  ];

  const handleAdd = async () => {
    setLoading(true);
    try {
      const payload = { ...form };
      if (form.attachments) {
        payload.attachments = [form.attachments];
      } else {
        payload.attachments = [];
      }
      await adminAPI.createAssignment(payload);
      toast.success('Assignment created!');
      setShowAdd(false);
      setForm({ title: '', subjectId: '', classId: '', maxMarks: 25, dueDate: '', description: '', attachments: '' });
      fetchAssignments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create assignment');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async (assignmentId) => {
    setLoadingSubmissions(true);
    try {
      const res = await adminAPI.getSubmissionsByAssignment(assignmentId);
      const subs = res.data?.data || [];
      setSubmissionsList(subs);
      const gMap = {};
      subs.forEach(s => gMap[s._id || s.id] = s.marksObtained || '');
      setGradesMap(gMap);
    } catch (err) {
      toast.error('Failed to load submissions');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleSaveGrades = async () => {
    setLoading(true);
    try {
      await Promise.all(
        submissionsList.map(sub => {
          const marks = gradesMap[sub._id || sub.id];
          if (marks !== undefined && marks !== '') {
            return adminAPI.gradeSubmission(sub._id || sub.id, { marksObtained: Number(marks) });
          }
          return Promise.resolve();
        })
      );
      toast.success('Grades saved successfully!');
      setShowGrade(null);
      fetchAssignments();
    } catch (err) {
      toast.error('Failed to save some grades');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Assignments"
        subtitle="Create, manage, and grade assignments"
        breadcrumbs={['Home', 'Assignments']}
        actions={<Button variant="gradient" icon={Plus} onClick={() => setShowAdd(true)}>Create Assignment</Button>}
      />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Total', value: assignments.length, color: 'text-primary' },
          { label: 'Active', value: assignments.filter(a => new Date(a.dueDate) >= new Date()).length, color: 'text-success-600' },
          { label: 'Closed', value: assignments.filter(a => new Date(a.dueDate) < new Date()).length, color: 'text-surface-500' },
        ].map((s, i) => (
          <Card key={i} className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-surface-400 mt-1">{s.label}</p>
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <DataTable data={assignments} columns={columns} searchable searchPlaceholder="Search assignments..." emptyTitle="No assignments found" emptyIcon={FileText} />
      </Card>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} size="lg">
        <ModalHeader title="Create Assignment" onClose={() => setShowAdd(false)} />
        <ModalBody className="space-y-4">
          <FormField label="Assignment Title" required><Input placeholder="e.g. Chapter 5 - Quadratic Equations" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Subject" required><Select value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}><option value="">Select Subject</option>{subjects.map(s => <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>)}</Select></FormField>
            <FormField label="Class" required><Select value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}><option value="">Select Class</option>{classes.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name} {c.section || ''}</option>)}</Select></FormField>
            <FormField label="Max Marks"><Input type="number" value={form.maxMarks} onChange={e => setForm(f => ({ ...f, maxMarks: Number(e.target.value) }))} /></FormField>
            <FormField label="Due Date" required><Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></FormField>
          </div>
          <FormField label="Description"><Textarea placeholder="Add detailed instructions..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} /></FormField>
          <FormField label="Attachment (Optional)">
            <FileUpload 
              value={form.attachments} 
              onUploadComplete={(url) => setForm(f => ({ ...f, attachments: url }))} 
              label="Upload Assignment Document"
            />
          </FormField>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button variant="outline" loading={loading} onClick={async () => {
            setLoading(true); await new Promise(r => setTimeout(r, 600));
            setAssignments(prev => [{ ...form, id: `asgn-${Date.now()}`, status: 'draft', submissions: 0, totalStudents: 38, createdAt: new Date().toISOString() }, ...prev]);
            setShowAdd(false); setLoading(false); toast.success('Saved as draft');
          }}>Save Draft</Button>
          <Button variant="gradient" loading={loading} onClick={handleAdd}>Publish Assignment</Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation Modal */}
      {showDelete && (
        <Modal isOpen={!!showDelete} onClose={() => setShowDelete(null)} size="sm">
          <ModalHeader title="Delete Assignment" onClose={() => setShowDelete(null)} />
          <ModalBody className="py-4 text-center">
            <p className="text-sm text-surface-600 dark:text-surface-400">
              Are you sure you want to delete <strong>{showDelete.title}</strong>? This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowDelete(null)}>Cancel</Button>
            <Button variant="danger" loading={loading} onClick={async () => {
              setLoading(true); await new Promise(r => setTimeout(r, 600));
              setAssignments(p => p.filter(a => a.id !== showDelete.id));
              setShowDelete(null); setLoading(false); toast.success('Assignment deleted');
            }}>Delete</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Edit Assignment Modal */}
      {showEdit && (
        <Modal isOpen={!!showEdit} onClose={() => setShowEdit(null)} size="lg">
          <ModalHeader title="Edit Assignment" subtitle={`Updating ${showEdit.title}`} onClose={() => setShowEdit(null)} />
          <ModalBody className="space-y-4">
            <FormField label="Assignment Title" required><Input value={showEdit.title || ''} onChange={e => setShowEdit(f => ({ ...f, title: e.target.value }))} /></FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Subject"><Select value={showEdit.subject || ''} onChange={e => setShowEdit(f => ({ ...f, subject: e.target.value }))}><option>Mathematics</option><option>Physics</option><option>Chemistry</option><option>English</option></Select></FormField>
              <FormField label="Class"><Select value={showEdit.class || ''} onChange={e => setShowEdit(f => ({ ...f, class: e.target.value }))}>{['10A', '10B', '11A', '11B', '12A'].map(c => <option key={c}>{c}</option>)}</Select></FormField>
              <FormField label="Max Marks"><Input type="number" value={showEdit.maxMarks || ''} onChange={e => setShowEdit(f => ({ ...f, maxMarks: Number(e.target.value) }))} /></FormField>
              <FormField label="Due Date"><Input type="date" value={showEdit.dueDate ? new Date(showEdit.dueDate).toISOString().split('T')[0] : ''} onChange={e => setShowEdit(f => ({ ...f, dueDate: e.target.value }))} /></FormField>
            </div>
            <FormField label="Instructions"><Textarea value={showEdit.instructions || ''} onChange={e => setShowEdit(f => ({ ...f, instructions: e.target.value }))} rows={4} /></FormField>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowEdit(null)}>Cancel</Button>
            <Button variant="gradient" loading={loading} onClick={async () => {
              setLoading(true); await new Promise(r => setTimeout(r, 600));
              setAssignments(p => p.map(a => a.id === showEdit.id ? showEdit : a));
              setShowEdit(null); setLoading(false); toast.success('Assignment updated!');
            }}>Save Changes</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Grade Modal */}
      {showGrade && (
        <Modal isOpen={!!showGrade} onClose={() => setShowGrade(null)} size="lg">
          <ModalHeader title={`Grade: ${showGrade.title}`} subtitle={`Max: ${showGrade.maxMarks} marks`} onClose={() => setShowGrade(null)} />
          <ModalBody>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {loadingSubmissions ? (
                <p className="text-center py-4 text-surface-500">Loading submissions...</p>
              ) : submissionsList.length === 0 ? (
                <p className="text-center py-4 text-surface-500">No submissions yet.</p>
              ) : (
                submissionsList.map((sub, i) => (
                  <div key={sub._id || sub.id} className="flex flex-col gap-2 p-3 bg-surface-50 dark:bg-surface-700/50 rounded-xl">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-surface-700 dark:text-surface-200 flex-1">
                        {sub.studentId?.firstName} {sub.studentId?.lastName}
                      </span>
                      {sub.attachments && sub.attachments.length > 0 && (
                        <a href={sub.attachments[0]} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                          <FileText size={12} /> View File
                        </a>
                      )}
                      <span className="text-xs text-surface-400">{formatDate(sub.createdAt)}</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          value={gradesMap[sub._id || sub.id] || ''} 
                          onChange={e => setGradesMap(prev => ({ ...prev, [sub._id || sub.id]: e.target.value }))}
                          max={showGrade.maxMarks} 
                          min={0} 
                          className="form-input w-16 h-8 text-center text-sm px-2 py-1" 
                          placeholder="--"
                        />
                        <span className="text-xs text-surface-400">/{showGrade.maxMarks}</span>
                      </div>
                    </div>
                    {sub.content && (
                      <div className="text-sm text-surface-600 dark:text-surface-300 bg-white dark:bg-surface-800 p-2 rounded border border-surface-200 dark:border-surface-600">
                        {sub.content}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowGrade(null)}>Cancel</Button>
            <Button variant="gradient" loading={loading} onClick={handleSaveGrades}>Save Grades</Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
