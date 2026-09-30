"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Pencil, 
  Search, 
  BookOpen, 
  Mail, 
  Phone, 
  Lock, 
  Check, 
  X, 
  Filter, 
  RefreshCw, 
  GraduationCap, 
  Briefcase,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';
import { useDeveloperStore } from '@/store';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card } from '@/components/ui/index.jsx';
import { DataTable } from '@/components/tables/DataTable.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { adminAPI } from '@/api/index.js';
import toast from 'react-hot-toast';

export default function TeachersPage() {
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const { isDeveloperMode } = useDeveloperStore();

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('ALL');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    selectedCourses: [] as string[],
    subject: ''
  });

  // Modal internal search for course assignment
  const [modalCourseSearch, setModalCourseSearch] = useState('');

  // Fetch Teachers
  const fetchTeachers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getUsers({ role: 'teacher' });
      const teacherList = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setTeachers(teacherList);
    } catch (error) {
      toast.error('Failed to load teachers');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Courses
  const fetchCourses = useCallback(async () => {
    try {
      setCoursesLoading(true);
      const res = await adminAPI.getCourses();
      const courseList = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setCourses(courseList);
    } catch (error) {
      console.error('Failed to load courses', error);
    } finally {
      setCoursesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
    fetchCourses();
  }, [fetchTeachers, fetchCourses]);

  // Helper to reliably compute assigned courses for a teacher (combining API response and course faculties)
  const getTeacherAssignedCourses = useCallback((teacher: any) => {
    if (!teacher) return [];
    const courseMap = new Map<string, any>();
    const teacherIdStr = (teacher._id || teacher.id)?.toString();

    // 1. From teacher.assignedCourses if populated by backend
    if (Array.isArray(teacher?.assignedCourses)) {
      teacher.assignedCourses.forEach((c: any) => {
        const cId = (c?._id || c?.id || c)?.toString();
        if (cId) {
          courseMap.set(cId, {
            _id: cId,
            name: c.name || 'Course',
            tag: c.tag,
            targetExam: c.targetExam,
            color: c.color
          });
        }
      });
    }

    // 2. Client-side cross-reference from loaded courses list
    if (Array.isArray(courses) && teacherIdStr) {
      courses.forEach((c: any) => {
        const cId = (c?._id || c?.id)?.toString();
        if (Array.isArray(c.faculties)) {
          const isFaculty = c.faculties.some((f: any) => {
            const fId = (typeof f === 'object' && f !== null ? (f._id || f.id) : f)?.toString();
            return fId === teacherIdStr;
          });
          if (isFaculty && cId) {
            courseMap.set(cId, {
              _id: cId,
              name: c.name,
              tag: c.tag,
              targetExam: c.targetExam,
              color: c.color
            });
          }
        }
      });
    }

    return Array.from(courseMap.values());
  }, [courses]);

  // Open Delete Confirmation Modal
  const handleOpenDeleteModal = (teacher: any) => {
    setTeacherToDelete(teacher);
    setShowDeleteModal(true);
  };

  // Confirm and Execute Delete
  const handleConfirmDelete = async () => {
    if (!teacherToDelete) return;
    try {
      setDeleteLoading(true);
      await adminAPI.deleteUser(teacherToDelete._id);
      toast.success(`${teacherToDelete.firstName || 'Teacher'} moved to Recycle Bin`);
      setShowDeleteModal(false);
      setTeacherToDelete(null);
      await Promise.all([fetchTeachers(), fetchCourses()]);
    } catch (err) {
      toast.error("Failed to delete teacher");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Open Edit Modal with pre-filled data
  const handleOpenEdit = (teacher: any) => {
    setSelectedTeacher(teacher);
    const assigned = getTeacherAssignedCourses(teacher);
    const assignedCourseIds = assigned.map(c => c._id.toString());

    setFormData({
      firstName: teacher.firstName || '',
      lastName: teacher.lastName || '',
      email: teacher.email || '',
      phone: teacher.phone || '',
      password: '', // Leave blank by default so existing password is kept
      selectedCourses: assignedCourseIds,
      subject: teacher.metadata?.subject || ''
    });
    setModalCourseSearch('');
    setShowEditModal(true);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      selectedCourses: [],
      subject: ''
    });
    setModalCourseSearch('');
    setShowCreateModal(true);
  };

  // Submit Create Teacher & assign selected courses
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFormLoading(true);
      const selectedCourseIds = formData.selectedCourses.map(id => id.toString());

      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password.trim(),
        role: 'teacher',
        courses: selectedCourseIds,
        metadata: {
          subject: formData.subject.trim()
        }
      };

      const res = await adminAPI.createUser(payload);
      const createdUser = res.data?.data || res.data;
      const newTeacherId = (createdUser?._id || createdUser?.id)?.toString();

      // Sync faculties on each course directly
      if (newTeacherId && selectedCourseIds.length > 0) {
        const courseUpdates = courses
          .filter(c => selectedCourseIds.includes(c._id.toString()))
          .map(async (course) => {
            const currentFacultyIds = (course.faculties || []).map((f: any) => (f?._id || f.id || f).toString());
            if (!currentFacultyIds.includes(newTeacherId)) {
              return adminAPI.updateCourse(course._id, { faculties: [...currentFacultyIds, newTeacherId] });
            }
            return null;
          });
        await Promise.all(courseUpdates.filter(Boolean));
      }

      toast.success("Teacher created and assigned to courses successfully!");
      setShowCreateModal(false);
      await Promise.all([fetchTeachers(), fetchCourses()]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create teacher");
    } finally {
      setFormLoading(false);
    }
  };

  // Submit Edit Teacher & sync courses
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) return;
    try {
      setFormLoading(true);
      const teacherId = (selectedTeacher._id || selectedTeacher.id).toString();
      const newSelectedCourseIds = formData.selectedCourses.map(id => id.toString());

      const payload: any = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        courses: newSelectedCourseIds,
        metadata: {
          ...(selectedTeacher.metadata || {}),
          subject: formData.subject.trim()
        }
      };

      if (formData.password && formData.password.trim()) {
        payload.password = formData.password.trim();
      }

      // 1. Update user profile
      await adminAPI.updateUser(teacherId, payload);

      // 2. Direct course faculties synchronization
      const courseSyncPromises = courses.map(async (course) => {
        const courseIdStr = (course._id || course.id).toString();
        const currentFacultyIds = (course.faculties || []).map((f: any) => (f?._id || f.id || f).toString());
        const shouldBeAssigned = newSelectedCourseIds.includes(courseIdStr);
        const isCurrentlyAssigned = currentFacultyIds.includes(teacherId);

        if (shouldBeAssigned && !isCurrentlyAssigned) {
          // Add teacher to course faculties
          const updatedFaculties = [...currentFacultyIds, teacherId];
          return adminAPI.updateCourse(course._id, { faculties: updatedFaculties });
        } else if (!shouldBeAssigned && isCurrentlyAssigned) {
          // Remove teacher from course faculties
          const updatedFaculties = currentFacultyIds.filter((id: string) => id !== teacherId);
          return adminAPI.updateCourse(course._id, { faculties: updatedFaculties });
        }
        return null;
      });

      await Promise.all(courseSyncPromises.filter(Boolean));

      toast.success("Teacher details and assigned courses updated successfully!");
      setShowEditModal(false);
      await Promise.all([fetchTeachers(), fetchCourses()]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update teacher");
    } finally {
      setFormLoading(false);
    }
  };

  // Course selection toggle helper in modals
  const toggleCourseSelection = (courseId: string) => {
    const idStr = courseId.toString();
    setFormData(prev => {
      const exists = prev.selectedCourses.includes(idStr);
      return {
        ...prev,
        selectedCourses: exists
          ? prev.selectedCourses.filter(id => id !== idStr)
          : [...prev.selectedCourses, idStr]
      };
    });
  };

  const selectAllCourses = () => {
    setFormData(prev => ({
      ...prev,
      selectedCourses: courses.map(c => (c._id || c.id).toString())
    }));
  };

  const clearAllCourses = () => {
    setFormData(prev => ({
      ...prev,
      selectedCourses: []
    }));
  };

  // Filter & Search Logic
  const filteredTeachers = useMemo(() => {
    return teachers.filter(teacher => {
      const assignedCoursesList = getTeacherAssignedCourses(teacher);

      // 1. Search Query Match: name, email, mobile phone, or assigned course name
      const q = searchQuery.trim().toLowerCase();
      const fullName = `${teacher.firstName || ''} ${teacher.lastName || ''}`.toLowerCase();
      const email = (teacher.email || '').toLowerCase();
      const phone = (teacher.phone || '').toLowerCase();
      
      const matchesCourseName = assignedCoursesList.some((c: any) => 
        (c.name || '').toLowerCase().includes(q) || (c.tag || '').toLowerCase().includes(q)
      );

      const matchesSearch = !q || 
        fullName.includes(q) || 
        email.includes(q) || 
        phone.includes(q) || 
        matchesCourseName;

      if (!matchesSearch) return false;

      // 2. Course Filter Dropdown Match
      if (courseFilter === 'ALL') return true;
      if (courseFilter === 'UNASSIGNED') return assignedCoursesList.length === 0;

      // Check if teacher is assigned to the selected course ID
      const hasCourse = assignedCoursesList.some((c: any) => c._id.toString() === courseFilter.toString());
      return hasCourse;
    });
  }, [teachers, searchQuery, courseFilter, getTeacherAssignedCourses]);

  // Filtered courses in modal search
  const filteredModalCourses = useMemo(() => {
    if (!modalCourseSearch.trim()) return courses;
    const q = modalCourseSearch.toLowerCase();
    return courses.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.targetExam || '').toLowerCase().includes(q) ||
      (c.tag || '').toLowerCase().includes(q)
    );
  }, [courses, modalCourseSearch]);

  // Table Columns Definition
  const columns = [
    {
      header: 'Teacher',
      cell: (row: any) => {
        const initials = `${row.firstName?.[0] || ''}${row.lastName?.[0] || ''}`.toUpperCase() || 'T';
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-indigo-700 text-white font-bold flex items-center justify-center text-sm shadow-sm flex-shrink-0">
              {initials}
            </div>
            <div>
              <div className="font-semibold text-gray-900 dark:text-surface-100 flex items-center gap-1.5">
                <span>{row.firstName} {row.lastName}</span>
                {row.metadata?.subject && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {row.metadata.subject}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">Faculty ID: {row._id ? row._id.slice(-6) : '—'}</p>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Email',
      cell: (row: any) => (
        <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-surface-300">
          <Mail size={13} className="text-gray-400 flex-shrink-0" />
          <span className="truncate max-w-[200px]" title={row.email}>{row.email || '—'}</span>
        </div>
      )
    },
    {
      header: 'Mobile No',
      cell: (row: any) => (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800 dark:text-surface-200">
          <Phone size={13} className="text-gray-400 flex-shrink-0" />
          <span>{row.phone || '—'}</span>
        </div>
      )
    },
    {
      header: 'Assigned Courses',
      cell: (row: any) => {
        const assigned = getTeacherAssignedCourses(row);
        if (assigned.length === 0) {
          return (
            <button
              onClick={() => handleOpenEdit(row)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-500 bg-gray-50 hover:bg-primary-50 hover:text-primary-600 border border-gray-200 dark:border-surface-700 dark:bg-surface-800 transition-colors"
            >
              <Plus size={12} /> Assign Course
            </button>
          );
        }

        return (
          <div className="flex flex-wrap items-center gap-1.5 max-w-md">
            {assigned.slice(0, 2).map((course: any) => (
              <span
                key={course._id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800 shadow-2xs"
                title={course.name}
              >
                <BookOpen size={11} className="text-indigo-500 flex-shrink-0" />
                <span className="truncate max-w-[130px]">{course.name}</span>
              </span>
            ))}
            {assigned.length > 2 && (
              <button
                onClick={() => handleOpenEdit(row)}
                className="px-2 py-1 rounded-lg text-[11px] font-bold bg-gray-100 dark:bg-surface-800 text-gray-700 dark:text-surface-300 hover:bg-gray-200 transition-colors"
                title={assigned.slice(2).map((c: any) => c.name).join(', ')}
              >
                +{assigned.length - 2} more
              </button>
            )}
          </div>
        );
      }
    },
    {
      header: 'Actions',
      cell: (row: any) => {
        return (
          <div className="flex items-center gap-1.5">
            {/* Direct Edit Button */}
            <button
              onClick={() => handleOpenEdit(row)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60 rounded-xl transition-all border border-blue-100 dark:border-blue-900/50"
              title="Edit Teacher Details & Courses"
            >
              <Pencil size={13} />
              <span>Edit</span>
            </button>

            {/* Direct Delete Button */}
            <button
              onClick={() => handleOpenDeleteModal(row)}
              className="p-1.5 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/60 rounded-xl transition-all border border-red-100 dark:border-red-900/50"
              title="Delete Teacher"
            >
              <Trash2 size={14} />
            </button>
          </div>
        );
      }
    }
  ];

  // Quick Stats
  const totalTeachers = teachers.length;
  const assignedTeachersCount = teachers.filter(t => getTeacherAssignedCourses(t).length > 0).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Teachers & Faculty"
        subtitle="Manage teacher profiles, contact information, and course assignments"
        breadcrumbs={['Home', 'Teachers']}
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => { fetchTeachers(); fetchCourses(); }}
              title="Refresh List"
              className="p-2.5 rounded-xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-gray-600 dark:text-surface-300 hover:bg-gray-50 transition-all"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <Button variant="gradient" icon={Plus} onClick={handleOpenCreate}>
              Add Teacher
            </Button>
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-surface-800 p-4 rounded-2xl border border-gray-100 dark:border-surface-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Teachers</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{totalTeachers}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Users size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-surface-800 p-4 rounded-2xl border border-gray-100 dark:border-surface-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Assigned to Courses</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{assignedTeachersCount}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <GraduationCap size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-surface-800 p-4 rounded-2xl border border-gray-100 dark:border-surface-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Courses</p>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{courses.length}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <BookOpen size={22} />
          </div>
        </div>
      </div>

      {/* Main Table Card with Search & Course Filter */}
      <Card className="p-5 space-y-4">
        {/* Custom Toolbar with Multi-Field Search and Course Dropdown Filter */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
          {/* Working Search Bar: Mobile No, Name, or Email */}
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Mobile No, Name, or Email..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-surface-700 bg-gray-50/50 dark:bg-surface-900 focus:bg-white dark:focus:bg-surface-800 focus:outline-none focus:border-primary-500 transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Option: Course List */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex items-center">
              <Filter size={14} className="absolute left-3 text-gray-400 pointer-events-none" />
              <select
                value={courseFilter}
                onChange={e => setCourseFilter(e.target.value)}
                className="pl-8 pr-8 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-gray-800 dark:text-surface-200 focus:outline-none focus:border-primary-500 appearance-none cursor-pointer"
              >
                <option value="ALL">All Courses ({courses.length})</option>
                <option value="UNASSIGNED">Unassigned Teachers</option>
                {courses.map(course => (
                  <option key={course._id} value={course._id}>
                    Course: {course.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 text-gray-400 pointer-events-none" />
            </div>

            {(searchQuery || courseFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCourseFilter('ALL');
                }}
                className="px-3 py-2 text-xs font-semibold text-primary-600 hover:bg-primary-50 dark:hover:bg-surface-800 rounded-xl transition-colors"
              >
                Reset Filters
              </button>
            )}

            <div className="text-xs text-gray-400 font-medium px-2 py-1 bg-gray-50 dark:bg-surface-900 rounded-lg">
              Showing <span className="font-bold text-gray-700 dark:text-surface-200">{filteredTeachers.length}</span> of {totalTeachers}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          data={filteredTeachers}
          columns={columns}
          loading={loading}
          searchable={false}
          emptyTitle="No teachers found"
          emptyDescription={
            searchQuery || courseFilter !== 'ALL'
              ? 'No teachers match your search criteria or course filter. Try clearing filters.'
              : 'Start by adding teachers to the institute.'
          }
          emptyIcon={Briefcase}
        />
      </Card>

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && teacherToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-gray-100 dark:border-surface-700 text-center animate-scale-in">
            <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-100 dark:border-red-900/50">
              <AlertTriangle size={26} />
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1.5">Delete Teacher?</h3>
            <p className="text-xs text-gray-500 dark:text-surface-300 mb-6 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-gray-800 dark:text-white">"{teacherToDelete.firstName} {teacherToDelete.lastName}"</span>? This record will be moved to the Recycle Bin.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setTeacherToDelete(null); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-surface-700 text-gray-700 dark:text-surface-200 text-xs font-bold hover:bg-gray-50 dark:hover:bg-surface-700 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md shadow-red-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {deleteLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE TEACHER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-surface-800 rounded-3xl w-full max-w-xl shadow-2xl border border-gray-100 dark:border-surface-700 overflow-hidden my-8">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-surface-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">Add New Teacher</h2>
                <p className="text-xs text-gray-500 mt-0.5">Enter teacher credentials and assign courses</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-surface-200 rounded-xl hover:bg-gray-100 dark:hover:bg-surface-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-surface-300 uppercase tracking-wider mb-1.5">First Name *</label>
                  <input
                    required
                    type="text"
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="e.g. Ramesh"
                    className="w-full p-2.5 text-sm rounded-xl border border-gray-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-gray-800 dark:text-surface-100 focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-surface-300 uppercase tracking-wider mb-1.5">Last Name *</label>
                  <input
                    required
                    type="text"
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="e.g. Sharma"
                    className="w-full p-2.5 text-sm rounded-xl border border-gray-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-gray-800 dark:text-surface-100 focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-surface-300 uppercase tracking-wider mb-1.5">Email Address *</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="teacher@arke.com"
                      className="w-full pl-9 pr-3 p-2.5 text-sm rounded-xl border border-gray-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-gray-800 dark:text-surface-100 focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-surface-300 uppercase tracking-wider mb-1.5">Mobile / Phone No *</label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      required
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="9876543210"
                      className="w-full pl-9 pr-3 p-2.5 text-sm rounded-xl border border-gray-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-gray-800 dark:text-surface-100 focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-surface-300 uppercase tracking-wider mb-1.5">Password *</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      required
                      type="password"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Min 6 characters"
                      className="w-full pl-9 pr-3 p-2.5 text-sm rounded-xl border border-gray-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-gray-800 dark:text-surface-100 focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-surface-300 uppercase tracking-wider mb-1.5">Subject / Specialization</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g. Physics, Organic Chemistry"
                    className="w-full p-2.5 text-sm rounded-xl border border-gray-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-gray-800 dark:text-surface-100 focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Course Assignment Section */}
              <div className="pt-2 border-t border-gray-100 dark:border-surface-700">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-xs font-bold text-gray-800 dark:text-surface-200 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen size={14} className="text-primary-600" /> Assign Courses ({formData.selectedCourses.length})
                    </label>
                    <p className="text-[11px] text-gray-400">Select the courses this teacher will conduct</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllCourses}
                      className="text-[11px] text-primary-600 hover:underline font-semibold"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={clearAllCourses}
                      className="text-[11px] text-gray-500 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Course Search */}
                <div className="relative mb-2">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={modalCourseSearch}
                    onChange={e => setModalCourseSearch(e.target.value)}
                    placeholder="Search courses..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-900"
                  />
                </div>

                {/* Course Checkboxes Grid */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-gray-100 dark:border-surface-700 rounded-xl p-2 bg-gray-50/50 dark:bg-surface-900/50">
                  {coursesLoading ? (
                    <p className="text-xs text-center py-4 text-gray-400">Loading courses...</p>
                  ) : filteredModalCourses.length === 0 ? (
                    <p className="text-xs text-center py-4 text-gray-400">No courses found.</p>
                  ) : (
                    filteredModalCourses.map(course => {
                      const courseIdStr = (course._id || course.id).toString();
                      const isSelected = formData.selectedCourses.includes(courseIdStr);
                      return (
                        <div
                          key={courseIdStr}
                          onClick={() => toggleCourseSelection(courseIdStr)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all select-none ${
                            isSelected
                              ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-400 dark:border-primary-600 text-primary-900 dark:text-primary-200 font-semibold shadow-2xs'
                              : 'bg-white dark:bg-surface-800 border-gray-200 dark:border-surface-700 text-gray-700 dark:text-surface-300 hover:bg-gray-50 dark:hover:bg-surface-750'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                              isSelected ? 'bg-primary-600 border-primary-600 text-white shadow-2xs' : 'border-gray-300 dark:border-surface-600 bg-white dark:bg-surface-700'
                            }`}>
                              {isSelected && <Check size={11} strokeWidth={3} />}
                            </div>
                            <span className="truncate">{course.name}</span>
                          </div>
                          {course.targetExam && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-surface-700 text-gray-600 dark:text-surface-300 uppercase font-bold flex-shrink-0">
                              {course.targetExam}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-surface-700">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="gradient" disabled={formLoading}>
                  {formLoading ? 'Creating...' : 'Create Teacher'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TEACHER MODAL */}
      {showEditModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-surface-800 rounded-3xl w-full max-w-xl shadow-2xl border border-gray-100 dark:border-surface-700 overflow-hidden my-8">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-surface-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">Edit Teacher Details</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Update name, contact info, password, and course assignments for <span className="font-bold text-gray-700 dark:text-surface-200">{selectedTeacher.firstName} {selectedTeacher.lastName}</span>
                </p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-surface-200 rounded-xl hover:bg-gray-100 dark:hover:bg-surface-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-surface-300 uppercase tracking-wider mb-1.5">First Name *</label>
                  <input
                    required
                    type="text"
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full p-2.5 text-sm rounded-xl border border-gray-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-gray-800 dark:text-surface-100 focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-surface-300 uppercase tracking-wider mb-1.5">Last Name *</label>
                  <input
                    required
                    type="text"
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full p-2.5 text-sm rounded-xl border border-gray-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-gray-800 dark:text-surface-100 focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-surface-300 uppercase tracking-wider mb-1.5">Email Address *</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-9 pr-3 p-2.5 text-sm rounded-xl border border-gray-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-gray-800 dark:text-surface-100 focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-surface-300 uppercase tracking-wider mb-1.5">Mobile / Phone No *</label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      required
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-9 pr-3 p-2.5 text-sm rounded-xl border border-gray-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-gray-800 dark:text-surface-100 focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-surface-300 uppercase tracking-wider mb-1.5">
                    New Password <span className="text-[10px] lowercase font-normal text-gray-400">(leave blank to keep current)</span>
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 p-2.5 text-sm rounded-xl border border-gray-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-gray-800 dark:text-surface-100 focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-surface-300 uppercase tracking-wider mb-1.5">Subject / Specialization</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g. Physics, Mathematics"
                    className="w-full p-2.5 text-sm rounded-xl border border-gray-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-gray-800 dark:text-surface-100 focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Course Assignment Section */}
              <div className="pt-2 border-t border-gray-100 dark:border-surface-700">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-xs font-bold text-gray-800 dark:text-surface-200 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen size={14} className="text-primary-600" /> Assigned Courses ({formData.selectedCourses.length})
                    </label>
                    <p className="text-[11px] text-gray-400">Select which courses are assigned to this teacher</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllCourses}
                      className="text-[11px] text-primary-600 hover:underline font-semibold"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={clearAllCourses}
                      className="text-[11px] text-gray-500 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Course Search in Modal */}
                <div className="relative mb-2">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={modalCourseSearch}
                    onChange={e => setModalCourseSearch(e.target.value)}
                    placeholder="Search courses..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-900"
                  />
                </div>

                {/* Course Checkboxes Grid */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-gray-100 dark:border-surface-700 rounded-xl p-2 bg-gray-50/50 dark:bg-surface-900/50">
                  {coursesLoading ? (
                    <p className="text-xs text-center py-4 text-gray-400">Loading courses...</p>
                  ) : filteredModalCourses.length === 0 ? (
                    <p className="text-xs text-center py-4 text-gray-400">No courses found.</p>
                  ) : (
                    filteredModalCourses.map(course => {
                      const courseIdStr = (course._id || course.id).toString();
                      const isSelected = formData.selectedCourses.includes(courseIdStr);
                      return (
                        <div
                          key={courseIdStr}
                          onClick={() => toggleCourseSelection(courseIdStr)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all select-none ${
                            isSelected
                              ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-400 dark:border-primary-600 text-primary-900 dark:text-primary-200 font-semibold shadow-2xs'
                              : 'bg-white dark:bg-surface-800 border-gray-200 dark:border-surface-700 text-gray-700 dark:text-surface-300 hover:bg-gray-50 dark:hover:bg-surface-750'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                              isSelected ? 'bg-primary-600 border-primary-600 text-white shadow-2xs' : 'border-gray-300 dark:border-surface-600 bg-white dark:bg-surface-700'
                            }`}>
                              {isSelected && <Check size={11} strokeWidth={3} />}
                            </div>
                            <span className="truncate">{course.name}</span>
                          </div>
                          {course.targetExam && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-surface-700 text-gray-600 dark:text-surface-300 uppercase font-bold flex-shrink-0">
                              {course.targetExam}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-surface-700">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="gradient" disabled={formLoading}>
                  {formLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
