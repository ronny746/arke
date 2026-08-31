import { useState, useEffect } from 'react';
import { Video, Plus, Clock, Calendar } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card, StatCard } from '../../../components/ui/index.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/modals/index.jsx';
import { FormField, Input, Select } from '../../../components/forms/index.jsx';
import { teacherAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function LiveClasses() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [showAttendees, setShowAttendees] = useState(false);

  const [schedules, setSchedules] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);

  const fetchLiveClasses = async () => {
    try {
      setLoading(true);
      const res = await teacherAPI.getLiveClasses();
      setData(res.data?.data || []);
    } catch (error) {
      toast.error('Failed to load live classes');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [schedRes, classRes, subRes] = await Promise.all([
        teacherAPI.getMyDailySchedule(),
        teacherAPI.getViewAcademicClasses(),
        teacherAPI.getSubjects()
      ]);
      setSchedules(Array.isArray(schedRes.data?.data) ? schedRes.data.data : []);
      setClassesList(Array.isArray(classRes.data?.data) ? classRes.data.data : []);
      setSubjectsList(Array.isArray(subRes.data?.data) ? subRes.data.data : []);
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
          
          let displayDate = 'No date available';
          if (r.createdAt) {
            displayDate = format(new Date(r.createdAt), 'dd MMM yyyy, hh:mm a');
          } else if (actualSched.startTime) {
            displayDate = format(new Date(actualSched.startTime), 'dd MMM yyyy, hh:mm a');
          }

          return (
            <div>
              <p className="font-medium text-surface-900 dark:text-white">{cls?.name || 'Class'} {cls?.section || ''} - {sub?.name || 'Subject'}</p>
              <p className="text-xs text-surface-400 mt-1 flex items-center gap-1">
                <Calendar size={12} /> {displayDate}
              </p>
            </div>
          );
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
          teacher = actualSched.teacherId;
        } else if (r.teacherId) {
          const tId = typeof r.teacherId === 'object' && r.teacherId !== null ? (r.teacherId._id || r.teacherId.id) : r.teacherId;
          teacher = r.teacherId;
        }
        return teacher?.firstName ? `${teacher.firstName || ''} ${teacher.lastName || ''}` : 'Me';
      } 
    },
    { 
      header: 'Meeting Link', 
      accessorKey: 'meetingLink', 
      cell: (r) => {
        const url = r.startUrl ? r.startUrl : r.meetingLink;
        const label = r.startUrl ? 'Start Class (Host)' : 'Join Class';
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
        r.status !== 'COMPLETED' ? (
          <Button 
            variant="outline" 
            size="sm" 
            className="text-danger border-danger hover:bg-danger-50"
            onClick={() => handleEndClass(r._id || r.id)}
          >
            End Class
          </Button>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className="text-primary border-primary hover:bg-primary-50"
            onClick={() => {
              setSelectedClass(r);
              setShowAttendees(true);
            }}
          >
            View Attendees
          </Button>
        )
      )
    }
  ];

  const handleEndClass = async (id) => {
    if (!window.confirm('Are you sure you want to end this live class?')) return;
    try {
      await teacherAPI.endLiveClass(id, {});
      toast.success('Live class ended');
      fetchLiveClasses();
    } catch (err) {
      toast.error('Failed to end live class');
    }
  };



  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Live Classes"
        subtitle="Manage your virtual classes and meetings"
        breadcrumbs={['Home', 'Live Classes']}
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

      <Modal open={showAttendees} onClose={() => setShowAttendees(false)} size="lg">
        <ModalHeader title="Class Attendees" onClose={() => setShowAttendees(false)} />
        <ModalBody>
          {selectedClass?.participants?.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-12 font-semibold text-sm text-surface-500 border-b pb-2">
                <div className="col-span-4">Name</div>
                <div className="col-span-5">Email</div>
                <div className="col-span-3 text-right">Duration</div>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {selectedClass.participants.map((p, idx) => {
                  const durationMins = Math.round((p.duration || 0) / 60);
                  return (
                    <div key={idx} className="grid grid-cols-12 text-sm items-center py-1 border-b border-surface-100 last:border-0">
                      <div className="col-span-4 font-medium text-surface-800">{p.name || 'Unknown'}</div>
                      <div className="col-span-5 text-surface-600 truncate pr-2">{p.userEmail || 'N/A'}</div>
                      <div className="col-span-3 text-right text-success-600 font-medium">
                        {durationMins} mins
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-surface-500">
              <Video className="w-12 h-12 mx-auto text-surface-300 mb-3" />
              <p>No attendees recorded for this class.</p>
            </div>
          )}
        </ModalBody>
      </Modal>

    </div>
  );
}
