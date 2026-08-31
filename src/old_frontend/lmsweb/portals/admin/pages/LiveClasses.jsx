import { useState, useEffect } from 'react';
import { Video, Plus, Clock } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card, StatCard } from '../../../components/ui/index.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/modals/index.jsx';
import { FormField, Input, Select } from '../../../components/forms/index.jsx';
import { adminAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/index.js';

export default function LiveClasses() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [schedules, setSchedules] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [form, setForm] = useState({ 
    classScheduleId: '', 
    platform: 'zoom',
    meetingLink: '', 
    meetingPassword: '' 
  });

  const fetchLiveClasses = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getLiveClasses();
      setData(res.data?.data || []);
    } catch (error) {
      toast.error('Failed to load live classes');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [schedRes, classRes, subRes, teachRes] = await Promise.all([
        adminAPI.getClassSchedule(),
        adminAPI.getAcademicClasses(),
        adminAPI.getSubjects(),
        adminAPI.getUsers({ role: 'TEACHER' })
      ]);
      setSchedules(Array.isArray(schedRes.data?.data) ? schedRes.data.data : []);
      setClassesList(Array.isArray(classRes.data?.data) ? classRes.data.data : []);
      setSubjectsList(Array.isArray(subRes.data?.data) ? subRes.data.data : []);
      setTeachersList(Array.isArray(teachRes.data?.data) ? teachRes.data.data : []);
    } catch (e) {
      toast.error('Failed to load dependencies');
    }
  };

  useEffect(() => {
    fetchLiveClasses();
    fetchDependencies();
  }, []);

  const columns = [
    { 
      header: 'Class/Topic', 
      accessorKey: 'topic', 
      cell: (r) => {
        const schedId = typeof r.classScheduleId === 'object' && r.classScheduleId !== null ? (r.classScheduleId._id || r.classScheduleId.id) : r.classScheduleId;
        const sched = schedules.find(s => s._id === schedId || s.id === schedId);
        const actualSched = sched || r.classScheduleId;
        
        if (actualSched?.classId) {
          const cId = typeof actualSched.classId === 'object' && actualSched.classId !== null ? (actualSched.classId._id || actualSched.classId.id) : actualSched.classId;
          const sId = typeof actualSched.subjectId === 'object' && actualSched.subjectId !== null ? (actualSched.subjectId._id || actualSched.subjectId.id) : actualSched.subjectId;
          const cls = classesList.find(c => c._id === cId || c.id === cId) || actualSched.classId;
          const sub = subjectsList.find(s => s._id === sId || s.id === sId) || actualSched.subjectId;
          return `${cls?.name || 'Class'} ${cls?.section || ''} - ${sub?.name || 'Subject'}`;
        }
        return 'Extra Class';
      }
    },
    { 
      header: 'Teacher', 
      accessorKey: 'teacher', 
      cell: (r) => {
        const schedId = typeof r.classScheduleId === 'object' && r.classScheduleId !== null ? (r.classScheduleId._id || r.classScheduleId.id) : r.classScheduleId;
        const sched = schedules.find(s => s._id === schedId || s.id === schedId);
        const actualSched = sched || r.classScheduleId;
        
        let teacher = null;
        if (actualSched?.teacherId) {
          const tId = typeof actualSched.teacherId === 'object' && actualSched.teacherId !== null ? (actualSched.teacherId._id || actualSched.teacherId.id) : actualSched.teacherId;
          teacher = teachersList.find(t => t._id === tId || t.id === tId) || actualSched.teacherId;
        } else if (r.teacherId) {
          const tId = typeof r.teacherId === 'object' && r.teacherId !== null ? (r.teacherId._id || r.teacherId.id) : r.teacherId;
          teacher = teachersList.find(t => t._id === tId || t.id === tId) || r.teacherId;
        }
        return teacher?.firstName ? `${teacher.firstName || ''} ${teacher.lastName || ''}` : 'N/A';
      } 
    },
    { 
      header: 'Meeting Link', 
      accessorKey: 'meetingLink', 
      cell: (r) => {
        const isHost = user?.role === 'super_admin' || user?.role === 'admin_acadops' || user?.role === 'admin-acadops' || user?.role === 'teacher';
        const url = (isHost && r.startUrl) ? r.startUrl : r.meetingLink;
        const label = (isHost && r.startUrl) ? 'Start Class (Host)' : 'Join Class';
        return <a href={url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">{label}</a>;
      } 
    },
    { header: 'Status', accessorKey: 'status', cell: (r) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        r.status === 'ONGOING' ? 'bg-success-100 text-success-700' : 
        r.status === 'COMPLETED' ? 'bg-surface-100 text-surface-700' : 
        'bg-warning-100 text-warning-700'
      }`}>{r.status}</span>
    )},
    {
      header: 'Actions',
      cell: (r) => (
        r.status !== 'COMPLETED' && (
          <Button 
            variant="outline" 
            size="sm" 
            className="text-danger border-danger hover:bg-danger-50"
            onClick={() => handleEndClass(r._id || r.id)}
          >
            End Class
          </Button>
        )
      )
    }
  ];

  const handleEndClass = async (id) => {
    if (!window.confirm('Are you sure you want to end this live class?')) return;
    try {
      await adminAPI.endLiveClass(id, {});
      toast.success('Live class ended');
      fetchLiveClasses();
    } catch (err) {
      toast.error('Failed to end live class');
    }
  };

  const handleAdd = async () => {
    if (!form.classScheduleId) {
      toast.error('Class Schedule is required');
      return;
    }
    if (form.platform === 'custom' && !form.meetingLink) {
      toast.error('Meeting Link is required for custom platforms');
      return;
    }
    
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.meetingPassword) {
        delete payload.meetingPassword;
      }
      if (payload.platform === 'zoom') {
        payload.meetingLink = ''; // let backend handle it
      }
      await adminAPI.createLiveClass(payload);
      toast.success('Live class scheduled successfully!');
      setShowAdd(false);
      setForm({ classScheduleId: '', platform: 'zoom', meetingLink: '', meetingPassword: '' });
      fetchLiveClasses();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to schedule live class');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Live Classes"
        subtitle="Manage virtual classes and meetings"
        breadcrumbs={['Home', 'Live Classes']}
        actions={<Button variant="gradient" icon={Plus} onClick={() => setShowAdd(true)}>Schedule Class</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Upcoming Classes" value="0" icon={Video} color="primary" />
        <StatCard title="Total Duration" value="0 hrs" icon={Clock} color="success" />
      </div>

      <Card className="p-5">
        <DataTable
          data={data}
          columns={columns}
          searchable
          emptyTitle="No live classes scheduled"
          emptyDescription="Schedule a virtual session for students."
          emptyIcon={Video}
        />
      </Card>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} size="md">
        <ModalHeader title="Schedule Live Class" onClose={() => setShowAdd(false)} />
        <ModalBody className="space-y-4">
          <FormField label="Select Schedule" required>
            <Select value={form.classScheduleId} onChange={e => setForm(f => ({ ...f, classScheduleId: e.target.value }))}>
              <option value="">Select a timetable slot...</option>
              {schedules.map(s => {
                const day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][s.dayOfWeek];
                const cId = typeof s.classId === 'object' && s.classId !== null ? (s.classId._id || s.classId.id) : s.classId;
                const sId = typeof s.subjectId === 'object' && s.subjectId !== null ? (s.subjectId._id || s.subjectId.id) : s.subjectId;
                const tId = typeof s.teacherId === 'object' && s.teacherId !== null ? (s.teacherId._id || s.teacherId.id) : s.teacherId;

                const cls = classesList.find(c => c._id === cId || c.id === cId) || s.classId;
                const sub = subjectsList.find(x => x._id === sId || x.id === sId) || s.subjectId;
                const teacher = teachersList.find(x => x._id === tId || x.id === tId) || s.teacherId;

                const className = cls?.name ? `${cls.name} ${cls.section || ''}` : 'Class';
                const subjectName = sub?.name || 'Subject';
                const teacherName = teacher ? `(${teacher.firstName || ''} ${teacher.lastName || ''})` : '';
                const label = `${className} - ${subjectName} ${teacherName} | ${day} ${s.startTime}-${s.endTime}`;
                return <option key={s._id || s.id} value={s._id || s.id}>{label}</option>;
              })}
            </Select>
          </FormField>
          <FormField label="Platform" required>
            <Select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
              <option value="zoom">Zoom (Auto Generate)</option>
              <option value="custom">Custom Link (Google Meet, etc.)</option>
            </Select>
          </FormField>
          {form.platform === 'custom' && (
            <>
              <FormField label="Meeting Link" required>
                <Input type="url" placeholder="https://meet.google.com/..." value={form.meetingLink} onChange={e => setForm(f => ({ ...f, meetingLink: e.target.value }))} />
              </FormField>
              <FormField label="Meeting Password (Optional)">
                <Input type="text" placeholder="Passcode" value={form.meetingPassword} onChange={e => setForm(f => ({ ...f, meetingPassword: e.target.value }))} />
              </FormField>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button variant="gradient" loading={saving} onClick={handleAdd}>Schedule Class</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
