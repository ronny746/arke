import { useState, useEffect } from 'react';
import { Calendar, Check, X, Clock, Save, Users } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { FormField, Select } from '../../../components/forms/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { teacherAPI, adminAPI } from '../../../api/index.js';
import { cn } from '../../../utils/helpers.js';
import toast from 'react-hot-toast';

const statusOptions = [
  { value: 'present', label: 'P', color: 'bg-success text-white', hoverColor: 'hover:bg-success hover:text-white', ring: 'ring-success' },
  { value: 'absent', label: 'A', color: 'bg-danger text-white', hoverColor: 'hover:bg-danger hover:text-white', ring: 'ring-danger' },
  { value: 'late', label: 'L', color: 'bg-warning text-white', hoverColor: 'hover:bg-warning hover:text-white', ring: 'ring-warning' },
];

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchDependencies = async () => {
    try {
      const [classRes, subRes] = await Promise.all([adminAPI.getAcademicClasses(), adminAPI.getSubjects()]);
      setClasses(Array.isArray(classRes.data?.data) ? classRes.data.data : []);
      setSubjects(Array.isArray(subRes.data?.data) ? subRes.data.data : []);
    } catch (e) {
      console.error('Failed to load dependencies', e);
    }
  };

  const fetchStudents = async () => {
    if (!selectedClass) {
      setRecords([]);
      return;
    }
    setLoading(true);
    try {
      const res = await adminAPI.getUsers({ role: 'student', classId: selectedClass });
      const students = Array.isArray(res.data?.data) ? res.data.data : [];
      setRecords(students.map(s => ({
        id: s._id || s.id,
        studentName: `${s.firstName} ${s.lastName}`,
        rollNo: s.rollNo || s.email,
        status: 'present'
      })));
    } catch (error) {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [selectedClass]);

  const counts = {
    present: records.filter(r => r.status === 'present').length,
    absent: records.filter(r => r.status === 'absent').length,
    late: records.filter(r => r.status === 'late').length,
  };

  const setStatus = (id, status) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const markAll = (status) => {
    setRecords(prev => prev.map(r => ({ ...r, status })));
    toast.success(`All students marked ${status}`);
  };

  const handleSave = async () => {
    if (!selectedClass || !selectedSubject || !date) {
      toast.error('Please select class, subject and date');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        classId: selectedClass,
        subjectId: selectedSubject,
        date: new Date(date).toISOString(),
        records: records.map(r => ({
          studentId: r.id,
          status: r.status === 'present' ? 'PRESENT' : r.status === 'absent' ? 'ABSENT' : 'LATE'
        }))
      };
      await teacherAPI.markAttendance(payload);
      toast.success('Attendance saved successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save attendance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Attendance"
        subtitle="Mark and manage student attendance"
        breadcrumbs={['Home', 'Attendance']}
        actions={<Button variant="gradient" icon={Save} loading={loading} onClick={handleSave}>Save Attendance</Button>}
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <FormField label="Class" className="flex-1 min-w-32">
            <Select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name} {c.section || ''}</option>)}
            </Select>
          </FormField>
          <FormField label="Date" className="flex-1 min-w-40">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="form-input" />
          </FormField>
          <FormField label="Subject" className="flex-1 min-w-40">
            <Select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
              <option value="">Select Subject</option>
              {subjects.map(s => <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>)}
            </Select>
          </FormField>
          <div className="flex gap-2 pb-0.5">
            <Button variant="success" size="sm" onClick={() => markAll('present')}>All Present</Button>
            <Button variant="danger" size="sm" onClick={() => markAll('absent')}>All Absent</Button>
          </div>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Present', count: counts.present, color: 'text-success-600', bg: 'bg-success-50 dark:bg-success-900/10 border-success-200 dark:border-success-800', icon: Check },
          { label: 'Absent', count: counts.absent, color: 'text-danger-600', bg: 'bg-danger-50 dark:bg-danger-900/10 border-danger-200 dark:border-danger-800', icon: X },
          { label: 'Late', count: counts.late, color: 'text-warning-600', bg: 'bg-warning-50 dark:bg-warning-900/10 border-warning-200 dark:border-warning-800', icon: Clock },
        ].map((s, i) => (
          <div key={i} className={cn('p-4 rounded-xl border text-center', s.bg)}>
            <s.icon size={20} className={cn('mx-auto mb-1', s.color)} />
            <p className={cn('text-2xl font-bold', s.color)}>{s.count}</p>
            <p className="text-xs text-surface-500 dark:text-surface-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Attendance Grid */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users size={16} className="text-primary" />
          <h3 className="font-semibold text-surface-700 dark:text-surface-200">Class {classes.find(c => (c._id || c.id) === selectedClass)?.name || ''} — {records.length} Students</h3>
          <div className="ml-auto text-xs text-surface-400">
            Attendance: <span className="font-semibold text-success-600">{Math.round((counts.present / records.length) * 100)}%</span>
          </div>
        </div>
        <div className="space-y-2">
          {records.map((record) => (
            <div key={record.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                {record.rollNo?.slice(-3)}
              </div>
              <p className="flex-1 font-medium text-surface-800 dark:text-white text-sm">{record.studentName}</p>
              <p className="text-xs text-surface-400 hidden sm:block">{record.rollNo}</p>
              <div className="flex gap-1.5">
                {statusOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setStatus(record.id, opt.value)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-xs font-bold transition-all ring-2',
                      record.status === opt.value ? `${opt.color} ${opt.ring}` : `bg-surface-100 dark:bg-surface-700 text-surface-400 ring-transparent ${opt.hoverColor}`
                    )}
                    title={opt.value}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
