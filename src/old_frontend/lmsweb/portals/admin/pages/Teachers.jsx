import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Users } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { DataTable, RowActions } from '../../../components/tables/DataTable.jsx';
import { Card, Avatar } from '../../../components/ui/index.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter, DeleteModal } from '../../../components/modals/index.jsx';
import { FormField, Input, Select, FileUpload } from '../../../components/forms/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { formatDate, getStatusBadge, cn } from '../../../utils/helpers.js';
import toast from 'react-hot-toast';
import { adminAPI } from '../../../api/index.js';
import { useAuthStore } from '../../../store/index.js';

export default function Teachers() {
  const { user } = useAuthStore();
  const canAddEdit = user?.role !== 'admin_acadops';
  const [teachers, setTeachers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showView, setShowView] = useState(null);
  const [showEdit, setShowEdit] = useState(null);
  const [showDelete, setShowDelete] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '', qualification: '', experience: '' });

  const columns = [
    {
      header: 'Teacher', accessorKey: 'name',
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
    { header: 'Experience', accessorKey: 'experience', cell: (r) => <span>{r.metadata?.experience || 0} yrs</span> },
    { header: 'Status', accessorKey: 'status', cell: (r) => <span className={getStatusBadge(r.status || 'active') + ' badge capitalize'}>{r.status || 'active'}</span> },
    {
      header: 'Actions', key: 'actions', sortable: false, width: '80px',
      cell: (row) => (
        <RowActions actions={[
          { label: 'View Profile', icon: Eye, onClick: () => setShowView(row) },
          ...(canAddEdit ? [
            { label: 'Edit', icon: Edit, onClick: () => setShowEdit(row) },
            { label: 'Delete', icon: Trash2, danger: true, onClick: () => setShowDelete(row) },
          ] : [])
        ]} />
      ),
    },
  ];

  const fetchTeachers = async () => {
    try {
      setFetching(true);
      const res = await adminAPI.getUsers({ role: 'teacher' });
      setTeachers(Array.isArray(res.data?.data) ? res.data.data : (res.data?.data?.users || []));
    } catch (error) {
      toast.error('Failed to load teachers');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

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
        role: 'teacher',
        metadata: { 
          qualification: form.qualification || '', 
          experience: form.experience || '' 
        }
      };
      if (form.phone) payload.phone = form.phone;

      await adminAPI.createUser(payload);
      toast.success('Teacher added successfully!');
      setShowAdd(false);
      setForm({ firstName: '', lastName: '', email: '', password: '', phone: '', qualification: '', experience: '' });
      fetchTeachers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add teacher');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Teacher Management"
        subtitle="Manage all teaching staff"
        breadcrumbs={['Home', 'Teachers']}
        actions={canAddEdit ? <Button variant="gradient" icon={Plus} onClick={() => setShowAdd(true)}>Add Teacher</Button> : null}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Teachers', value: teachers.length, color: 'text-primary' },
          { label: 'Active', value: teachers.filter(t => t.isActive !== false).length, color: 'text-success-600' },
          { label: 'Avg Exp', value: `${teachers.length ? Math.round(teachers.reduce((a, t) => a + Number(t.metadata?.experience || 0), 0) / teachers.length) : 0} yrs`, color: 'text-accent-600' },
        ].map((s, i) => (
          <Card key={i} className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-surface-400 mt-1">{s.label}</p>
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <DataTable data={teachers} columns={columns} searchable searchPlaceholder="Search teachers..." emptyTitle="No teachers found" emptyIcon={Users} />
      </Card>
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} size="lg">
        <ModalHeader title="Add Teacher" onClose={() => setShowAdd(false)} />
        <ModalBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="First Name" required><Input placeholder="John" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></FormField>
          <FormField label="Last Name"><Input placeholder="Doe" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></FormField>
          <FormField label="Email" required><Input type="email" placeholder="teacher@school.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></FormField>
          <FormField label="Password" required><Input type="password" placeholder="Temp password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></FormField>
          <FormField label="Phone"><Input placeholder="+91 9876543210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></FormField>
          <FormField label="Qualification"><Input placeholder="B.Ed, M.Sc Physics" value={form.qualification} onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))} /></FormField>
          <FormField label="Experience (Years)"><Input type="number" placeholder="5" value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))} /></FormField>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button variant="gradient" loading={loading} onClick={handleAdd}>Add Teacher</Button>
        </ModalFooter>
      </Modal>
      {showView && (
        <Modal isOpen={!!showView} onClose={() => setShowView(null)} size="md">
          <ModalHeader title="Teacher Profile" onClose={() => setShowView(null)} />
          <ModalBody className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-surface-50 dark:bg-surface-700/50 rounded-xl">
              <Avatar name={`${showView.firstName} ${showView.lastName}`} size="xl" />
              <div>
                <h3 className="font-bold text-surface-800 dark:text-white">{showView.firstName} {showView.lastName}</h3>
                <p className="text-sm text-surface-500">{showView.email}</p>
                <p className="text-xs text-surface-400 mt-1">{showView.metadata?.qualification}</p>
                <span className={getStatusBadge(showView.status || 'active') + ' badge capitalize mt-2'}>{showView.status || 'active'}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: 'Email', value: showView.email },
                { label: 'Phone', value: showView.phone },
                { label: 'Experience', value: `${showView.metadata?.experience || 0} yrs` },
                { label: 'Join Date', value: formatDate(showView.createdAt) },
              ].map((item, i) => (
                <div key={i} className="p-3 bg-surface-50 dark:bg-surface-700/50 rounded-xl">
                  <p className="text-xs text-surface-400 mb-0.5">{item.label}</p>
                  <p className="font-medium text-surface-800 dark:text-white">{item.value || '—'}</p>
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

      {/* Edit Teacher Modal */}
      {showEdit && (
        <Modal isOpen={!!showEdit} onClose={() => setShowEdit(null)} size="lg">
          <ModalHeader title="Edit Teacher" subtitle={`Update details for ${showEdit.name}`} onClose={() => setShowEdit(null)} />
          <ModalBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="First Name" required><Input value={showEdit.firstName || ''} onChange={e => setShowEdit(f => ({ ...f, firstName: e.target.value }))} /></FormField>
            <FormField label="Last Name"><Input value={showEdit.lastName || ''} onChange={e => setShowEdit(f => ({ ...f, lastName: e.target.value }))} /></FormField>
            <FormField label="Email" required><Input type="email" value={showEdit.email || ''} onChange={e => setShowEdit(f => ({ ...f, email: e.target.value }))} /></FormField>
            <FormField label="Phone"><Input value={showEdit.phone || ''} onChange={e => setShowEdit(f => ({ ...f, phone: e.target.value }))} /></FormField>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowEdit(null)}>Cancel</Button>
            <Button variant="gradient" loading={loading} onClick={async () => {
              setLoading(true); 
              try {
                await adminAPI.updateUser(showEdit._id || showEdit.id, showEdit);
                toast.success('Teacher updated successfully!');
                setShowEdit(null);
                fetchTeachers();
              } catch (e) {
                toast.error('Failed to update teacher');
              } finally {
                setLoading(false);
              }
            }}>Save Changes</Button>
          </ModalFooter>
        </Modal>
      )}
      <DeleteModal isOpen={!!showDelete} onClose={() => setShowDelete(null)} onConfirm={async () => { 
        try {
          await adminAPI.deleteUser(showDelete._id || showDelete.id);
          setTeachers(p => p.filter(t => t.id !== (showDelete.id || showDelete._id) && t._id !== (showDelete.id || showDelete._id))); 
          setShowDelete(null); 
          toast.success('Teacher removed successfully'); 
        } catch (error) {
          toast.error('Failed to remove teacher');
        }
      }} itemName={`${showDelete?.firstName} ${showDelete?.lastName}`} />
    </div>
  );
}
