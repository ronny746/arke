import { useState, useEffect } from 'react';
import { BookOpen, Users, Clock } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { cn } from '../../../utils/helpers.js';
import { teacherAPI, adminAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';

export default function MyClasses() {
  const [schedule, setSchedule] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [schedRes, classRes, subRes] = await Promise.all([
          teacherAPI.getMyDailySchedule(),
          adminAPI.getAcademicClasses(),
          adminAPI.getSubjects(),
        ]);
        
        setSchedule(Array.isArray(schedRes.data?.data) ? schedRes.data.data : []);
        setClasses(Array.isArray(classRes.data?.data) ? classRes.data.data : []);
        setSubjects(Array.isArray(subRes.data?.data) ? subRes.data.data : []);
      } catch (err) {
        toast.error('Failed to load classes schedule');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="My Classes" subtitle="View your assigned classes and timetable" breadcrumbs={['Home', 'Classes']} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-surface-500">Loading your schedule...</p>
        ) : schedule.length === 0 ? (
          <p className="text-surface-500">No classes assigned yet.</p>
        ) : schedule.map((cls, i) => {
          const clsObj = classes.find(c => (c._id || c.id) === (cls.classId?._id || cls.classId));
          const subObj = subjects.find(s => (s._id || s.id) === (cls.subjectId?._id || cls.subjectId));
          const clsName = clsObj ? `${clsObj.name} ${clsObj.section || ''}` : 'N/A';
          const subName = subObj ? subObj.name : 'N/A';
          
          const color = [
            'from-primary to-secondary',
            'from-secondary to-pink-500',
            'from-accent to-primary',
            'from-success to-accent',
            'from-warning to-danger'
          ][i % 5];

          return (
          <Card key={cls._id || cls.id} className="overflow-hidden cursor-pointer" hover onClick={() => setSelectedClass({ ...cls, clsName, subName })}>
            <div className={cn('h-2 bg-gradient-to-r', color)} />
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg', color)}>
                  {clsObj?.name || 'Class'}
                </div>
                <span className="badge badge-primary">{subName}</span>
              </div>
              <h3 className="font-bold text-surface-800 dark:text-white">Class {clsName}</h3>
              <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">{subName}</p>
              <div className="flex items-center gap-4 mt-4 text-xs text-surface-400">
                <span className="flex items-center gap-1"><Clock size={12} />{cls.startTime} - {cls.endTime}</span>
                <span>📍 {cls.roomId || 'N/A'}</span>
              </div>
            </div>
          </Card>
          );
        })}
      </div>
      {selectedClass && (
        <Card className="p-5">
          <h3 className="font-semibold text-surface-800 dark:text-white mb-4">Class {selectedClass.clsName} — {selectedClass.subName}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Avg Attendance', value: '87%' },
              { label: 'Assignments', value: '5 active' },
              { label: 'Avg Grade', value: '74/100' },
            ].map((s, i) => (
              <div key={i} className="p-4 bg-surface-50 dark:bg-surface-700/50 rounded-xl text-center">
                <p className="text-xl font-bold text-primary">{s.value}</p>
                <p className="text-xs text-surface-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
