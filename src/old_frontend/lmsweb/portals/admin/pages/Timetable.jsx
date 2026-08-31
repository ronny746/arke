import { useState, useEffect } from 'react';
import { CalendarClock, Plus, Filter } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card, StatCard } from '../../../components/ui/index.jsx';
import { DataTable, RowActions } from '../../../components/tables/DataTable.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/modals/index.jsx';
import { FormField, Input, Select } from '../../../components/forms/index.jsx';
import { adminAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';

export default function Timetable() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // For dropdowns
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [form, setForm] = useState({ classId: '', subjectId: '', teacherId: '', dayOfWeek: '1', startTime: '09:00', endTime: '10:00' });

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getClassSchedule();
      setData(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (error) {
      toast.error('Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [clsRes, subRes, tcrRes] = await Promise.all([
        adminAPI.getAcademicClasses(),
        adminAPI.getSubjects(),
        adminAPI.getUsers({ role: 'teacher' })
      ]);
      setClasses(Array.isArray(clsRes.data?.data) ? clsRes.data.data : []);
      setSubjects(Array.isArray(subRes.data?.data) ? subRes.data.data : []);
      setTeachers(Array.isArray(tcrRes.data?.data) ? tcrRes.data.data : (tcrRes.data?.data?.users || []));
    } catch (error) {
      toast.error('Failed to load dependency data');
    }
  };

  useEffect(() => {
    fetchTimetable();
    fetchDependencies();
  }, []);


  const columns = [
    { header: 'Class', accessorKey: 'class', cell: (r) => {
        const cls = classes.find(c => (c._id || c.id) === (r.classId?._id || r.classId));
        return cls ? `${cls.name} ${cls.section || ''}` : (r.classId?.name || r.class || 'N/A');
      } 
    },
    { header: 'Subject', accessorKey: 'subject', cell: (r) => {
        const sub = subjects.find(s => (s._id || s.id) === (r.subjectId?._id || r.subjectId));
        return sub ? sub.name : (r.subjectId?.name || r.subject || 'N/A');
      } 
    },
    { header: 'Teacher', accessorKey: 'teacher', cell: (r) => r.teacherId ? `${r.teacherId.firstName} ${r.teacherId.lastName}` : (r.teacher || 'N/A') },
    { header: 'Day', accessorKey: 'day', cell: (r) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][r.dayOfWeek] || 'N/A' },
    { header: 'Time', accessorKey: 'time', cell: (r) => `${r.startTime} - ${r.endTime}` },
    {
      header: 'Actions', key: 'actions', sortable: false, width: '80px',
      cell: (row) => (
        <RowActions actions={[
          { label: 'Delete', danger: true, onClick: async () => {
              try {
                await adminAPI.deleteClassSchedule(row._id || row.id);
                toast.success('Schedule deleted');
                fetchTimetable();
              } catch (e) {
                console.error("Delete Error:", e);
                toast.error(e.response?.data?.message || 'Failed to delete schedule');
              }
            } 
          },
        ]} />
      ),
    },
  ];

  const handleAdd = async () => {
    if (!form.classId || !form.teacherId || !form.startTime || !form.endTime) {
      toast.error('Class, Teacher, Start Time, and End Time are required');
      return;
    }
    setSaving(true);
    try {
      await adminAPI.createClassSchedule({ ...form, dayOfWeek: Number(form.dayOfWeek) });
      toast.success('Schedule added successfully!');
      setShowAdd(false);
      setForm({ classId: '', subjectId: '', teacherId: '', dayOfWeek: '1', startTime: '09:00', endTime: '10:00' });
      fetchTimetable();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to add schedule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Timetable Management"
        subtitle="Manage class schedules and periods"
        breadcrumbs={['Home', 'Timetable']}
        actions={<Button variant="gradient" icon={Plus} onClick={() => setShowAdd(true)}>Add Schedule</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Classes" value={data.length} icon={CalendarClock} color="primary" />
        <StatCard title="Active Periods" value={data.length} icon={CalendarClock} color="success" />
      </div>

      <Card className="p-5">
        <DataTable
          data={data}
          columns={columns}
          searchable
          emptyTitle="No schedule found"
          emptyDescription="Start adding schedules for the classes."
          emptyIcon={CalendarClock}
        />
      </Card>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} size="md">
        <ModalHeader title="Add Schedule" subtitle="Create a new class period" onClose={() => setShowAdd(false)} />
        <ModalBody className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Class" required>
            <Select value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name} {c.section}</option>)}
            </Select>
          </FormField>
          <FormField label="Subject">
            <Select value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}>
              <option value="">Select Subject</option>
              {subjects.map(s => <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Teacher" required>
            <Select value={form.teacherId} onChange={e => setForm(f => ({ ...f, teacherId: e.target.value }))}>
              <option value="">Select Teacher</option>
              {teachers.map(t => <option key={t._id || t.id} value={t._id || t.id}>{t.firstName} {t.lastName}</option>)}
            </Select>
          </FormField>
          <FormField label="Day of Week" required>
            <Select value={form.dayOfWeek} onChange={e => setForm(f => ({ ...f, dayOfWeek: e.target.value }))}>
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => (
                <option key={i} value={i}>{day}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Start Time" required>
            <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
          </FormField>
          <FormField label="End Time" required>
            <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
          </FormField>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button variant="gradient" loading={saving} onClick={handleAdd}>Save Schedule</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
