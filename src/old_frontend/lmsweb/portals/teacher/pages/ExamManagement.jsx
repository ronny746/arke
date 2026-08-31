import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ClipboardList, Clock, Edit, Activity, FileText } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { DataTable, RowActions } from '../../../components/tables/DataTable.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/modals/index.jsx';
import { FormField, Input, Select } from '../../../components/forms/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { adminAPI, teacherAPI } from '../../../api/index.js';
import { formatDate, getStatusBadge, cn } from '../../../utils/helpers.js';
import toast from 'react-hot-toast';

export default function ExamManagement() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showMarks, setShowMarks] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'UNIT_TEST', classId: '', subjectId: '', examDate: '', totalMarks: 50 });
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});

  const fetchExams = async () => {
    try {
      const res = await adminAPI.getExams();
      setExams(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        const [classRes, subRes] = await Promise.all([adminAPI.getAcademicClasses(), adminAPI.getSubjects()]);
        setClasses(Array.isArray(classRes.data?.data) ? classRes.data.data : []);
        setSubjects(Array.isArray(subRes.data?.data) ? subRes.data.data : []);
      } catch (e) { console.error(e); }
    };
    fetchDependencies();
    
    adminAPI.getExams().then(res => {
      setExams(Array.isArray(res.data?.data) ? res.data.data : []);
    }).catch(e => console.error(e));
  }, []);

  const handleOpenMarks = async (exam) => {
    setShowMarks(exam);
    setLoading(true);
    setStudents([]);
    setMarks({});
    try {
      const clsId = exam.classId?._id || exam.classId;
      if (clsId) {
        const res = await adminAPI.getUsers({ role: 'student', classId: clsId });
        const stds = Array.isArray(res.data?.data) ? res.data.data : [];
        setStudents(stds);
        const m = {};
        stds.forEach(s => m[s._id || s.id] = '');
        setMarks(m);
      }
    } catch (e) {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'Exam', accessorKey: 'title',
      cell: (r) => {
        const classNames = r.assignedClasses?.length 
          ? r.assignedClasses.map(c => `${c.name} ${c.section || ''}`.trim()).join(', ') 
          : (r.examType === 'PUBLIC' ? 'Public Exam' : 'No Classes');
          
        return (
          <div>
            <p className="font-medium text-sm text-surface-800 dark:text-white">{r.title}</p>
            <p className="text-xs text-surface-400">{classNames}</p>
          </div>
        );
      },
    },
    { header: 'Date', accessorKey: 'settings.startTime', cell: (r) => <span className="text-sm">{r.settings?.startTime ? formatDate(r.settings.startTime) : 'N/A'}</span> },
    { header: 'Marks', accessorKey: 'totalMarks', cell: (r) => <span className="font-medium">{r.totalMarks}</span> },
    { header: 'Questions', accessorKey: 'totalQuestions', cell: (r) => <span>{r.totalQuestions || 0} Qs</span> },
    { header: 'Status', accessorKey: 'status', cell: (r) => <span className='badge capitalize text-primary bg-primary/10'>{r.status?.replace('_', ' ') || 'Unknown'}</span> },
    {
      header: 'Actions', key: 'actions', sortable: false, width: '80px',
      cell: (row) => (
        <RowActions actions={[
          { label: 'View Results', icon: FileText, onClick: () => navigate(`/teacher/exams/${row._id || row.id}/results`) },
          { label: 'Live Monitor', icon: Activity, onClick: () => navigate(`/teacher/exams/${row._id || row.id}/monitor`) },
          { label: 'Enter Marks', icon: ClipboardList, onClick: () => handleOpenMarks(row) },
        ]} />
      ),
    },
  ];

  const statusGroups = [
    { label: 'Drafts', count: exams.filter(e => e.status === 'DRAFT').length, color: 'text-surface-600' },
    { label: 'Published', count: exams.filter(e => e.status === 'PUBLISHED').length, color: 'text-primary' },
    { label: 'Completed', count: exams.filter(e => e.status === 'COMPLETED').length, color: 'text-success-600' },
    { label: 'Archived', count: exams.filter(e => e.status === 'ARCHIVED').length, color: 'text-warning-600' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Exam Management"
        subtitle="Manage exams and evaluate results"
        breadcrumbs={['Home', 'Exams']}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statusGroups.map((s, i) => (
          <Card key={i} className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-surface-400 mt-1">{s.label}</p>
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <DataTable data={exams} columns={columns} searchable searchPlaceholder="Search exams..." emptyTitle="No exams found" emptyIcon={ClipboardList} />
      </Card>

      {/* Quick Marks Entry */}
      <Card className="p-5">
        <h3 className="font-semibold text-surface-700 dark:text-surface-200 mb-4">Quick Marks Entry</h3>
        <div className="flex flex-wrap gap-4 mb-4">
          <FormField label="Select Exam" className="flex-1 min-w-48">
            <Select><option>Mid-Term Mathematics 10A</option><option>Unit Test Physics 11A</option></Select>
          </FormField>
          <div className="pb-0.5"><Button variant="outline">Load Students</Button></div>
        </div>
        <p className="text-sm text-surface-400">Select an exam above to load students and enter marks.</p>
      </Card>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} size="md">
        <ModalHeader title="Create Exam" onClose={() => setShowAdd(false)} />
        <ModalBody className="space-y-4">
          <FormField label="Exam Title" required><Input placeholder="e.g. Term 1 Exam" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></FormField>
          <FormField label="Exam Type" required>
            <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="UNIT_TEST">Unit Test</option>
              <option value="MID_TERM">Mid-Term</option>
              <option value="FINAL">Final Exam</option>
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Subject" required><Select value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}><option value="">Select Subject</option>{subjects.map(s => <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>)}</Select></FormField>
            <FormField label="Class" required><Select value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}><option value="">Select Class</option>{classes.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name} {c.section || ''}</option>)}</Select></FormField>
            <FormField label="Exam Date" required><Input type="date" value={form.examDate} onChange={e => setForm(f => ({ ...f, examDate: e.target.value }))} /></FormField>
            <FormField label="Total Marks" required><Input type="number" value={form.totalMarks} onChange={e => setForm(f => ({ ...f, totalMarks: Number(e.target.value) }))} /></FormField>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button variant="gradient" loading={loading} onClick={async () => {
            setLoading(true);
            try {
              await teacherAPI.createExam(form);
              toast.success('Exam created!');
              setShowAdd(false);
              setForm({ title: '', type: 'UNIT_TEST', classId: '', subjectId: '', examDate: '', totalMarks: 50 });
              fetchExams();
            } catch (err) {
              toast.error(err.response?.data?.message || 'Failed to create exam');
            } finally {
              setLoading(false);
            }
          }}>Create Exam</Button>
        </ModalFooter>
      </Modal>

      {/* Edit Exam Modal removed */}

      {/* Enter Marks Modal */}
      {showMarks && (
        <Modal isOpen={!!showMarks} onClose={() => setShowMarks(null)} size="lg">
          <ModalHeader title="Enter Marks" subtitle={`${showMarks.title} • Max Marks: ${showMarks.totalMarks}`} onClose={() => setShowMarks(null)} />
          <ModalBody className="max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-3">
              {students.length === 0 && !loading && <p className="text-sm text-surface-500">No students found for this class.</p>}
              {loading ? <p className="text-sm text-surface-500">Loading students...</p> : students.map((std, i) => (
                <div key={std._id || std.id} className="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-700/50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-surface-800 dark:text-white">{std.firstName} {std.lastName}</p>
                    <p className="text-xs text-surface-400">Roll No: {std.rollNo || 'N/A'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      className="w-20 text-center" 
                      placeholder="0" 
                      max={showMarks.totalMarks}
                      value={marks[std._id || std.id] || ''}
                      onChange={e => setMarks({ ...marks, [std._id || std.id]: Number(e.target.value) })}
                    />
                    <span className="text-sm text-surface-500">/ {showMarks.totalMarks}</span>
                  </div>
                </div>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowMarks(null)}>Cancel</Button>
            <Button variant="gradient" loading={loading} onClick={async () => {
              setLoading(true);
              try {
                const results = Object.entries(marks).filter(([_, v]) => v !== '').map(([stdId, v]) => {
                  const m = Number(v);
                  const p = (m / showMarks.totalMarks) * 100;
                  let grade = 'F';
                  if (p >= 90) grade = 'A+';
                  else if (p >= 80) grade = 'A';
                  else if (p >= 70) grade = 'B';
                  else if (p >= 60) grade = 'C';
                  else if (p >= 50) grade = 'D';

                  return teacherAPI.enterMarks({
                    examId: showMarks._id || showMarks.id,
                    studentId: stdId,
                    marksObtained: m,
                    grade: grade,
                    remarks: ''
                  });
                });
                await Promise.all(results);
                toast.success('Marks saved successfully!');
                setShowMarks(null);
              } catch (e) {
                toast.error('Failed to save some or all marks');
              } finally {
                setLoading(false);
              }
            }}>Save Marks</Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
