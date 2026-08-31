"use client";
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Eye, Download, Upload, GraduationCap, ArrowRight, LineChart } from 'lucide-react';
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

export default function Students() {
  const { user } = useAuthStore();
  const router = useRouter();
  const canAddEdit = user?.role !== 'admin_acadops';
  const { isDeveloperMode } = useDeveloperStore();
  const [students, setStudents] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showView, setShowView] = useState(null);
  const [showEdit, setShowEdit] = useState(null);
  const [showPromote, setShowPromote] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [showDelete, setShowDelete] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [classes, setClasses] = useState([]);
  const [importFile, setImportFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Filters
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '', status: 'active', parentName: '', parentPhone: '', batchIds: [], rollNo: '', class: '', section: '' });

  const columns = [
    {
      header: 'Student', accessorKey: 'name',
      cell: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${r.firstName} ${r.lastName}`} size="sm" />
          <div>
            <p className="font-medium text-surface-800 dark:text-white text-sm">{r.firstName} {r.lastName}</p>
            <p className="text-xs text-surface-400">{r.email || 'No email provided'}</p>
          </div>
        </div>
      ),
    },
    { header: 'Roll No', accessorKey: 'rollNo', cell: (r) => <span className="text-sm font-medium">{r.metadata?.rollNo || '-'}</span> },
    { header: 'Phone', accessorKey: 'phone', cell: (r) => <span className="text-sm text-surface-600 dark:text-surface-400">{r.phone || 'N/A'}</span> },
    { header: 'Class', accessorKey: 'class', cell: (r) => <span className="text-sm text-surface-600 dark:text-surface-400">{r.metadata?.class ? `${r.metadata.class} ${r.metadata.section || ''}`.trim() : '-'}</span> },
    { 
      header: 'Course', 
      accessorKey: 'course', 
      cell: (r) => {
        const studentBatches = classes.filter(cls => cls.students?.some(s => String(s._id || s.id || s) === String(r._id || r.id)));
        const courses = [...new Set(studentBatches.filter(c => c.courseId?.name).map(c => c.courseId.name))];
        return (
          <div className="flex flex-wrap gap-1">
            {courses.length > 0 ? courses.map((courseName, idx) => (
              <span key={idx} className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                {courseName}
              </span>
            )) : <span className="text-xs text-surface-400">-</span>}
          </div>
        );
      } 
    },
    { 
      header: 'Batch', 
      accessorKey: 'batch', 
      cell: (r) => {
        const studentBatches = classes.filter(cls => cls.students?.some(s => String(s._id || s.id || s) === String(r._id || r.id)));
        return (
          <div className="flex flex-col gap-1">
            {studentBatches.length > 0 ? (
              studentBatches.map(c => (
                <span key={c._id || c.id} className="text-xs text-surface-600 dark:text-surface-400 font-medium">
                  {c.name} {c.section || ''}
                </span>
              ))
            ) : (
              <span className="text-xs text-surface-400">Unassigned</span>
            )}
          </div>
        );
      } 
    },
    { header: 'Status', accessorKey: 'isActive', cell: (r) => <span className={getStatusBadge(r.isActive ? 'active' : 'inactive') + ' badge capitalize'}>{r.isActive ? 'Active' : 'Inactive'}</span> },
    {
      header: 'Actions', key: 'actions', sortable: false, width: '80px',
      cell: (row) => {
        const baseActions = [
          { label: 'View Profile', icon: Eye, onClick: () => setShowView(row) },
          ...(canAddEdit ? [
            { label: 'Edit', icon: Edit, onClick: () => {
              const studentBatches = classes.filter(cls => cls.students?.some(s => String(s._id || s.id || s) === String(row._id || row.id)));
              setShowEdit({ ...row, batchIds: studentBatches.map(b => b._id || b.id) });
            }},
            { label: 'Performance', icon: LineChart, onClick: () => router.push(`/admin/students/${row._id || row.id}/performance`) },
            { label: 'Promote', icon: ArrowRight, onClick: () => setShowPromote([row.id]) },
          ] : [])
        ];
        
        if (canAddEdit) {
          baseActions.push({
            label: row.isActive ? 'Deactivate' : 'Activate',
            icon: ArrowRight, // placeholder icon
            onClick: () => handleToggleActive(row)
          });
        }
        
        baseActions.push({ label: 'Move to Recycle Bin', icon: Trash2, danger: true, onClick: () => setShowDelete(row) });
        
        return <RowActions actions={baseActions} />;
      }
    },
  ];

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
      const studentBatches = classes.filter(cls => cls.students?.some(stu => String(stu._id || stu.id || stu) === String(s._id || s.id)));
      const batchNames = studentBatches.map(c => `${c.name} ${c.section || ''}`.trim()).join(' | ');
      const courses = [...new Set(studentBatches.filter(c => c.courseId?.name).map(c => c.courseId.name))].join(' | ');
      
      const c = studentBatches[0]; // For fallback class/section if needed
      
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
    link.setAttribute("download", `Students_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Students exported successfully');
  };

  const fetchClasses = async () => {
    try {
      const res = await adminAPI.getBatches();
      setClasses(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, []);

  const uniqueClassNames = Array.from(new Set(classes.map(c => c.name))).sort();
  const uniqueSections = Array.from(new Set(classes.map(c => c.section).filter(Boolean))).sort();

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (filterStatus === 'active' && s.isActive === false) return false;
      if (filterStatus === 'inactive' && s.isActive !== false) return false;
      
      if (filterClass || filterSection) {
        const c = classes.find(cls => cls.students?.some(stu => String(stu._id || stu.id || stu) === String(s._id || s.id)));
        if (!c) return false; 
        if (filterClass && c.name !== filterClass) return false;
        if (filterSection && c.section !== filterSection) return false;
      }
      return true;
    }).map(s => {
      let dob = s.metadata?.dob || '';
      if (dob && dob.length === 8 && !dob.includes('-') && !dob.includes('/')) {
        dob = `${dob.substring(0, 2)}/${dob.substring(2, 4)}/${dob.substring(4)}`;
      }
      return {
        ...s,
        rollNo: s.metadata?.rollNo || '',
        dob: dob,
      };
    });
  }, [students, classes, filterClass, filterSection, filterStatus]);

  const handleAdd = async () => {
    if (!form.firstName || !form.email || !form.password) {
      toast.error('First Name, Email, and Password are required');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName || ' ', // Backend requires lastName, provide default space if empty
        email: form.email,
        password: form.password,
        role: 'student',
        rfid: form.rfid,
        qrId: form.qrId,
        faceId: form.faceId,
        metadata: {
          status: form.status,
          rollNo: form.rollNo || '',
          class: form.class || '',
          section: form.section || '',
          parentName: form.parentName || '',
          parentPhone: form.parentPhone || ''
        }
      };
      if (form.phone) payload.phone = form.phone;

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
      setForm({ firstName: '', lastName: '', email: '', password: '', phone: '', status: 'active', parentName: '', parentPhone: '', batchIds: [] });
      fetchStudents();
      fetchClasses();
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to add student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Student Management"
        subtitle="Manage all enrolled students"
        breadcrumbs={['Home', 'Students']}
        actions={
          <div className="flex gap-2">
            {canAddEdit && (
              <>
                <Button variant="outline" size="sm" icon={Upload} onClick={() => setShowImport(true)}>Import</Button>
                <Button variant="outline" size="sm" icon={Download} onClick={handleExport}>Export</Button>
                <Button variant="gradient" icon={Plus} onClick={() => setShowAdd(true)}>Add Student</Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Students', value: students.length, color: 'text-primary' },
          { label: 'Active', value: students.filter(s => s.isActive !== false).length, color: 'text-success-600' },
          { label: 'Inactive', value: students.filter(s => s.isActive === false).length, color: 'text-danger-600' },
        ].map((s, i) => (
          <Card key={i} className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-surface-400 mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-6 bg-surface-50 dark:bg-surface-800/50 p-3 rounded-xl border border-surface-200 dark:border-surface-700/50">
          <div className="flex-1 w-full sm:w-auto">
             <label className="text-xs text-surface-500 font-medium mb-1 block">Class</label>
             <select className="form-select text-sm h-9" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                <option value="">All Classes</option>
                {uniqueClassNames.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
          </div>
          <div className="flex-1 w-full sm:w-auto">
             <label className="text-xs text-surface-500 font-medium mb-1 block">Section</label>
             <select className="form-select text-sm h-9" value={filterSection} onChange={e => setFilterSection(e.target.value)}>
                <option value="">All Sections</option>
                {uniqueSections.map(s => <option key={s} value={s}>{s}</option>)}
             </select>
          </div>
          <div className="flex-1 w-full sm:w-auto">
             <label className="text-xs text-surface-500 font-medium mb-1 block">Status</label>
             <select className="form-select text-sm h-9" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
             </select>
          </div>
        </div>

        <DataTable
          data={filteredStudents} columns={columns} searchable searchPlaceholder="Search students..."
          selectable={canAddEdit}
          bulkActions={canAddEdit ? [
            { label: 'Promote Class', variant: 'primary', onClick: (ids) => setShowPromote(ids) },
            ...(isDeveloperMode ? [{ label: 'Delete', variant: 'danger', onClick: (ids) => {
               setStudents(p => p.filter(s => !ids.includes(s.id)));
               toast.success(`${ids.length} students deleted`);
            } }] : []),
          ] : []}
          emptyTitle="No students found" emptyIcon={GraduationCap}
        />
      </Card>

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} size="xl">
        <ModalHeader title="Add New Student" subtitle="Enter student details" onClose={() => setShowAdd(false)} />
        <ModalBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="First Name" required><Input placeholder="John" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></FormField>
            <FormField label="Last Name"><Input placeholder="Doe" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></FormField>
            <FormField label="Email" required><Input type="email" placeholder="student@school.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></FormField>
            <FormField label="Password" required><Input type="password" placeholder="Temp password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></FormField>
            <FormField label="Phone"><Input placeholder="+91 9876543210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></FormField>
            <FormField label="Roll No"><Input placeholder="R-101" value={form.rollNo || ''} onChange={e => setForm(f => ({ ...f, rollNo: e.target.value }))} /></FormField>
            <FormField label="Class"><Input placeholder="e.g. 10" value={form.class || ''} onChange={e => setForm(f => ({ ...f, class: e.target.value }))} /></FormField>
            <FormField label="Section"><Input placeholder="e.g. A" value={form.section || ''} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} /></FormField>
            <FormField label="Assign Course & Batch" className="md:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 border border-surface-200 dark:border-surface-700 p-3 rounded-xl max-h-48 overflow-y-auto bg-surface-50 dark:bg-surface-800/50">
                {classes.map(c => {
                  const bId = c._id || c.id;
                  const isChecked = form.batchIds?.includes(bId);
                  return (
                    <label key={bId} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${isChecked ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-surface-100 dark:hover:bg-surface-700 border-transparent'} border`}>
                      <input 
                        type="checkbox" 
                        className="form-checkbox text-indigo-600 rounded"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm(f => ({ ...f, batchIds: [...(f.batchIds || []), bId] }));
                          } else {
                            setForm(f => ({ ...f, batchIds: (f.batchIds || []).filter(id => id !== bId) }));
                          }
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-indigo-700 leading-none">{c.courseId?.name || 'Unknown Course'}</span>
                        <span className="text-xs font-medium text-surface-700 dark:text-surface-300">{c.name} {c.section}</span>
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
          <Button variant="gradient" loading={loading} onClick={handleAdd}>Add Student</Button>
        </ModalFooter>
      </Modal>

      {/* View Profile Modal */}
      {showView && (
        <Modal isOpen={!!showView} onClose={() => setShowView(null)} size="lg">
          <ModalHeader title="Student Profile" onClose={() => setShowView(null)} />
          <ModalBody className="space-y-4">
            <div className="flex items-center gap-5 p-5 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 rounded-xl">
              <Avatar name={`${showView.firstName} ${showView.lastName}`} size="xl" />
              <div>
                <h3 className="text-xl font-bold text-surface-800 dark:text-white">{showView.firstName} {showView.lastName}</h3>
                <p className="text-sm text-surface-500">{showView.email}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={getStatusBadge(showView.isActive ? 'active' : 'inactive') + ' badge capitalize'}>{showView.isActive ? 'Active' : 'Inactive'}</span>
                  {(() => {
                    const studentBatches = classes.filter(cls => cls.students?.some(s => String(s._id || s.id || s) === String(showView._id || showView.id)));
                    return studentBatches.length > 0 ? (
                      studentBatches.map(c => (
                        <div key={c._id || c.id} className="flex gap-2">
                          <span className="badge bg-indigo-50 text-indigo-700 border border-indigo-100">{c.courseId?.name || 'Unknown Course'}</span>
                          <span className="badge badge-surface capitalize">{c.name} {c.section}</span>
                        </div>
                      ))
                    ) : (
                      <span className="badge badge-surface capitalize">Unassigned</span>
                    );
                  })()}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Phone', value: showView.phone },
                { label: 'Email', value: showView.email },
                { label: 'Role', value: showView.role },
                { label: 'Joined On', value: formatDate(showView.createdAt) },
              ].map((item, i) => (
                <div key={i} className="p-3 bg-surface-50 dark:bg-surface-700/50 rounded-xl">
                  <p className="text-xs text-surface-400 mb-0.5">{item.label}</p>
                  <p className="text-sm font-medium text-surface-800 dark:text-white">{item.value || '—'}</p>
                </div>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowView(null)}>Close</Button>
            {canAddEdit && <Button variant="primary" icon={Edit} onClick={() => { setShowEdit(showView); setShowView(null); }}>Edit Profile</Button>}
          </ModalFooter>
        </Modal>
      )}

      {/* Edit Student Modal */}
      {showEdit && (
        <Modal isOpen={!!showEdit} onClose={() => setShowEdit(null)} size="xl">
          <ModalHeader title="Edit Student" subtitle={`Update details for ${showEdit.name}`} onClose={() => setShowEdit(null)} />
          <ModalBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="First Name" required><Input value={showEdit.firstName || ''} onChange={e => setShowEdit(f => ({ ...f, firstName: e.target.value }))} /></FormField>
              <FormField label="Last Name"><Input value={showEdit.lastName || ''} onChange={e => setShowEdit(f => ({ ...f, lastName: e.target.value }))} /></FormField>
              <FormField label="Email"><Input type="email" value={showEdit.email || ''} onChange={e => setShowEdit(f => ({ ...f, email: e.target.value }))} /></FormField>
              <FormField label="Phone"><Input value={showEdit.phone || ''} onChange={e => setShowEdit(f => ({ ...f, phone: e.target.value }))} /></FormField>
              <FormField label="Roll No"><Input value={showEdit.rollNo || ''} onChange={e => setShowEdit(f => ({ ...f, rollNo: e.target.value }))} /></FormField>
              <FormField label="Class"><Input value={showEdit.metadata?.class || ''} onChange={e => setShowEdit(f => ({ ...f, metadata: { ...f.metadata, class: e.target.value } }))} /></FormField>
              <FormField label="Section"><Input value={showEdit.metadata?.section || ''} onChange={e => setShowEdit(f => ({ ...f, metadata: { ...f.metadata, section: e.target.value } }))} /></FormField>
              <FormField label="Assign Course & Batch" className="md:col-span-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 border border-surface-200 dark:border-surface-700 p-3 rounded-xl max-h-48 overflow-y-auto bg-surface-50 dark:bg-surface-800/50">
                  {classes.map(c => {
                    const bId = c._id || c.id;
                    const isChecked = showEdit.batchIds?.includes(bId);
                    return (
                      <label key={bId} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${isChecked ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-surface-100 dark:hover:bg-surface-700 border-transparent'} border`}>
                        <input 
                          type="checkbox" 
                          className="form-checkbox text-indigo-600 rounded"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setShowEdit(f => ({ ...f, batchIds: [...(f.batchIds || []), bId] }));
                            } else {
                              setShowEdit(f => ({ ...f, batchIds: (f.batchIds || []).filter(id => id !== bId) }));
                            }
                          }}
                        />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-indigo-700 leading-none">{c.courseId?.name || 'Unknown Course'}</span>
                          <span className="text-xs font-medium text-surface-700 dark:text-surface-300">{c.name} {c.section}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </FormField>
              <FormField label="Status" required>
                <Select value={showEdit.isActive ? 'true' : 'false'} onChange={e => setShowEdit(f => ({ ...f, isActive: e.target.value === 'true' }))}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </Select>
              </FormField>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowEdit(null)}>Cancel</Button>
            <Button variant="gradient" loading={loading} onClick={async () => {
              setLoading(true); 
              try {
                const payloadToUpdate = { ...showEdit };
                if (payloadToUpdate.rollNo !== undefined) {
                  payloadToUpdate.metadata = { ...payloadToUpdate.metadata, rollNo: payloadToUpdate.rollNo };
                  // We can leave rollNo at root, mongoose will just ignore it if not in schema, but it's cleaner to handle.
                }
                await adminAPI.updateUser(showEdit._id || showEdit.id, payloadToUpdate);
                if (showEdit.batchIds !== undefined) {
                  await adminAPI.syncUserBatches({ studentId: showEdit._id || showEdit.id, batchIds: showEdit.batchIds });
                }
                toast.success('Student updated successfully!');
                setShowEdit(null);
                fetchStudents();
                fetchClasses();
              } catch (e) {
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
          <ModalHeader title="Promote Students" subtitle={`Promote ${showPromote.length} student(s) to a new class`} onClose={() => setShowPromote(null)} />
          <ModalBody className="space-y-4">
            <FormField label="New Class">
              <Select>
                {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>Class {i + 1}</option>)}
              </Select>
            </FormField>
            <FormField label="New Section">
              <Select><option>A</option><option>B</option><option>C</option></Select>
            </FormField>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowPromote(null)}>Cancel</Button>
            <Button variant="gradient" loading={loading} onClick={async () => {
              setLoading(true); await new Promise(r => setTimeout(r, 600));
              setShowPromote(null); setLoading(false); toast.success(`Successfully promoted ${showPromote.length} student(s)`);
            }}>Promote</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Import Modal */}
      {showImport && (
        <Modal isOpen={showImport} onClose={() => { setShowImport(false); setUploadProgress(0); setImportFile(null); }} size="md">
          <ModalHeader title="Import Students" subtitle="Upload an Excel (.xlsx) file with student data" onClose={() => { setShowImport(false); setUploadProgress(0); setImportFile(null); }} />
          <ModalBody className="space-y-4">
            <FormField label="Excel File">
              <FileUpload label="Select Excel File" accept=".xlsx, .xls, .csv" onChange={(file) => setImportFile(file)} />
            </FormField>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2 overflow-hidden">
                <div className="bg-primary-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                <p className="text-xs text-center text-gray-500 mt-1">Uploading... {uploadProgress}%</p>
              </div>
            )}
            {uploadProgress === 100 && (
              <p className="text-xs text-center text-primary-600 mt-2 font-medium">Processing file, please wait...</p>
            )}
            <p className="text-xs text-surface-400">Please ensure your Excel sheet matches the required format (Roll number, Name, Mobile Number, Class, Section...).</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => { setShowImport(false); setUploadProgress(0); setImportFile(null); }}>Cancel</Button>
            <Button variant="gradient" loading={loading} onClick={async () => {
              if (!importFile) return toast.error('Please select a file to import');
              setLoading(true); 
              setUploadProgress(0);
              try {
                const formData = new FormData();
                formData.append('file', importFile);
                const res = await adminAPI.importStudents(formData, {
                  onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                  }
                });
                
                toast.success(`Import complete: ${res.data?.data?.successful} successful, ${res.data?.data?.failed} failed`);
                setShowImport(false);
                setImportFile(null);
                setUploadProgress(0);
                fetchStudents();
                fetchClasses();
              } catch (err) {
                toast.error(err.response?.data?.message || 'Failed to import students');
                setUploadProgress(0);
              } finally {
                setLoading(false);
              }
            }}>Import</Button>
          </ModalFooter>
        </Modal>
      )}

      <DeleteModal isOpen={!!showDelete} onClose={() => setShowDelete(null)} onConfirm={async () => { 
        try {
          await adminAPI.deleteUser(showDelete._id || showDelete.id);
          setStudents(p => p.filter(s => s.id !== (showDelete.id || showDelete._id) && s._id !== (showDelete.id || showDelete._id))); 
          setShowDelete(null); 
          toast.success('Student removed successfully'); 
        } catch (error) {
          toast.error('Failed to remove student');
        }
      }} itemName={`${showDelete?.firstName} ${showDelete?.lastName}`} />
    </div>
  );
}
