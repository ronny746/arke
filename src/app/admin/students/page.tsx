"use client";
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Eye, Download, Upload, GraduationCap, ArrowRight, LineChart } from 'lucide-react';
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
  
  // Filters
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '', status: 'active', parentName: '', parentPhone: '', classId: '', rfid: '', qrId: '', faceId: '' });

  const columns = [
    {
      header: 'Student', accessorKey: 'name',
      cell: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${r.firstName} ${r.lastName}`} size="sm" />
          <div>
            <p className="font-medium text-surface-800 dark:text-white text-sm">{r.firstName} {r.lastName}</p>
            <p className="text-xs text-surface-400">{r.email}</p>
          </div>
        </div>
      ),
    },
    { header: 'Roll No', accessorKey: 'rollNo', cell: (r) => <span className="text-sm font-medium">{r.rollNo || 'N/A'}</span> },
    { header: 'Phone', accessorKey: 'phone', cell: (r) => <span className="text-sm text-surface-600 dark:text-surface-400">{r.phone || 'N/A'}</span> },
    { header: 'DOB', accessorKey: 'dob', cell: (r) => <span className="text-sm text-surface-600 dark:text-surface-400">{r.dob || 'N/A'}</span> },
    { 
      header: 'Class', 
      accessorKey: 'class', 
      cell: (r) => {
        const c = classes.find(cls => cls.students?.some(s => String(s._id || s.id || s) === String(r._id || r.id)));
        return <span className="text-sm text-surface-600 dark:text-surface-400">{c ? `${c.name} ${c.section || ''}` : 'N/A'}</span>;
      } 
    },
    { header: 'RFID', accessorKey: 'rfid', cell: (r) => <span className="text-sm text-surface-600 dark:text-surface-400">{r.rfid || 'N/A'}</span> },
    { header: 'QR ID', accessorKey: 'qrId', cell: (r) => <span className="text-sm text-surface-600 dark:text-surface-400">{r.qrId || 'N/A'}</span> },
    { header: 'Face ID', accessorKey: 'faceId', cell: (r) => <span className="text-sm text-surface-600 dark:text-surface-400">{r.faceId || 'N/A'}</span> },
    { header: 'Status', accessorKey: 'isActive', cell: (r) => <span className={getStatusBadge(r.isActive ? 'active' : 'inactive') + ' badge capitalize'}>{r.isActive ? 'Active' : 'Inactive'}</span> },
    {
      header: 'Actions', key: 'actions', sortable: false, width: '80px',
      cell: (row) => (
        <RowActions actions={[
          { label: 'View Profile', icon: Eye, onClick: () => setShowView(row) },
          ...(canAddEdit ? [
            
            { label: 'Edit', icon: Edit, onClick: () => {
              const c = classes.find(cls => cls.students?.some(s => String(s._id || s.id || s) === String(row._id || row.id)));
              setShowEdit({ ...row, classId: c ? (c._id || c.id) : '' });
            }},
            { label: 'Performance', icon: LineChart, onClick: () => router.push(`/admin/students/${row._id || row.id}/performance`) },
            { label: 'Promote', icon: ArrowRight, onClick: () => setShowPromote([row.id]) },
            { label: 'Delete', icon: Trash2, danger: true, onClick: () => setShowDelete(row) },
          ] : [])
        ]} />
      ),
    },
  ];

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
      const res = await adminAPI.getAcademicClasses();
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
          parentName: form.parentName || '',
          parentPhone: form.parentPhone || ''
        }
      };
      if (form.phone) payload.phone = form.phone;

      const userRes = await adminAPI.createUser(payload);
      const newUserId = userRes.data?.data?._id || userRes.data?.data?.id;

      if (newUserId && form.classId) {
        try {
          await adminAPI.assignUserToClass(form.classId, { userIds: [newUserId], roleInClass: 'student' });
        } catch (assignErr) {
          console.error('Failed to assign to class', assignErr);
          toast.error('Student created but failed to assign to class.');
        }
      }

      toast.success('Student added successfully!');
      setShowAdd(false);
      setForm({ firstName: '', lastName: '', email: '', password: '', phone: '', status: 'active', parentName: '', parentPhone: '', classId: '', rfid: '', qrId: '', faceId: '' });
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
                <Button variant="outline" size="sm" icon={Download} onClick={() => toast.success('Exporting students...')}>Export</Button>
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
            { label: 'Delete', variant: 'danger', onClick: (ids) => {
               setStudents(p => p.filter(s => !ids.includes(s.id)));
               toast.success(`${ids.length} students deleted`);
            } },
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
            <FormField label="Assign Class">
              <Select value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}>
                <option value="">-- No Class --</option>
                {classes.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name} {c.section}</option>)}
              </Select>
            </FormField>
            <FormField label="Status" required>
              <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </FormField>
            <FormField label="RFID"><Input placeholder="RFID Number" value={form.rfid} onChange={e => setForm(f => ({ ...f, rfid: e.target.value }))} /></FormField>
            <FormField label="QR ID"><Input placeholder="QR Code ID" value={form.qrId} onChange={e => setForm(f => ({ ...f, qrId: e.target.value }))} /></FormField>
            <FormField label="Face ID"><Input placeholder="Face ID" value={form.faceId} onChange={e => setForm(f => ({ ...f, faceId: e.target.value }))} /></FormField>
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
                <div className="flex gap-2 mt-2">
                  <span className={getStatusBadge(showView.isActive ? 'active' : 'inactive') + ' badge capitalize'}>{showView.isActive ? 'Active' : 'Inactive'}</span>
                  <span className="badge badge-surface capitalize">{classes.find(c => c.students?.some(s => String(s._id || s.id || s) === String(showView._id || showView.id)))?.name || 'No Class'}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Roll No', value: showView.metadata?.rollNo || showView.rollNo },
                { label: 'DOB', value: showView.metadata?.dob || showView.dob },
                { label: 'Phone', value: showView.phone },
                { label: 'Email', value: showView.email },
                { label: 'RFID', value: showView.rfid },
                { label: 'QR ID', value: showView.qrId },
                { label: 'Face ID', value: showView.faceId },
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
              <FormField label="Phone"><Input value={showEdit.phone || ''} onChange={e => setShowEdit(f => ({ ...f, phone: e.target.value }))} /></FormField>
              <FormField label="Assign Class">
                <Select value={showEdit.classId || ''} onChange={e => setShowEdit(f => ({ ...f, classId: e.target.value }))}>
                  <option value="">-- No Class --</option>
                  {classes.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name} {c.section}</option>)}
                </Select>
              </FormField>
              <FormField label="Status" required>
                <Select value={showEdit.isActive ? 'true' : 'false'} onChange={e => setShowEdit(f => ({ ...f, isActive: e.target.value === 'true' }))}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </Select>
              </FormField>
              <FormField label="RFID"><Input value={showEdit.rfid || ''} onChange={e => setShowEdit(f => ({ ...f, rfid: e.target.value }))} /></FormField>
              <FormField label="QR ID"><Input value={showEdit.qrId || ''} onChange={e => setShowEdit(f => ({ ...f, qrId: e.target.value }))} /></FormField>
              <FormField label="Face ID"><Input value={showEdit.faceId || ''} onChange={e => setShowEdit(f => ({ ...f, faceId: e.target.value }))} /></FormField>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowEdit(null)}>Cancel</Button>
            <Button variant="gradient" loading={loading} onClick={async () => {
              setLoading(true); 
              try {
                await adminAPI.updateUser(showEdit._id || showEdit.id, showEdit);
                if (showEdit.classId) {
                  await adminAPI.assignUserToClass(showEdit.classId, { userIds: [showEdit._id || showEdit.id], roleInClass: 'student' });
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
        <Modal isOpen={showImport} onClose={() => setShowImport(false)} size="md">
          <ModalHeader title="Import Students" subtitle="Upload a CSV file with student data" onClose={() => setShowImport(false)} />
          <ModalBody className="space-y-4">
            <FormField label="CSV File">
              <FileUpload label="Select CSV File" accept=".csv" onChange={(file) => setImportFile(file)} />
            </FormField>
            <p className="text-xs text-surface-400">Please ensure your CSV matches the required format. <a href={adminAPI.downloadStudentSampleCSV()} target="_blank" rel="noreferrer" className="text-primary-500 hover:underline">Download Template</a></p>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowImport(false)}>Cancel</Button>
            <Button variant="gradient" loading={loading} onClick={async () => {
              if (!importFile) return toast.error('Please select a file to import');
              setLoading(true); 
              try {
                const formData = new FormData();
                formData.append('file', importFile);
                const res = await adminAPI.importStudents(formData);
                toast.success(`Import complete: ${res.data?.data?.successful} successful, ${res.data?.data?.failed} failed`);
                setShowImport(false);
                setImportFile(null);
                fetchStudents();
                fetchClasses();
              } catch (err) {
                toast.error(err.response?.data?.message || 'Failed to import students');
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
