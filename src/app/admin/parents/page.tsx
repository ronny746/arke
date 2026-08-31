"use client";
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Link as LinkIcon } from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { DataTable, RowActions } from '@/components/tables/DataTable.jsx';
import { Card, Avatar, Badge } from '@/components/ui/index.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter, DeleteModal } from '@/components/modals/index.jsx';
import { FormField, Input, Select } from '@/components/forms/index.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { getStatusBadge } from '@/utils/helpers.js';
import toast from 'react-hot-toast';
import { adminAPI } from '@/api/index.js';
import { useAuthStore } from '@/store/index.js';

export default function Parents() {
  const { user } = useAuthStore();
  const canAddEdit = user?.role !== 'admin_acadops';
  
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showDelete, setShowDelete] = useState(null);
  const [showLink, setShowLink] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '', status: 'active' });

  useEffect(() => {
    fetchParents();
    fetchStudents(); // Pre-fetch students for linking
  }, []);

  const fetchParents = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getUsers({ role: 'parent' });
      setParents(res.data?.data?.users || res.data?.data || []);
    } catch (error) {
      toast.error('Failed to load parents');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await adminAPI.getUsers({ role: 'student' });
      setStudents(res.data?.data?.users || res.data?.data || []);
    } catch (error) {
      console.error('Failed to load students', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setFormLoading(true);
      const payload = { ...form };
      payload.isActive = payload.status === 'active';
      delete payload.status;
      
      if (showEdit) {
        // password cannot be updated via this endpoint usually, remove if empty
        if (!payload.password) delete payload.password;
        await adminAPI.updateUser(showEdit._id || showEdit.id, payload);
        toast.success('Parent updated successfully');
      } else {
        // On create, backend doesn't accept isActive in schema
        const createPayload = { ...payload, role: 'parent' };
        delete createPayload.isActive;
        await adminAPI.createUser(createPayload);
        toast.success('Parent created successfully');
      }
      setShowAdd(false);
      setShowEdit(null);
      fetchParents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save parent');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setFormLoading(true);
      await adminAPI.deleteUser(showDelete._id || showDelete.id);
      toast.success('Parent deleted successfully');
      setShowDelete(null);
      fetchParents();
    } catch (error) {
      toast.error('Failed to delete parent');
    } finally {
      setFormLoading(false);
    }
  };

  const handleLinkStudent = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) {
      toast.error('Please select a student');
      return;
    }
    try {
      setFormLoading(true);
      await adminAPI.linkParentStudent({
        parentId: showLink._id || showLink.id,
        studentId: selectedStudentId
      });
      toast.success('Student linked successfully');
      setShowLink(null);
      fetchParents(); // Refresh to show updated linked children if backend returns them
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to link student');
    } finally {
      setFormLoading(false);
    }
  };

  const columns = [
    {
      header: 'Parent', accessorKey: 'name',
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
    { header: 'Phone', accessorKey: 'phone', cell: (r) => <span className="text-sm">{r.phone || 'N/A'}</span> },
    { 
      header: 'Linked Children', 
      cell: (r) => (
        <span className="text-sm text-surface-600">
          {r.childrenIds?.length ? `${r.childrenIds.length} Children` : 'None'}
        </span>
      ) 
    },
    { header: 'Status', accessorKey: 'isActive', cell: (r) => <span className={getStatusBadge(r.isActive ? 'active' : 'inactive') + ' badge capitalize'}>{r.isActive ? 'Active' : 'Inactive'}</span> },
    {
      header: 'Actions', key: 'actions', sortable: false, width: '80px',
      cell: (row) => (
        <RowActions actions={[
          ...(canAddEdit ? [
            { label: 'Link Student', icon: LinkIcon, onClick: () => setShowLink(row) },
            { label: 'Edit', icon: Edit, onClick: () => {
              setForm({ 
                firstName: row.firstName, lastName: row.lastName, 
                email: row.email, phone: row.phone, status: row.isActive ? 'active' : 'inactive' 
              });
              setShowEdit(row);
            }},
            { label: 'Delete', icon: Trash2, danger: true, onClick: () => setShowDelete(row) },
          ] : [])
        ]} />
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Parents"
        subtitle="Manage parent accounts and link them to students"
        breadcrumbs={['Home', 'Parents']}
        actions={canAddEdit && (
          <Button onClick={() => {
            setForm({ firstName: '', lastName: '', email: '', password: '', phone: '', status: 'active' });
            setShowAdd(true);
          }} icon={Plus}>
            Add Parent
          </Button>
        )}
      />

      <Card className="p-5">
        <DataTable
          data={parents}
          columns={columns}
          loading={loading}
          searchable
          emptyTitle="No parents found"
        />
      </Card>

      {/* Add/Edit Modal */}
      {(showAdd || showEdit) && (
        <Modal isOpen={!!(showAdd || showEdit)} onClose={() => { setShowAdd(false); setShowEdit(null); }} size="lg">
          <form onSubmit={handleSubmit}>
            <ModalHeader title={showEdit ? "Edit Parent" : "Add Parent"} onClose={() => { setShowAdd(false); setShowEdit(null); }} />
            <ModalBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="First Name" required>
                  <Input value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} required placeholder="John" />
                </FormField>
                <FormField label="Last Name" required>
                  <Input value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} required placeholder="Doe" />
                </FormField>
                <FormField label="Email" required>
                  <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required placeholder="john@example.com" />
                </FormField>
                {!showEdit && (
                  <FormField label="Password" required>
                    <Input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required placeholder="Enter password" />
                  </FormField>
                )}
                <FormField label="Phone">
                  <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+1234567890" />
                </FormField>
                <FormField label="Status" required>
                  <Select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Select>
                </FormField>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button type="button" variant="outline" onClick={() => { setShowAdd(false); setShowEdit(null); }}>Cancel</Button>
              <Button type="submit" loading={formLoading}>{showEdit ? 'Save Changes' : 'Create Parent'}</Button>
            </ModalFooter>
          </form>
        </Modal>
      )}

      {/* Link Student Modal */}
      {showLink && (
        <Modal isOpen={!!showLink} onClose={() => setShowLink(null)} size="md">
          <form onSubmit={handleLinkStudent}>
            <ModalHeader title="Link Student" onClose={() => setShowLink(null)} />
            <ModalBody>
              <div className="mb-4 text-sm text-surface-600">
                Linking student to parent: <span className="font-semibold">{showLink.firstName} {showLink.lastName}</span>
              </div>
              <FormField label="Select Student" required>
                <Select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} required>
                  <option value="">-- Choose Student --</option>
                  {students.map(s => (
                    <option key={s._id || s.id} value={s._id || s.id}>{s.firstName} {s.lastName} ({s.email})</option>
                  ))}
                </Select>
              </FormField>
            </ModalBody>
            <ModalFooter>
              <Button type="button" variant="outline" onClick={() => setShowLink(null)}>Cancel</Button>
              <Button type="submit" loading={formLoading}>Link Student</Button>
            </ModalFooter>
          </form>
        </Modal>
      )}

      {/* Delete Modal */}
      <DeleteModal
        isOpen={!!showDelete}
        onClose={() => setShowDelete(null)}
        onConfirm={handleDelete}
        title="Delete Parent"
        message={`Are you sure you want to delete ${showDelete?.firstName}? This action cannot be undone.`}
        loading={formLoading}
      />
    </div>
  );
}
