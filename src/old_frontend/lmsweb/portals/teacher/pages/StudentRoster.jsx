import { useState, useEffect } from 'react';
import { Eye, GraduationCap } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { DataTable, RowActions } from '../../../components/tables/DataTable.jsx';
import { adminAPI } from '../../../api/index.js';
import { Card, Avatar } from '../../../components/ui/index.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/modals/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';

import { getStatusBadge, cn } from '../../../utils/helpers.js';

export default function StudentRoster() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [showView, setShowView] = useState(null);
  const [classFilter, setClassFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  const fetchClasses = async () => {
    try {
      const res = await adminAPI.getAcademicClasses();
      setClasses(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      if (classes.length === 0) {
        setStudents([]);
        return;
      }
      if (classFilter !== 'all') {
        const selectedCls = classes.find(c => (c._id || c.id) === classFilter);
        const mappedStudents = (selectedCls?.students || []).map(s => ({
          ...s,
          currentClass: { name: selectedCls.name, section: selectedCls.section }
        }));
        setStudents(mappedStudents);
      } else {
        const allStudents = [];
        const seen = new Set();
        classes.forEach(c => {
          (c.students || []).forEach(s => {
            if (!seen.has(s._id || s.id)) {
              seen.add(s._id || s.id);
              allStudents.push({ ...s, currentClass: { name: c.name, section: c.section } });
            }
          });
        });
        setStudents(allStudents);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [classFilter, classes]);

  const filtered = students;

  const columns = [
    {
      header: 'Student', accessorKey: 'firstName',
      cell: (r) => {
        const name = `${r.firstName || ''} ${r.lastName || ''}`.trim();
        return (
          <div className="flex items-center gap-3">
            <Avatar name={name} size="sm" />
            <div>
              <p className="font-medium text-sm text-surface-800 dark:text-white">{name}</p>
              <p className="text-xs text-surface-400">#{r.rollNumber || r._id?.slice(-6)}</p>
            </div>
          </div>
        )
      },
    },
    { header: 'Class', accessorKey: 'class', cell: (r) => <span className="font-medium">{r.currentClass?.name || ''} {r.currentClass?.section || ''}</span> },
    {
      header: 'Attendance', accessorKey: 'attendancePercent',
      cell: (r) => {
        const p = r.attendancePercent || 100;
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-surface-200 dark:bg-surface-600 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full', p >= 75 ? 'bg-success' : 'bg-danger')} style={{ width: `${p}%` }} />
            </div>
            <span className={cn('text-xs font-medium', p >= 75 ? 'text-success-600' : 'text-danger-600')}>{p}%</span>
          </div>
        )
      },
    },
    { header: 'Fee Status', accessorKey: 'feeStatus', cell: (r) => <span className={getStatusBadge(r.feeStatus || 'paid') + ' badge capitalize'}>{r.feeStatus || 'paid'}</span> },
    { header: 'Parent', accessorKey: 'parent', cell: (r) => <div><p className="text-sm">{r.parent?.firstName || '—'}</p><p className="text-xs text-surface-400">{r.parent?.phone || '—'}</p></div> },
    {
      header: 'Actions', key: 'actions', sortable: false, width: '80px',
      cell: (row) => <RowActions actions={[{ label: 'View Details', icon: Eye, onClick: () => setShowView(row) }]} />,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Student Roster" subtitle="View all students in your classes" breadcrumbs={['Home', 'Students']} />
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setClassFilter('all')} className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-all', classFilter === 'all' ? 'bg-primary text-white' : 'bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-200')}>
          All Classes
        </button>
        {classes.map(c => (
          <button key={c._id || c.id} onClick={() => setClassFilter(c._id || c.id)} className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-all', classFilter === (c._id || c.id) ? 'bg-primary text-white' : 'bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-200')}>
            {c.name} {c.section}
          </button>
        ))}
      </div>
      <Card className="p-5">
        <DataTable data={filtered} columns={columns} searchable searchPlaceholder="Search students..." emptyTitle="No students found" emptyIcon={GraduationCap} />
      </Card>
      {showView && (
        <Modal isOpen={!!showView} onClose={() => setShowView(null)} size="md">
          <ModalHeader title="Student Details" onClose={() => setShowView(null)} />
          <ModalBody className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-surface-50 dark:bg-surface-700/50 rounded-xl">
              <Avatar name={`${showView.firstName || ''} ${showView.lastName || ''}`.trim()} size="xl" />
              <div>
                <h3 className="font-bold text-surface-800 dark:text-white">{`${showView.firstName || ''} ${showView.lastName || ''}`.trim()}</h3>
                <p className="text-sm text-surface-500">#{showView.rollNumber || showView._id?.slice(-6)} • {showView.currentClass?.name || ''} {showView.currentClass?.section || ''}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className={cn('w-16 h-1.5 bg-surface-200 rounded-full overflow-hidden')}>
                    <div className={cn('h-full rounded-full', (showView.attendancePercent || 100) >= 75 ? 'bg-success' : 'bg-danger')} style={{ width: `${showView.attendancePercent || 100}%` }} />
                  </div>
                  <span className="text-xs text-surface-500">{showView.attendancePercent || 100}% attendance</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: 'Phone', value: showView.phone },
                { label: 'Email', value: showView.email },
                { label: 'Gender', value: showView.gender },
                { label: 'Fee Status', value: showView.feeStatus || 'paid' },
                { label: 'Parent Name', value: showView.parent?.firstName },
                { label: 'Parent Phone', value: showView.parent?.phone },
              ].map((item, i) => (
                <div key={i} className="p-3 bg-surface-50 dark:bg-surface-700/50 rounded-xl">
                  <p className="text-xs text-surface-400 mb-0.5">{item.label}</p>
                  <p className="font-medium text-surface-800 dark:text-white capitalize">{item.value || '—'}</p>
                </div>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowView(null)}>Close</Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
