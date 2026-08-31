"use client";

import { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash, Users, Edit } from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card } from '@/components/ui/index.jsx';
import { DataTable, RowActions } from '@/components/tables/DataTable.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { adminAPI } from '@/api/index.js';
import toast from 'react-hot-toast';

export default function ClassesPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  
  // Teachers and Students for dropdowns
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);

  // New Class Form State
  const [formData, setFormData] = useState({
    name: '',
    section: '',
    classTeacherId: '',
    subjectsText: ''
  });

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const [classesRes, subjectsRes] = await Promise.all([
        adminAPI.getAcademicClasses(),
        adminAPI.getSubjects()
      ]);
      const classesData = classesRes.data?.data || [];
      const subjectsData = subjectsRes.data?.data || [];
      
      const mappedClasses = classesData.map(cls => {
        const clsSubjects = subjectsData.filter(s => s.classId?._id === cls._id || s.classId === cls._id);
        return { ...cls, subjectsList: clsSubjects };
      });
      
      setData(mappedClasses);
    } catch (error) {
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const tRes = await adminAPI.getUsers({ role: 'teacher' });
      const sRes = await adminAPI.getUsers({ role: 'student' });
      setTeachers(tRes.data?.data || []);
      setStudents(sRes.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchUsers();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this class?")) return;
    try {
      await adminAPI.deleteAcademicClass(id);
      toast.success("Class deleted successfully");
      fetchClasses();
    } catch (err) {
      toast.error("Failed to delete class");
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      // Remove empty string fields to pass backend validation
      const payload = { ...formData };
      if (!payload.classTeacherId) delete payload.classTeacherId;
      if (!payload.section) delete payload.section;
      const subjectsText = payload.subjectsText;
      delete payload.subjectsText; // Don't send this to academic-classes endpoint

      const response = await adminAPI.createAcademicClass(payload);
      const createdClass = response.data?.data;

      // Create subjects if any are provided
      if (subjectsText && subjectsText.trim() && createdClass?._id) {
        const subjectsList = subjectsText.split(',').map(s => s.trim()).filter(Boolean);
        for (const subjName of subjectsList) {
          try {
            await adminAPI.createSubject({ classId: createdClass._id, name: subjName });
          } catch (subjErr) {
            console.error("Error creating subject:", subjName, subjErr);
          }
        }
      }

      toast.success("Class and subjects created successfully!");
      setShowCreateModal(false);
      setFormData({ name: '', section: '', classTeacherId: '', subjectsText: '' });
      fetchClasses();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create class");
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClass || selectedStudents.length === 0) return toast.error("Please select students");
    try {
      await adminAPI.assignUserToClass(selectedClass._id, { userIds: selectedStudents, roleInClass: 'student' });
      toast.success("Students assigned successfully!");
      setShowAssignModal(false);
      setSelectedStudents([]);
      fetchClasses();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign students");
    }
  };

  const openAssignModal = (row) => {
    setSelectedClass(row);
    // pre-select already assigned students
    setSelectedStudents(row.students?.map(s => s._id || s) || []);
    setShowAssignModal(true);
  };

  const toggleStudent = (id) => {
    if (selectedStudents.includes(id)) {
      setSelectedStudents(selectedStudents.filter(s => s !== id));
    } else {
      setSelectedStudents([...selectedStudents, id]);
    }
  };

  const columns = [
    { header: 'Class Name', cell: (row) => `${row.name} ${row.section ? `- ${row.section}` : ''}` },
    { header: 'Subjects', cell: (row) => row.subjectsList?.length > 0 ? (
      <div className="flex flex-wrap gap-1">
        {row.subjectsList.map(s => (
          <span key={s._id} className="bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 rounded text-xs">
            {s.name}
          </span>
        ))}
      </div>
    ) : <span className="text-surface-400 text-sm">None</span> },
    { header: 'Teacher', cell: (row) => row.classTeacherId ? `${row.classTeacherId.firstName} ${row.classTeacherId.lastName}` : 'Unassigned' },
    { header: 'Students', cell: (row) => row.students?.length || 0 },
    {
      header: 'Actions',
      cell: (row) => {
        const actions = [
          {
            icon: Users,
            label: 'Assign Students',
            onClick: () => openAssignModal(row)
          },
          {
            icon: Trash,
            label: 'Delete',
            onClick: () => handleDelete(row._id)
          }
        ];
        return <RowActions actions={actions} />;
      }
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Academic Classes"
        subtitle="Manage your classes and sections"
        breadcrumbs={['Home', 'Classes']}
        actions={
          <Button variant="gradient" icon={Plus} onClick={() => setShowCreateModal(true)}>
            Create Class
          </Button>
        }
      />

      <Card className="p-5">
        <DataTable
          data={data}
          columns={columns}
          searchable
          emptyTitle="No classes found"
          emptyDescription="Start by creating an academic class."
          emptyIcon={BookOpen}
        />
      </Card>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create Academic Class</h2>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Class Name (e.g. Class 10)</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded-lg bg-surface-50 dark:bg-surface-900 border-surface-200 dark:border-surface-700" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Section (Optional)</label>
                <input value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} className="w-full p-2 border rounded-lg bg-surface-50 dark:bg-surface-900 border-surface-200 dark:border-surface-700" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Class Teacher (Optional)</label>
                <select value={formData.classTeacherId} onChange={e => setFormData({...formData, classTeacherId: e.target.value})} className="w-full p-2 border rounded-lg bg-surface-50 dark:bg-surface-900 border-surface-200 dark:border-surface-700">
                  <option value="">-- Select Teacher --</option>
                  {teachers.map(t => (
                    <option key={t._id} value={t._id}>{t.firstName} {t.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subjects (Optional)</label>
                <input 
                  value={formData.subjectsText || ''} 
                  onChange={e => setFormData({...formData, subjectsText: e.target.value})} 
                  placeholder="Maths, Science, English..." 
                  className="w-full p-2 border rounded-lg bg-surface-50 dark:bg-surface-900 border-surface-200 dark:border-surface-700" 
                />
                <p className="text-xs text-surface-500 mt-1">Separate multiple subjects with a comma.</p>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedClass && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] flex flex-col">
            <h2 className="text-xl font-bold mb-4">Assign Students to {selectedClass.name} {selectedClass.section}</h2>
            
            <div className="flex-1 overflow-y-auto mb-4 border border-surface-200 dark:border-surface-700 rounded-lg p-2">
              {students.length === 0 ? (
                <p className="text-center text-surface-500 py-4">No students available in the system.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {students.map(student => (
                    <label key={student._id} className="flex items-center gap-3 p-2 hover:bg-surface-50 dark:hover:bg-surface-900 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedStudents.includes(student._id)}
                        onChange={() => toggleStudent(student._id)}
                        className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{student.firstName} {student.lastName}</span>
                        <span className="text-xs text-surface-500">{student.email}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="text-sm text-surface-500">
                {selectedStudents.length} selected
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setShowAssignModal(false)}>Cancel</Button>
                <Button type="button" variant="primary" onClick={handleAssignSubmit}>Save Assignments</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
