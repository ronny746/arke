"use client";

import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Download, 
  Upload, 
  GraduationCap, 
  ArrowRight, 
  LineChart, 
  Users, 
  BookOpen, 
  Filter, 
  Search, 
  X, 
  ChevronRight, 
  ArrowLeft, 
  Layers, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  RotateCcw,
  SlidersHorizontal,
  UserCheck,
  Building2,
  FolderOpen,
  BarChart3
} from 'lucide-react';
import { useDeveloperStore } from '@/store';
import { PageHeader } from '@/components/layout/index.jsx';
import { DataTable, RowActions } from '@/components/tables/DataTable.jsx';
import { Card, Avatar, Badge } from '@/components/ui/index.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter, DeleteModal } from '@/components/modals/index.jsx';
import { FormField, Input, Select, FileUpload } from '@/components/forms/index.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { formatDate, getStatusBadge, cn } from '@/utils/helpers.js';
import toast from 'react-hot-toast';
import { adminAPI } from '@/api/index.js';
import { useAuthStore } from '@/store/index.js';
import BatchCohortAnalysisView from '@/components/analytics/BatchCohortAnalysisView';

export default function StudentsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const canAddEdit = user?.role !== 'admin_acadops';
  const { isDeveloperMode } = useDeveloperStore();

  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Active View Mode: 'batches' (Batch cards directory) or 'all' (Master students table) or 'analysis'
  const [viewMode, setViewMode] = useState<'batches' | 'all' | 'analysis'>('batches');
  // Selected batch for drill-down ('ALL' or batchId or 'UNASSIGNED')
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [showView, setShowView] = useState<any>(null);
  const [showEdit, setShowEdit] = useState<any>(null);
  const [showPromote, setShowPromote] = useState<any>(null);
  const [showImport, setShowImport] = useState(false);
  const [showDelete, setShowDelete] = useState<any>(null);
  const [importFile, setImportFile] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Batch-level directory filters
  const [batchSearch, setBatchSearch] = useState('');
  const [batchFilterCourse, setBatchFilterCourse] = useState('');
  const [batchFilterType, setBatchFilterType] = useState('all');

  // Student-level multi-filters
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [batchAnalysis, setBatchAnalysis] = useState<any>(null);
  const [showCohortAnalysis, setShowCohortAnalysis] = useState(true);
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'roll_asc' | 'recent' | 'oldest'>('name_asc');

  const [form, setForm] = useState({ 
    firstName: '', 
    lastName: '', 
    email: '', 
    password: '', 
    dob: '', 
    phone: '', 
    status: 'active', 
    parentName: '', 
    parentPhone: '', 
    batchIds: [] as string[], 
    rollNo: '', 
    class: 'Class 10', 
    section: 'A' 
  });

  const fetchStudents = async () => {
    try {
      setFetching(true);
      const res = await adminAPI.getUsers({ role: 'student' });
      setStudents(Array.isArray(res.data?.data) ? res.data.data : (res.data?.data?.users || []));
    } catch (error) {
      toast.error('Failed to load students');
    } finally {
      setFetching(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await adminAPI.getBatches();
      setClasses(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await adminAPI.getSubjects();
      setSubjects(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    void fetchStudents();
    void fetchClasses();
    void fetchSubjects();
  }, []);

  useEffect(() => {
    if (selectedBatchId && selectedBatchId !== 'UNASSIGNED') {
      adminAPI.getBatchPerformance(selectedBatchId, filterSubject ? { subject: filterSubject } : undefined)
        .then(res => setBatchAnalysis(res.data?.data || null))
        .catch(() => setBatchAnalysis(null));
    } else {
      setBatchAnalysis(null);
    }
  }, [selectedBatchId, filterSubject]);

  // Map student IDs to batches for quick lookups
  const studentBatchMap = useMemo(() => {
    const map = new Map<string, any[]>();
    classes.forEach(cls => {
      (cls.students || []).forEach((s: any) => {
        const sId = String(s._id || s.id || s);
        const existing = map.get(sId) || [];
        existing.push(cls);
        map.set(sId, existing);
      });
    });
    return map;
  }, [classes]);

  // Derived list of unassigned students
  const unassignedStudents = useMemo(() => {
    return students.filter(s => {
      const sId = String(s._id || s.id);
      const assigned = studentBatchMap.get(sId);
      return !assigned || assigned.length === 0;
    });
  }, [students, studentBatchMap]);

  // Courses list
  const uniqueCourses = useMemo(() => {
    const courseMap = new Map<string, { _id: string; name: string }>();
    classes.forEach(cls => {
      if (cls.courseId && cls.courseId.name) {
        courseMap.set(String(cls.courseId._id || cls.courseId), {
          _id: String(cls.courseId._id || cls.courseId),
          name: cls.courseId.name
        });
      }
    });
    return Array.from(courseMap.values());
  }, [classes]);

  const uniqueClassNames = useMemo(() => {
    const set = new Set<string>();
    classes.forEach(c => { if (c.name) set.add(c.name); });
    students.forEach(s => { if (s.metadata?.class) set.add(s.metadata.class); });
    return Array.from(set).sort();
  }, [classes, students]);

  const uniqueSections = useMemo(() => {
    const set = new Set<string>();
    classes.forEach(c => { if (c.section) set.add(c.section); });
    students.forEach(s => { if (s.metadata?.section) set.add(s.metadata.section); });
    return Array.from(set).sort();
  }, [classes, students]);

  // Filtered batches for the Batch Directory view
  const filteredBatches = useMemo(() => {
    return classes.filter(cls => {
      if (batchSearch.trim()) {
        const q = batchSearch.trim().toLowerCase();
        const matchName = cls.name?.toLowerCase().includes(q);
        const matchSection = cls.section?.toLowerCase().includes(q);
        const matchCourse = cls.courseId?.name?.toLowerCase().includes(q);
        if (!matchName && !matchSection && !matchCourse) return false;
      }
      if (batchFilterCourse) {
        const cId = String(cls.courseId?._id || cls.courseId);
        if (cId !== batchFilterCourse) return false;
      }
      if (batchFilterType !== 'all') {
        if (cls.type !== batchFilterType) return false;
      }
      return true;
    });
  }, [classes, batchSearch, batchFilterCourse, batchFilterType]);

  // Active filter count calculation
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterSearch.trim()) count++;
    if (filterStatus !== 'all') count++;
    if (filterClass) count++;
    if (filterSection) count++;
    if (filterCourse) count++;
    if (filterSubject) count++;
    if (selectedBatchId && selectedBatchId !== 'ALL') count++;
    return count;
  }, [filterSearch, filterStatus, filterClass, filterSection, filterCourse, filterSubject, selectedBatchId]);

  const resetFilters = () => {
    setFilterSearch('');
    setFilterStatus('all');
    setFilterClass('');
    setFilterSection('');
    setFilterCourse('');
    setFilterSubject('');
  };

  // Currently selected batch object (if in batch drilldown)
  const currentBatchObj = useMemo(() => {
    if (!selectedBatchId || selectedBatchId === 'ALL' || selectedBatchId === 'UNASSIGNED') return null;
    return classes.find(c => String(c._id || c.id) === String(selectedBatchId)) || null;
  }, [selectedBatchId, classes]);

  // Filtered Students list with all dimensions applied
  const filteredStudents = useMemo(() => {
    let list = students.filter(s => {
      const sId = String(s._id || s.id);
      const studentBatches = studentBatchMap.get(sId) || [];

      // 1. Batch Filtering
      if (selectedBatchId === 'UNASSIGNED') {
        if (studentBatches.length > 0) return false;
      } else if (selectedBatchId && selectedBatchId !== 'ALL') {
        const inSelectedBatch = studentBatches.some(b => String(b._id || b.id) === String(selectedBatchId));
        if (!inSelectedBatch) return false;
      }

      // 2. Status Filtering
      if (filterStatus === 'active' && s.isActive === false) return false;
      if (filterStatus === 'inactive' && s.isActive !== false) return false;

      // 3. Class / Grade Filtering
      if (filterClass) {
        const matchesStudentMeta = s.metadata?.class === filterClass;
        const matchesBatchClass = studentBatches.some(b => b.name === filterClass);
        if (!matchesStudentMeta && !matchesBatchClass) return false;
      }

      // 4. Section Filtering
      if (filterSection) {
        const matchesStudentMeta = s.metadata?.section === filterSection;
        const matchesBatchSection = studentBatches.some(b => b.section === filterSection);
        if (!matchesStudentMeta && !matchesBatchSection) return false;
      }

      // 5. Course Filtering
      if (filterCourse) {
        const inCourse = studentBatches.some(b => String(b.courseId?._id || b.courseId) === filterCourse);
        if (!inCourse) return false;
      }

      // 6. Text Search Filtering
      if (filterSearch.trim()) {
        const q = filterSearch.trim().toLowerCase();
        const fullName = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
        const email = (s.email || '').toLowerCase();
        const phone = (s.phone || '').toLowerCase();
        const rollNo = (s.metadata?.rollNo || '').toLowerCase();
        const parentName = (s.metadata?.parentName || '').toLowerCase();

        const match = fullName.includes(q) || email.includes(q) || phone.includes(q) || rollNo.includes(q) || parentName.includes(q);
        if (!match) return false;
      }

      return true;
    });

    // Formatting & Sort
    const processed = list.map(s => {
      let dob = s.metadata?.dob || '';
      if (dob && dob.length === 8 && !dob.includes('-') && !dob.includes('/')) {
        dob = `${dob.substring(0, 2)}/${dob.substring(2, 4)}/${dob.substring(4)}`;
      }
      return {
        ...s,
        name: `${s.firstName || ''} ${s.lastName || ''}`.trim(),
        rollNo: s.metadata?.rollNo || '',
        dob
      };
    });

    // Sorting
    processed.sort((a, b) => {
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '');
      if (sortBy === 'roll_asc') return (a.rollNo || '').localeCompare(b.rollNo || '');
      if (sortBy === 'recent') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      return 0;
    });

    return processed;
  }, [
    students,
    studentBatchMap,
    selectedBatchId,
    filterStatus,
    filterClass,
    filterSection,
    filterCourse,
    filterSearch,
    sortBy
  ]);

  const handleToggleActive = async (student: any) => {
    try {
      setLoading(true);
      const newStatus = !student.isActive;
      await adminAPI.updateUser(student._id || student.id, { isActive: newStatus });
      toast.success(newStatus ? 'Student activated successfully' : 'Student deactivated successfully');
      fetchStudents();
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!filteredStudents || filteredStudents.length === 0) {
      toast.error('No students to export');
      return;
    }

    const headers = [
      'First Name', 'Last Name', 'Email', 'Phone', 'Roll No', 
      'Class', 'Section', 'State', 'City', 'Parent Name', 
      'Parent Phone', 'Center', 'Assigned Batches', 'Enrolled Courses', 'Status', 'Created At'
    ];

    const csvRows = [headers.join(',')];

    filteredStudents.forEach(s => {
      const studentBatches = studentBatchMap.get(String(s._id || s.id)) || [];
      const batchNames = studentBatches.map(c => `${c.name} ${c.section || ''}`.trim()).join(' | ');
      const courses = [...new Set(studentBatches.filter(c => c.courseId?.name).map(c => c.courseId.name))].join(' | ');
      const c = studentBatches[0];
      
      const row = [
        `"${s.firstName || ''}"`,
        `"${s.lastName || ''}"`,
        `"${s.email || ''}"`,
        `"${s.phone || ''}"`,
        `"${s.metadata?.rollNo || ''}"`,
        `"${c?.name || s.metadata?.class || ''}"`,
        `"${c?.section || s.metadata?.section || ''}"`,
        `"${s.metadata?.state || ''}"`,
        `"${s.metadata?.city || ''}"`,
        `"${s.metadata?.parentName || ''}"`,
        `"${s.metadata?.parentPhone || ''}"`,
        `"${s.metadata?.center || ''}"`,
        `"${batchNames || 'Unassigned'}"`,
        `"${courses || 'None'}"`,
        `"${s.isActive !== false ? 'Active' : 'Inactive'}"`,
        `"${new Date(s.createdAt).toLocaleDateString()}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const batchTag = currentBatchObj ? `_${currentBatchObj.name.replace(/\s+/g, '_')}` : '';
    link.setAttribute("download", `Students_Export${batchTag}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Students exported successfully');
  };

  const handleAdd = async () => {
    if (!form.firstName || !form.email) {
      toast.error('First Name and Email are required');
      return;
    }
    const effectivePassword = form.password || form.dob;
    if (!effectivePassword) {
      toast.error('Date of Birth (DOB) or Password is required');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName || ' ',
        email: form.email,
        password: effectivePassword,
        dob: form.dob,
        role: 'student',
        metadata: {
          status: form.status,
          dob: form.dob,
          rollNo: form.rollNo || '',
          class: form.class || 'Class 10',
          section: form.section || 'A',
          parentName: form.parentName || '',
          parentPhone: form.parentPhone || ''
        }
      };
      if (form.phone) (payload as any).phone = form.phone;

      const userRes = await adminAPI.createUser(payload);
      const newUserId = userRes.data?.data?._id || userRes.data?.data?.id;

      if (newUserId && form.batchIds && form.batchIds.length > 0) {
        try {
          await adminAPI.syncUserBatches({ studentId: newUserId, batchIds: form.batchIds });
        } catch (assignErr) {
          console.error('Failed to assign to classes', assignErr);
          toast.error('Student created but failed to assign to classes.');
        }
      }

      toast.success('Student added successfully!');
      setShowAdd(false);
      setForm({ 
        firstName: '', 
        lastName: '', 
        email: '', 
        password: '', 
        dob: '', 
        phone: '', 
        status: 'active', 
        parentName: '', 
        parentPhone: '', 
        batchIds: [], 
        rollNo: '', 
        class: 'Class 10', 
        section: 'A' 
      });
      fetchStudents();
      fetchClasses();
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to add student');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'Student', 
      accessorKey: 'name',
      cell: (r: any) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${r.firstName} ${r.lastName}`} size="sm" />
          <div>
            <p className="font-semibold text-surface-800 dark:text-white text-sm">{r.firstName} {r.lastName}</p>
            <p className="text-xs text-surface-400">{r.email || 'No email provided'}</p>
          </div>
        </div>
      ),
    },
    { 
      header: 'Roll No', 
      accessorKey: 'rollNo', 
      cell: (r: any) => <span className="text-xs font-bold text-surface-700 dark:text-surface-300 bg-surface-100 dark:bg-surface-800 px-2 py-1 rounded-lg">{r.metadata?.rollNo || '-'}</span> 
    },
    { 
      header: 'Phone', 
      accessorKey: 'phone', 
      cell: (r: any) => <span className="text-xs text-surface-600 dark:text-surface-400">{r.phone || '—'}</span> 
    },
    { 
      header: 'Class & Sec', 
      accessorKey: 'class', 
      cell: (r: any) => <span className="text-xs font-semibold text-surface-700 dark:text-surface-300">{r.metadata?.class ? `${r.metadata.class} ${r.metadata.section ? `(${r.metadata.section})` : ''}`.trim() : '—'}</span> 
    },
    { 
      header: 'Course(s)', 
      accessorKey: 'course', 
      cell: (r: any) => {
        const studentBatches = studentBatchMap.get(String(r._id || r.id)) || [];
        const courses = [...new Set(studentBatches.filter(c => c.courseId?.name).map(c => c.courseId.name))];
        return (
          <div className="flex flex-wrap gap-1">
            {courses.length > 0 ? courses.map((courseName, idx) => (
              <span key={idx} className="text-[10px] font-bold text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/50">
                {courseName}
              </span>
            )) : <span className="text-xs text-surface-400">—</span>}
          </div>
        );
      } 
    },
    { 
      header: 'Batch Assignment', 
      accessorKey: 'batch', 
      cell: (r: any) => {
        const studentBatches = studentBatchMap.get(String(r._id || r.id)) || [];
        return (
          <div className="flex flex-wrap gap-1">
            {studentBatches.length > 0 ? (
              studentBatches.map(c => (
                <button 
                  key={c._id || c.id} 
                  onClick={() => {
                    setSelectedBatchId(String(c._id || c.id));
                    setViewMode('all');
                  }}
                  className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 transition-colors"
                >
                  {c.name} {c.section ? `(${c.section})` : ''}
                </button>
              ))
            ) : (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md font-medium">Unassigned</span>
            )}
          </div>
        );
      } 
    },
    { 
      header: 'Status', 
      accessorKey: 'isActive', 
      cell: (r: any) => (
        <span className={getStatusBadge(r.isActive !== false ? 'active' : 'inactive') + ' badge capitalize text-xs'}>
          {r.isActive !== false ? 'Active' : 'Inactive'}
        </span>
      ) 
    },
    {
      header: 'Actions', 
      key: 'actions', 
      sortable: false, 
      width: '80px',
      cell: (row: any) => {
        const studentBatches = studentBatchMap.get(String(row._id || row.id)) || [];
        const baseActions = [
          { label: 'View Profile', icon: Eye, onClick: () => setShowView(row) },
          ...(canAddEdit ? [
            { 
              label: 'Edit Profile & Batches', 
              icon: Edit, 
              onClick: () => {
                setShowEdit({ ...row, batchIds: studentBatches.map(b => b._id || b.id) });
              }
            },
            { 
              label: 'Performance Analytics', 
              icon: LineChart, 
              onClick: () => {
                const queryParams = new URLSearchParams();
                if (selectedBatchId && selectedBatchId !== 'ALL') queryParams.set('batch', selectedBatchId);
                if (filterSubject) queryParams.set('subject', filterSubject);
                const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
                router.push(`/admin/students/${row._id || row.id}/performance${qs}`);
              } 
            },
            { label: 'Promote Class', icon: ArrowRight, onClick: () => setShowPromote([row.id || row._id]) },
            {
              label: row.isActive !== false ? 'Deactivate' : 'Activate',
              icon: UserCheck,
              onClick: () => handleToggleActive(row)
            }
          ] : []),
          { label: 'Move to Recycle Bin', icon: Trash2, danger: true, onClick: () => setShowDelete(row) }
        ];
        
        return <RowActions actions={baseActions} />;
      }
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <PageHeader
        title="Student Management"
        subtitle="Manage enrolled students batch-wise or across the entire academy"
        breadcrumbs={['Home', 'Students']}
        actions={
          <div className="flex flex-wrap gap-2">
            {canAddEdit && (
              <>
                <Button variant="outline" size="sm" icon={Upload} onClick={() => setShowImport(true)}>Import Excel</Button>
                <Button variant="outline" size="sm" icon={Download} onClick={handleExport}>Export CSV</Button>
                <Button 
                  variant="primary" 
                  icon={Plus} 
                  className="bg-[#1a7a35] hover:bg-[#14632a] text-white font-bold shadow-sm"
                  onClick={() => {
                    setForm(f => ({
                      ...f,
                      batchIds: selectedBatchId && selectedBatchId !== 'ALL' && selectedBatchId !== 'UNASSIGNED' ? [selectedBatchId] : []
                    }));
                    setShowAdd(true);
                  }}
                >
                  Add Student
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="p-4 text-center cursor-pointer hover:border-[#1a7a35]/40 transition-colors" onClick={() => { setViewMode('batches'); setSelectedBatchId(null); }}>
          <p className="text-2xl font-black text-[#1a7a35]">{classes.length}</p>
          <p className="text-xs font-bold text-surface-500 mt-1 flex items-center justify-center gap-1">
            <Layers size={13} /> Total Batches
          </p>
        </Card>
        <Card className="p-4 text-center cursor-pointer hover:border-blue-400 transition-colors" onClick={() => { setViewMode('all'); setSelectedBatchId('ALL'); }}>
          <p className="text-2xl font-black text-blue-600">{students.length}</p>
          <p className="text-xs font-bold text-surface-500 mt-1 flex items-center justify-center gap-1">
            <Users size={13} /> Total Students
          </p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-black text-emerald-600">{students.filter(s => s.isActive !== false).length}</p>
          <p className="text-xs font-bold text-surface-500 mt-1 flex items-center justify-center gap-1">
            <CheckCircle2 size={13} /> Active Students
          </p>
        </Card>
        <Card className="p-4 text-center cursor-pointer hover:border-amber-400 transition-colors" onClick={() => { setSelectedBatchId('UNASSIGNED'); setViewMode('all'); }}>
          <p className="text-2xl font-black text-amber-600">{unassignedStudents.length}</p>
          <p className="text-xs font-bold text-surface-500 mt-1 flex items-center justify-center gap-1">
            <GraduationCap size={13} /> Unassigned Students
          </p>
        </Card>
      </div>

      {/* View Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-200 dark:border-surface-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setViewMode('batches');
              setSelectedBatchId(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              viewMode === 'batches' && !selectedBatchId
                ? 'bg-[#1a7a35] text-white shadow-sm'
                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200'
            }`}
          >
            <Layers size={15} /> Batch-Wise Directory ({classes.length})
          </button>
          <button
            onClick={() => {
              setViewMode('all');
              setSelectedBatchId('ALL');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              viewMode === 'all' && selectedBatchId === 'ALL'
                ? 'bg-[#1a7a35] text-white shadow-sm'
                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200'
            }`}
          >
            <Users size={15} /> Master Student List ({students.length})
          </button>
          <button
            onClick={() => {
              setViewMode('analysis');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              viewMode === 'analysis'
                ? 'bg-[#1a7a35] text-white shadow-sm'
                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200'
            }`}
          >
            <BarChart3 size={15} /> Batch & Subject Analysis
          </button>
        </div>

        {selectedBatchId && selectedBatchId !== 'ALL' && (
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <span>Viewing: {currentBatchObj ? currentBatchObj.name : (selectedBatchId === 'UNASSIGNED' ? 'Unassigned Students' : 'Selected Batch')}</span>
            <button 
              onClick={() => { setSelectedBatchId(null); setViewMode('batches'); }} 
              className="text-emerald-900 dark:text-emerald-200 hover:text-red-600 ml-1"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* MODE 1: BATCH DIRECTORY VIEW */}
      {viewMode === 'batches' && !selectedBatchId && (
        <div className="space-y-4 animate-fade-in">
          {/* Batch Directory Search & Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-surface-50 dark:bg-surface-900/60 p-3.5 rounded-2xl border border-surface-200 dark:border-surface-800">
            <div className="sm:col-span-2 relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                placeholder="Search batch by name, section, or course..."
                value={batchSearch}
                onChange={e => setBatchSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-[#1a7a35]"
              />
            </div>
            <div>
              <select
                value={batchFilterCourse}
                onChange={e => setBatchFilterCourse(e.target.value)}
                className="w-full py-2 px-3 text-xs font-semibold rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-[#1a7a35]"
              >
                <option value="">All Courses</option>
                {uniqueCourses.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={batchFilterType}
                onChange={e => setBatchFilterType(e.target.value)}
                className="w-full py-2 px-3 text-xs font-semibold rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-[#1a7a35]"
              >
                <option value="all">All Delivery Types</option>
                <option value="offline">Offline</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          {/* Batches Grid */}
          {filteredBatches.length === 0 ? (
            <Card className="p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-surface-100 dark:bg-surface-800 text-surface-400 mx-auto flex items-center justify-center mb-3">
                <FolderOpen size={24} />
              </div>
              <h3 className="font-bold text-surface-800 dark:text-white text-base">No batches match your filter</h3>
              <p className="text-xs text-surface-500 mt-1">Try resetting the search terms or filters above.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBatches.map(batch => {
                const batchStudents = (batch.students || []).map((s: any) => String(s._id || s.id || s));
                const studentList = students.filter(s => batchStudents.includes(String(s._id || s.id)));
                const activeCount = studentList.filter(s => s.isActive !== false).length;
                const courseName = batch.courseId?.name || 'Academic Course';

                return (
                  <Card 
                    key={batch._id} 
                    className="p-5 hover:shadow-lg hover:border-[#1a7a35]/40 transition-all duration-200 cursor-pointer flex flex-col justify-between group rounded-2xl border-surface-200 dark:border-surface-800"
                    onClick={() => {
                      setSelectedBatchId(String(batch._id));
                      setViewMode('all');
                    }}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50 truncate max-w-[170px]">
                          {courseName}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">
                          {batch.type || 'offline'}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-surface-900 dark:text-white group-hover:text-[#1a7a35] transition-colors flex items-center justify-between">
                        <span>{batch.name}</span>
                        {batch.section && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">
                            Sec {batch.section}
                          </span>
                        )}
                      </h3>

                      {batch.description && (
                        <p className="text-xs text-surface-500 line-clamp-2 mt-1.5">{batch.description}</p>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-surface-100 dark:border-surface-800/80">
                        <div className="p-2.5 rounded-xl bg-surface-50 dark:bg-surface-800/50 text-left">
                          <p className="text-[10px] uppercase font-bold text-surface-400">Total Enrolled</p>
                          <p className="text-sm font-black text-surface-800 dark:text-white mt-0.5 flex items-center gap-1.5">
                            <Users size={14} className="text-[#1a7a35]" /> {studentList.length} Students
                          </p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-surface-50 dark:bg-surface-800/50 text-left">
                          <p className="text-[10px] uppercase font-bold text-surface-400">Active</p>
                          <p className="text-sm font-black text-emerald-600 mt-0.5 flex items-center gap-1.5">
                            <CheckCircle2 size={14} /> {activeCount} Active
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Footer Action */}
                    <div className="mt-4 pt-3 flex items-center justify-between text-xs font-bold text-[#1a7a35] group-hover:translate-x-0.5 transition-transform">
                      <span>Click to view student list</span>
                      <ArrowRight size={15} />
                    </div>
                  </Card>
                );
              })}

              {/* Unassigned Students Card in Grid */}
              {unassignedStudents.length > 0 && (
                <Card 
                  className="p-5 hover:shadow-lg hover:border-amber-400 transition-all duration-200 cursor-pointer flex flex-col justify-between group rounded-2xl border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10"
                  onClick={() => {
                    setSelectedBatchId('UNASSIGNED');
                    setViewMode('all');
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                        Needs Attention
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-surface-900 dark:text-white group-hover:text-amber-700 transition-colors">
                      Unassigned Students
                    </h3>
                    <p className="text-xs text-surface-500 mt-1">
                      Students who are enrolled in the LMS but not yet assigned to any batch or classroom.
                    </p>

                    <div className="p-2.5 rounded-xl bg-amber-100/50 dark:bg-amber-900/30 text-left mt-4">
                      <p className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300">Pending Assignment</p>
                      <p className="text-base font-black text-amber-800 dark:text-amber-200 mt-0.5">
                        {unassignedStudents.length} Students
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 flex items-center justify-between text-xs font-bold text-amber-700 group-hover:translate-x-0.5 transition-transform">
                    <span>Manage unassigned students</span>
                    <ArrowRight size={15} />
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODE 2: STUDENT TABLE VIEW (WITH BATCH DRILL-DOWN & FULL MULTI-FILTERS) */}
      {(viewMode === 'all' || (selectedBatchId && viewMode !== 'analysis')) && (
        <div className="space-y-4 animate-fade-in">
          {/* Active Batch Header Banner (if a specific batch is drilled into) */}
          {currentBatchObj && (
            <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-white to-emerald-50/40 dark:from-surface-900 dark:to-surface-800 border border-emerald-200 dark:border-emerald-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start gap-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setSelectedBatchId(null); setViewMode('batches'); }}
                  className="hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 shrink-0 mt-0.5"
                >
                  <ArrowLeft size={16} className="mr-1.5" /> All Batches
                </Button>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-surface-900 dark:text-white">
                      {currentBatchObj.name} {currentBatchObj.section ? `· Section ${currentBatchObj.section}` : ''}
                    </h2>
                    {currentBatchObj.courseId?.name && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100">
                        {currentBatchObj.courseId.name}
                      </span>
                    )}
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-600">
                      {currentBatchObj.type || 'offline'}
                    </span>
                  </div>
                  <p className="text-xs text-surface-500 mt-0.5">
                    Showing students enrolled in this batch ({filteredStudents.length} matching criteria).
                  </p>
                </div>
              </div>

              {/* Batch Switcher & Analysis Toggle */}
              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode('analysis')}
                  className="border-[#1a7a35] text-[#1a7a35] hover:bg-emerald-50 text-xs font-bold shrink-0"
                >
                  <BarChart3 size={14} className="mr-1.5" /> Cohort Analysis
                </Button>
                <span className="text-xs font-bold text-surface-500 shrink-0">Switch:</span>
                <select
                  value={selectedBatchId || 'ALL'}
                  onChange={e => setSelectedBatchId(e.target.value)}
                  className="py-1.5 px-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-xs font-bold focus:ring-2 focus:ring-[#1a7a35] outline-none"
                >
                  <option value="ALL">All Batches (Global)</option>
                  <option value="UNASSIGNED">Unassigned Students</option>
                  {classes.map(c => (
                    <option key={c._id} value={c._id}>{c.name}{c.section ? ` (${c.section})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Batch & Subject Cohort Analysis Card */}
          {currentBatchObj && batchAnalysis && (
            <div className="bg-gradient-to-r from-emerald-50/80 via-white to-teal-50/30 dark:from-surface-900 dark:to-surface-800 p-4 md:p-5 rounded-2xl border border-emerald-200 dark:border-surface-700 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#1a7a35] text-white flex items-center justify-center font-bold">
                    <BarChart3 size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      Batch & Subject Analysis: {currentBatchObj.name}
                      {filterSubject && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Subject: {filterSubject}</span>}
                    </h3>
                    <p className="text-[11px] text-gray-500">Cohort performance breakdown, evaluated subjects and critical weak topics</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 font-semibold">Evaluated:</span>
                  <span className="font-bold text-[#1a7a35]">{batchAnalysis.totalEvaluatedStudents || 0} students</span>
                  <button
                    onClick={() => setShowCohortAnalysis(!showCohortAnalysis)}
                    className="ml-2 text-xs font-bold text-gray-600 hover:text-gray-900 underline"
                  >
                    {showCohortAnalysis ? 'Hide' : 'Show'} Breakdown
                  </button>
                </div>
              </div>

              {showCohortAnalysis && batchAnalysis.subjects && batchAnalysis.subjects.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-emerald-100 dark:border-surface-700">
                  {batchAnalysis.subjects.map((subj: any) => (
                    <div
                      key={subj.subject}
                      onClick={() => setFilterSubject(filterSubject === subj.subject ? '' : subj.subject)}
                      className={cn(
                        "p-3 rounded-xl border transition-all bg-white dark:bg-surface-800 cursor-pointer shadow-xs",
                        filterSubject === subj.subject ? "border-[#1a7a35] ring-2 ring-emerald-100" : "border-surface-200 hover:border-emerald-300"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                          <BookOpen size={13} className="text-[#1a7a35]" /> {subj.subject}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800">
                          {subj.evaluatedStudentsCount} evaluated
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>Weak Topics:</span>
                        <span className={cn("font-bold text-xs", subj.weakTopicsCount > 0 ? "text-[#881337]" : "text-emerald-600")}>
                          {subj.weakTopicsCount}
                        </span>
                      </div>
                      {subj.topWeakTopics && subj.topWeakTopics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {subj.topWeakTopics.slice(0, 2).map((wt: any) => (
                            <span key={wt.topic} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#881337] text-white">
                              {wt.topic} ({wt.affectedStudentsCount})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Unassigned Students Header Banner */}
          {selectedBatchId === 'UNASSIGNED' && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setSelectedBatchId(null); setViewMode('batches'); }}
                  className="hover:bg-amber-100 text-amber-800"
                >
                  <ArrowLeft size={16} className="mr-1.5" /> All Batches
                </Button>
                <div>
                  <h2 className="text-base font-bold text-amber-900 dark:text-amber-200">Unassigned Students Roster</h2>
                  <p className="text-xs text-amber-700 dark:text-amber-400">These students are not currently assigned to any batch.</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => { setSelectedBatchId('ALL'); setViewMode('all'); }}
                className="text-xs font-bold"
              >
                View All Students
              </Button>
            </div>
          )}

          {/* COMPREHENSIVE MULTI-FILTER SUITE */}
          <Card className="p-4 md:p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-surface-100 dark:border-surface-800 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-surface-800 dark:text-white">
                <Filter size={15} className="text-[#1a7a35]" />
                <span>Filters & Search</span>
                {activeFiltersCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#1a7a35] text-[10px] font-black">
                    {activeFiltersCount} active
                  </span>
                )}
              </div>

              {activeFiltersCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw size={12} /> Reset Filters
                </button>
              )}
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* 1. Keyword Search */}
              <div className="lg:col-span-2 relative">
                <label className="text-[11px] font-bold text-surface-500 block mb-1">Search Student</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                  <input
                    type="text"
                    placeholder="Name, roll no, email, phone..."
                    value={filterSearch}
                    onChange={e => setFilterSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 focus:outline-none focus:ring-2 focus:ring-[#1a7a35]"
                  />
                  {filterSearch && (
                    <button onClick={() => setFilterSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Batch Selector (if global view) */}
              {!currentBatchObj && selectedBatchId !== 'UNASSIGNED' && (
                <div>
                  <label className="text-[11px] font-bold text-surface-500 block mb-1">Filter Batch</label>
                  <select
                    value={selectedBatchId || 'ALL'}
                    onChange={e => setSelectedBatchId(e.target.value)}
                    className="w-full py-1.5 px-2.5 text-xs font-semibold rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 focus:outline-none focus:ring-2 focus:ring-[#1a7a35]"
                  >
                    <option value="ALL">All Batches</option>
                    <option value="UNASSIGNED">Unassigned Only</option>
                    {classes.map(c => (
                      <option key={c._id} value={c._id}>{c.name}{c.section ? ` (${c.section})` : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 3. Status Filter */}
              <div>
                <label className="text-[11px] font-bold text-surface-500 block mb-1">Account Status</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full py-1.5 px-2.5 text-xs font-semibold rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 focus:outline-none focus:ring-2 focus:ring-[#1a7a35]"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>

              {/* 4. Course Filter */}
              <div>
                <label className="text-[11px] font-bold text-surface-500 block mb-1">Course</label>
                <select
                  value={filterCourse}
                  onChange={e => setFilterCourse(e.target.value)}
                  className="w-full py-1.5 px-2.5 text-xs font-semibold rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 focus:outline-none focus:ring-2 focus:ring-[#1a7a35]"
                >
                  <option value="">All Courses</option>
                  {uniqueCourses.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Subject Filter */}
              <div>
                <label className="text-[11px] font-bold text-surface-500 block mb-1">Subject</label>
                <select
                  value={filterSubject}
                  onChange={e => setFilterSubject(e.target.value)}
                  className="w-full py-1.5 px-2.5 text-xs font-semibold rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 focus:outline-none focus:ring-2 focus:ring-[#1a7a35]"
                >
                  <option value="">All Subjects</option>
                  {subjects.map(s => (
                    <option key={s._id || s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* 5. Class / Standard Filter */}
              <div>
                <label className="text-[11px] font-bold text-surface-500 block mb-1">Class / Grade</label>
                <select
                  value={filterClass}
                  onChange={e => setFilterClass(e.target.value)}
                  className="w-full py-1.5 px-2.5 text-xs font-semibold rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 focus:outline-none focus:ring-2 focus:ring-[#1a7a35]"
                >
                  <option value="">All Classes</option>
                  {uniqueClassNames.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* 6. Section Filter */}
              <div>
                <label className="text-[11px] font-bold text-surface-500 block mb-1">Section</label>
                <select
                  value={filterSection}
                  onChange={e => setFilterSection(e.target.value)}
                  className="w-full py-1.5 px-2.5 text-xs font-semibold rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 focus:outline-none focus:ring-2 focus:ring-[#1a7a35]"
                >
                  <option value="">All Sections</option>
                  {uniqueSections.map(s => (
                    <option key={s} value={s}>Section {s}</option>
                  ))}
                </select>
              </div>

              {/* 7. Sort By */}
              <div>
                <label className="text-[11px] font-bold text-surface-500 block mb-1">Sort Order</label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="w-full py-1.5 px-2.5 text-xs font-semibold rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 focus:outline-none focus:ring-2 focus:ring-[#1a7a35]"
                >
                  <option value="name_asc">Name (A → Z)</option>
                  <option value="name_desc">Name (Z → A)</option>
                  <option value="roll_asc">Roll Number</option>
                  <option value="recent">Recently Added</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
            </div>

            {/* Results Count & Quick Status Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-100 dark:border-surface-800 text-xs text-surface-500">
              <div>
                Showing <span className="font-bold text-surface-900 dark:text-white">{filteredStudents.length}</span> student{filteredStudents.length === 1 ? '' : 's'}
                {selectedBatchId && selectedBatchId !== 'ALL' && (
                  <span> in <span className="font-semibold text-emerald-700">{currentBatchObj ? currentBatchObj.name : 'Selected Filter'}</span></span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Active: {filteredStudents.filter(s => s.isActive !== false).length}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                  Inactive: {filteredStudents.filter(s => s.isActive === false).length}
                </span>
              </div>
            </div>

            {/* Data Table */}
            <DataTable
              data={filteredStudents} 
              columns={columns} 
              searchable={false}
              selectable={canAddEdit}
              bulkActions={canAddEdit ? [
                { label: 'Promote Selected', variant: 'primary', onClick: (ids) => setShowPromote(ids) },
                ...(isDeveloperMode ? [{ 
                  label: 'Delete Selected', 
                  variant: 'danger', 
                  onClick: (ids) => {
                    setStudents(p => p.filter(s => !ids.includes(s.id || s._id)));
                    toast.success(`${ids.length} students deleted`);
                  } 
                }] : []),
              ] : []}
              emptyTitle="No students found matching your criteria" 
              emptyDescription="Try clearing one or more filters above to see more records."
              emptyIcon={GraduationCap}
            />
          </Card>
        </div>
      )}

      {/* MODE 3: BATCH & SUBJECT COHORT ANALYSIS */}
      {viewMode === 'analysis' && (
        <BatchCohortAnalysisView
          batchId={selectedBatchId || 'all'}
          batches={classes}
          onSelectBatch={setSelectedBatchId}
          initialSubject={filterSubject}
          portal="admin"
        />
      )}

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} size="xl">
        <ModalHeader title="Add New Student" subtitle="Enter student and batch assignment details" onClose={() => setShowAdd(false)} />
        <ModalBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="First Name" required>
              <Input placeholder="John" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
            </FormField>
            <FormField label="Last Name">
              <Input placeholder="Doe" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
            </FormField>
            <FormField label="Email" required>
              <Input type="email" placeholder="student@school.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </FormField>
            <FormField label="Date of Birth (DOB)*">
              <Input 
                type="date" 
                value={form.dob || ''} 
                onChange={e => {
                  const val = e.target.value;
                  setForm(f => ({ ...f, dob: val, password: f.password ? f.password : val }));
                }} 
              />
            </FormField>
            <FormField label="Password (Defaults to DOB)">
              <Input 
                type="password" 
                placeholder={form.dob ? `Default password: ${form.dob}` : "Temp password (or DOB)"} 
                value={form.password} 
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} 
              />
            </FormField>
            <FormField label="Phone">
              <Input placeholder="+91 9876543210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </FormField>
            <FormField label="Roll No (Optional)">
              <Input 
                placeholder="Auto-generated if empty (e.g. ARKE001)" 
                value={form.rollNo || ''} 
                onChange={e => setForm(f => ({ ...f, rollNo: e.target.value }))} 
              />
            </FormField>
            <FormField label="Class">
              <Select value={form.class || 'Class 10'} onChange={e => setForm(f => ({ ...f, class: e.target.value }))}>
                {['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'Dropper', 'Foundation'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Section">
              <Select value={form.section || 'A'} onChange={e => setForm(f => ({ ...f, section: e.target.value }))}>
                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(s => (
                  <option key={s} value={s}>Section {s}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Assign Course & Batch" className="md:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 border border-surface-200 dark:border-surface-700 p-3 rounded-xl max-h-48 overflow-y-auto bg-surface-50 dark:bg-surface-800/50">
                {classes.map(c => {
                  const bId = c._id || c.id;
                  const isChecked = form.batchIds?.includes(bId);
                  return (
                    <label key={bId} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${isChecked ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40' : 'hover:bg-surface-100 dark:hover:bg-surface-700 border-transparent'} border`}>
                      <input 
                        type="checkbox" 
                        className="form-checkbox text-[#1a7a35] rounded"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm(f => ({ ...f, batchIds: [...(f.batchIds || []), bId] }));
                          } else {
                            setForm(f => ({ ...f, batchIds: (f.batchIds || []).filter(id => id !== bId) }));
                          }
                        }}
                      />
                      <div className="flex flex-col truncate">
                        <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 leading-none truncate">{c.courseId?.name || 'Academic Course'}</span>
                        <span className="text-xs font-semibold text-surface-700 dark:text-surface-300 truncate">{c.name} {c.section ? `(${c.section})` : ''}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </FormField>
            <FormField label="Status" required>
              <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </FormField>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button variant="primary" loading={loading} className="bg-[#1a7a35] text-white font-bold" onClick={handleAdd}>Add Student</Button>
        </ModalFooter>
      </Modal>

      {/* View Profile Modal */}
      {showView && (
        <Modal isOpen={!!showView} onClose={() => setShowView(null)} size="lg">
          <ModalHeader title="Student Profile" onClose={() => setShowView(null)} />
          <ModalBody className="space-y-4">
            <div className="flex items-center gap-5 p-5 bg-gradient-to-r from-emerald-50 to-indigo-50 dark:from-emerald-950/20 dark:to-indigo-950/20 rounded-2xl border border-surface-200 dark:border-surface-800">
              <Avatar name={`${showView.firstName} ${showView.lastName}`} size="xl" />
              <div>
                <h3 className="text-xl font-bold text-surface-800 dark:text-white">{showView.firstName} {showView.lastName}</h3>
                <p className="text-sm text-surface-500">{showView.email}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={getStatusBadge(showView.isActive !== false ? 'active' : 'inactive') + ' badge capitalize text-xs'}>
                    {showView.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                  {(() => {
                    const studentBatches = studentBatchMap.get(String(showView._id || showView.id)) || [];
                    return studentBatches.length > 0 ? (
                      studentBatches.map(c => (
                        <span key={c._id || c.id} className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">
                          {c.name} {c.section ? `(${c.section})` : ''}
                        </span>
                      ))
                    ) : (
                      <span className="badge bg-amber-50 text-amber-700 border border-amber-200 text-xs">Unassigned</span>
                    );
                  })()}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Roll Number', value: showView.metadata?.rollNo || '—' },
                { label: 'Phone', value: showView.phone || '—' },
                { label: 'Class / Grade', value: showView.metadata?.class || '—' },
                { label: 'Section', value: showView.metadata?.section || '—' },
                { label: 'Parent Name', value: showView.metadata?.parentName || '—' },
                { label: 'Parent Phone', value: showView.metadata?.parentPhone || '—' },
                { label: 'Joined On', value: formatDate(showView.createdAt) },
                { label: 'Role', value: showView.role || 'student' },
              ].map((item, i) => (
                <div key={i} className="p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
                  <p className="text-xs text-surface-400 mb-0.5">{item.label}</p>
                  <p className="text-sm font-semibold text-surface-800 dark:text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowView(null)}>Close</Button>
            {canAddEdit && (
              <Button 
                variant="primary" 
                icon={Edit} 
                className="bg-[#1a7a35] text-white"
                onClick={() => { 
                  const studentBatches = studentBatchMap.get(String(showView._id || showView.id)) || [];
                  setShowEdit({ ...showView, batchIds: studentBatches.map(b => b._id || b.id) }); 
                  setShowView(null); 
                }}
              >
                Edit Profile
              </Button>
            )}
          </ModalFooter>
        </Modal>
      )}

      {/* Edit Student Modal */}
      {showEdit && (
        <Modal isOpen={!!showEdit} onClose={() => setShowEdit(null)} size="xl">
          <ModalHeader title="Edit Student" subtitle={`Update details for ${showEdit.firstName} ${showEdit.lastName}`} onClose={() => setShowEdit(null)} />
          <ModalBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="First Name" required>
                <Input value={showEdit.firstName || ''} onChange={e => setShowEdit(f => ({ ...f, firstName: e.target.value }))} />
              </FormField>
              <FormField label="Last Name">
                <Input value={showEdit.lastName || ''} onChange={e => setShowEdit(f => ({ ...f, lastName: e.target.value }))} />
              </FormField>
              <FormField label="Email">
                <Input type="email" value={showEdit.email || ''} onChange={e => setShowEdit(f => ({ ...f, email: e.target.value }))} />
              </FormField>
              <FormField label="Phone">
                <Input value={showEdit.phone || ''} onChange={e => setShowEdit(f => ({ ...f, phone: e.target.value }))} />
              </FormField>
              <FormField label="Roll No">
                <Input value={showEdit.rollNo || ''} onChange={e => setShowEdit(f => ({ ...f, rollNo: e.target.value }))} />
              </FormField>
              <FormField label="Class">
                <Select value={showEdit.metadata?.class || 'Class 10'} onChange={e => setShowEdit(f => ({ ...f, metadata: { ...f.metadata, class: e.target.value } }))}>
                  {['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'Dropper', 'Foundation'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Section">
                <Select value={showEdit.metadata?.section || 'A'} onChange={e => setShowEdit(f => ({ ...f, metadata: { ...f.metadata, section: e.target.value } }))}>
                  {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(s => (
                    <option key={s} value={s}>Section {s}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Assign Course & Batch" className="md:col-span-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 border border-surface-200 dark:border-surface-700 p-3 rounded-xl max-h-48 overflow-y-auto bg-surface-50 dark:bg-surface-800/50">
                  {classes.map(c => {
                    const bId = c._id || c.id;
                    const isChecked = showEdit.batchIds?.includes(bId);
                    return (
                      <label key={bId} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${isChecked ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40' : 'hover:bg-surface-100 dark:hover:bg-surface-700 border-transparent'} border`}>
                        <input 
                          type="checkbox" 
                          className="form-checkbox text-[#1a7a35] rounded"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setShowEdit(f => ({ ...f, batchIds: [...(f.batchIds || []), bId] }));
                            } else {
                              setShowEdit(f => ({ ...f, batchIds: (f.batchIds || []).filter(id => id !== bId) }));
                            }
                          }}
                        />
                        <div className="flex flex-col truncate">
                          <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 leading-none truncate">{c.courseId?.name || 'Academic Course'}</span>
                          <span className="text-xs font-semibold text-surface-700 dark:text-surface-300 truncate">{c.name} {c.section ? `(${c.section})` : ''}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </FormField>
              <FormField label="Status" required>
                <Select value={showEdit.isActive !== false ? 'true' : 'false'} onChange={e => setShowEdit(f => ({ ...f, isActive: e.target.value === 'true' }))}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </Select>
              </FormField>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowEdit(null)}>Cancel</Button>
            <Button variant="primary" loading={loading} className="bg-[#1a7a35] text-white font-bold" onClick={async () => {
              setLoading(true); 
              try {
                const payloadToUpdate = { ...showEdit };
                if (payloadToUpdate.rollNo !== undefined) {
                  payloadToUpdate.metadata = { ...payloadToUpdate.metadata, rollNo: payloadToUpdate.rollNo };
                }
                await adminAPI.updateUser(showEdit._id || showEdit.id, payloadToUpdate);
                if (showEdit.batchIds !== undefined) {
                  await adminAPI.syncUserBatches({ studentId: showEdit._id || showEdit.id, batchIds: showEdit.batchIds });
                }
                toast.success('Student updated successfully!');
                setShowEdit(null);
                fetchStudents();
                fetchClasses();
              } catch (e: any) {
                toast.error(e.response?.data?.error || e.response?.data?.message || 'Failed to update student');
              } finally {
                setLoading(false);
              }
            }}>Save Changes</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Promote Modal */}
      {showPromote && (
        <Modal isOpen={!!showPromote} onClose={() => setShowPromote(null)} size="md">
          <ModalHeader title="Promote Students" subtitle={`Promote ${showPromote.length} selected student(s) to a new class`} onClose={() => setShowPromote(null)} />
          <ModalBody className="space-y-4">
            <FormField label="New Class">
              <Select>
                {Array.from({ length: 12 }, (_, i) => <option key={i} value={`Class ${i + 1}`}>Class {i + 1}</option>)}
              </Select>
            </FormField>
            <FormField label="New Section">
              <Select><option>A</option><option>B</option><option>C</option><option>D</option></Select>
            </FormField>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowPromote(null)}>Cancel</Button>
            <Button variant="primary" loading={loading} className="bg-[#1a7a35] text-white font-bold" onClick={async () => {
              setLoading(true); 
              await new Promise(r => setTimeout(r, 600));
              setShowPromote(null); 
              setLoading(false); 
              toast.success(`Successfully promoted ${showPromote.length} student(s)`);
            }}>Promote</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Import Modal */}
      {showImport && (
        <Modal isOpen={showImport} onClose={() => { setShowImport(false); setUploadProgress(0); setImportFile(null); }} size="md">
          <ModalHeader title="Import Students" subtitle="Upload an Excel (.xlsx) or CSV file with student records" onClose={() => { setShowImport(false); setUploadProgress(0); setImportFile(null); }} />
          <ModalBody className="space-y-4">
            <FormField label="Spreadsheet File">
              <FileUpload label="Select Excel or CSV File" accept=".xlsx, .xls, .csv" onChange={(file) => setImportFile(file)} />
            </FormField>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2 overflow-hidden">
                <div className="bg-[#1a7a35] h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                <p className="text-xs text-center text-gray-500 mt-1">Uploading... {uploadProgress}%</p>
              </div>
            )}
            {uploadProgress === 100 && (
              <p className="text-xs text-center text-[#1a7a35] mt-2 font-medium">Processing records, please wait...</p>
            )}
            <p className="text-xs text-surface-400">Ensure spreadsheet includes columns: Roll Number, First Name, Last Name, Email, Phone, Class, Section.</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => { setShowImport(false); setUploadProgress(0); setImportFile(null); }}>Cancel</Button>
            <Button variant="primary" loading={loading} className="bg-[#1a7a35] text-white font-bold" onClick={async () => {
              if (!importFile) return toast.error('Please select a file to import');
              setLoading(true); 
              setUploadProgress(0);
              try {
                const formData = new FormData();
                formData.append('file', importFile);
                const res = await adminAPI.importStudents(formData, {
                  onUploadProgress: (progressEvent: any) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                    setUploadProgress(percentCompleted);
                  }
                });
                
                toast.success(`Import complete: ${res.data?.data?.successful || 0} successful, ${res.data?.data?.failed || 0} failed`);
                setShowImport(false);
                setImportFile(null);
                setUploadProgress(0);
                fetchStudents();
                fetchClasses();
              } catch (err: any) {
                toast.error(err.response?.data?.message || 'Failed to import students');
                setUploadProgress(0);
              } finally {
                setLoading(false);
              }
            }}>Import Records</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteModal 
        isOpen={!!showDelete} 
        onClose={() => setShowDelete(null)} 
        onConfirm={async () => { 
          try {
            await adminAPI.deleteUser(showDelete._id || showDelete.id);
            setStudents(p => p.filter(s => s.id !== (showDelete.id || showDelete._id) && s._id !== (showDelete.id || showDelete._id))); 
            setShowDelete(null); 
            toast.success('Student moved to recycle bin successfully'); 
          } catch (error) {
            toast.error('Failed to remove student');
          }
        }} 
        itemName={`${showDelete?.firstName} ${showDelete?.lastName}`} 
      />
    </div>
  );
}
