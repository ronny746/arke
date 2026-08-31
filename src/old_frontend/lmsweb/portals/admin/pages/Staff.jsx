import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { DataTable, RowActions } from '../../../components/tables/DataTable.jsx';
import { Card, Avatar } from '../../../components/ui/index.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/modals/index.jsx';
import { FormField, Input, Select } from '../../../components/forms/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { formatDate, getStatusBadge } from '../../../utils/helpers.js';
import toast from 'react-hot-toast';
import { adminAPI } from '../../../api/index.js';
import { useAuthStore } from '../../../store/index.js';

const roleColors = { admin_operations: 'badge-primary', admin_acadops: 'badge-success', super_admin: 'badge-danger', staff: 'badge-info' };

export default function Staff() {
  const { user } = useAuthStore();
  const [staff, setStaff] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showDelete, setShowDelete] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [form, setForm] = useState({ firstName: '', lastName: '', role: 'admin_operations', phone: '', email: '', password: '', metadata: { designation: '' } });

  const columns = [
    {
      header: 'Staff Member', accessorKey: 'name',
      cell: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${r.firstName} ${r.lastName}`} size="sm" />
          <div>
            <p className="font-medium text-sm text-surface-800 dark:text-white">{r.firstName} {r.lastName}</p>
            <p className="text-xs text-surface-400">{r.email}</p>
          </div>
        </div>
      ),
    },
    { header: 'Role', accessorKey: 'role', cell: (r) => <span className={`badge ${roleColors[r.role] || 'badge-surface'}`}>{r.role?.replace('_', ' ')}</span> },
    { header: 'Phone', accessorKey: 'phone' },
    { header: 'Join Date', accessorKey: 'createdAt', cell: (r) => <span className="text-xs text-surface-400">{formatDate(r.createdAt)}</span> },
    { header: 'Status', accessorKey: 'isActive', cell: (r) => <span className={getStatusBadge(r.isActive !== false ? 'active' : 'inactive') + ' badge capitalize'}>{r.isActive !== false ? 'Active' : 'Inactive'}</span> },
    {
      header: 'Actions', key: 'actions', sortable: false, width: '80px',
      cell: (row) => (
        <RowActions actions={[
          { label: 'Edit', icon: Edit, onClick: () => setShowEdit(row) },
          { label: 'Delete', icon: Trash2, danger: true, onClick: () => setShowDelete(row) },
        ]} />
      ),
    },
  ];

  const fetchStaff = async () => {
    try {
      setFetching(true);
      const res = await adminAPI.getUsers();
      const allUsers = Array.isArray(res.data?.data) ? res.data.data : (res.data?.data?.users || []);
      const staffMembers = allUsers.filter(u => ['admin_operations', 'admin_acadops', 'super_admin', 'staff'].includes(u.role) && u._id !== user?._id);
      setStaff(staffMembers);
    } catch (error) {
      toast.error('Failed to load staff');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const roleGroups = [
    { role: 'Operations', count: staff.filter(s => s.role === 'admin_operations').length },
    { role: 'Academics', count: staff.filter(s => s.role === 'admin_acadops').length },
    { role: 'General Staff', count: staff.filter(s => s.role === 'staff').length },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {!showAdd && !showEdit ? (
        <>
          <PageHeader
            title="Staff Management"
            subtitle="Manage all non-teaching staff"
            breadcrumbs={['Home', 'Staff']}
            actions={<Button variant="gradient" icon={Plus} onClick={() => setShowAdd(true)}>Add Staff</Button>}
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {roleGroups.map((r, i) => (
              <Card key={i} className="p-3 text-center">
                <p className="text-xl font-bold text-primary">{r.count}</p>
                <p className="text-xs text-surface-400 mt-0.5">{r.role}</p>
              </Card>
            ))}
          </div>
          <Card className="p-5 overflow-x-auto">
            <DataTable data={staff} columns={columns} searchable searchPlaceholder="Search staff..." emptyTitle="No staff found" emptyIcon={Users} />
          </Card>
        </>
      ) : (
        <>
          <PageHeader
            title={showEdit ? "Edit Staff Member" : "Create New Staff"}
            subtitle={showEdit ? `Updating details for ${showEdit.firstName}` : "Fill in the details below to add a staff member"}
            breadcrumbs={['Home', 'Staff', showEdit ? 'Edit' : 'Create']}
            actions={<Button variant="outline" onClick={() => showEdit ? setShowEdit(null) : setShowAdd(false)}>Back to List</Button>}
          />
          <Card className="p-6 md:p-8 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2">
                <h4 className="text-sm font-medium text-surface-500 mb-1">Personal Information</h4>
                <p className="text-xs text-surface-400 mb-4">Provide the basic details of the staff member.</p>
              </div>
              <FormField label="First Name" required>
                <Input placeholder="John" value={showEdit ? showEdit.firstName : form.firstName} onChange={e => showEdit ? setShowEdit(f => ({ ...f, firstName: e.target.value })) : setForm(f => ({ ...f, firstName: e.target.value }))} />
              </FormField>
              <FormField label="Last Name" required>
                <Input placeholder="Doe" value={showEdit ? showEdit.lastName : form.lastName} onChange={e => showEdit ? setShowEdit(f => ({ ...f, lastName: e.target.value })) : setForm(f => ({ ...f, lastName: e.target.value }))} />
              </FormField>
              
              <div className="sm:col-span-2 mt-2 pt-4 border-t border-surface-100 dark:border-surface-700">
                <h4 className="text-sm font-medium text-surface-500 mb-1">Account Credentials</h4>
              </div>
              <FormField label="Email" required>
                <Input type="email" placeholder="john@example.com" value={showEdit ? showEdit.email : form.email} onChange={e => showEdit ? setShowEdit(f => ({ ...f, email: e.target.value })) : setForm(f => ({ ...f, email: e.target.value }))} disabled={!!showEdit} />
              </FormField>
              <FormField label="Phone">
                <Input placeholder="+91..." value={showEdit ? showEdit.phone : form.phone} onChange={e => showEdit ? setShowEdit(f => ({ ...f, phone: e.target.value })) : setForm(f => ({ ...f, phone: e.target.value }))} />
              </FormField>

              {!showEdit && (
                <FormField label="Password" required>
                  <Input type="password" placeholder="********" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                </FormField>
              )}

              <div className="sm:col-span-2 mt-2 pt-4 border-t border-surface-100 dark:border-surface-700">
                <h4 className="text-sm font-medium text-surface-500 mb-1">Role & Status</h4>
              </div>
              <FormField label="Role" required>
                <Select value={showEdit ? showEdit.role : form.role} onChange={e => showEdit ? setShowEdit(f => ({ ...f, role: e.target.value })) : setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="admin_operations">Admin (Operations)</option>
                  <option value="admin_acadops">Admin (Academics)</option>
                  <option value="staff">Staff (Counselor/Sales/Etc)</option>
                </Select>
              </FormField>

              {(showEdit ? showEdit.role : form.role) === 'staff' && (
                <FormField label="Designation (Optional)">
                  <Input 
                    placeholder="e.g. Sales, Telecaller" 
                    value={showEdit ? (showEdit.metadata?.designation || '') : (form.metadata?.designation || '')} 
                    onChange={e => showEdit 
                      ? setShowEdit(f => ({ ...f, metadata: { ...f.metadata, designation: e.target.value } })) 
                      : setForm(f => ({ ...f, metadata: { ...f.metadata, designation: e.target.value } }))} 
                  />
                </FormField>
              )}
              
              {showEdit && (
                <FormField label="Status" required>
                  <Select value={showEdit.isActive !== false ? 'active' : 'inactive'} onChange={e => setShowEdit(f => ({ ...f, isActive: e.target.value === 'active' }))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Select>
                </FormField>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 mt-8 border-t border-surface-100 dark:border-surface-700">
              <Button variant="outline" onClick={() => showEdit ? setShowEdit(null) : setShowAdd(false)}>Cancel</Button>
              <Button variant="gradient" loading={loading} onClick={async () => {
                if (showEdit) {
                  setLoading(true); 
                  try {
                    const updatePayload = {
                      firstName: showEdit.firstName,
                      lastName: showEdit.lastName,
                      phone: showEdit.phone,
                      isActive: showEdit.isActive,
                      role: showEdit.role,
                      metadata: showEdit.metadata
                    };
                    await adminAPI.updateUser(showEdit._id, updatePayload);
                    toast.success('Staff updated successfully!');
                    setShowEdit(null);
                    fetchStaff();
                  } catch (e) {
                    toast.error(e.response?.data?.message || 'Failed to update staff');
                  } finally {
                    setLoading(false);
                  }
                } else {
                  if (!form.firstName || !form.email || !form.password) {
                    toast.error('First name, email, and password are required');
                    return;
                  }
                  setLoading(true); 
                  try {
                    await adminAPI.createUser(form);
                    toast.success('Staff added successfully!');
                    setShowAdd(false);
                    setForm({ firstName: '', lastName: '', role: 'admin_operations', phone: '', email: '', password: '', metadata: { designation: '' } });
                    fetchStaff();
                  } catch (err) {
                    toast.error(err.response?.data?.message || 'Failed to add staff');
                  } finally {
                    setLoading(false);
                  }
                }
              }}>
                {showEdit ? 'Save Changes' : 'Add Staff'}
              </Button>
            </div>
          </Card>
        </>
      )}

      {/* Delete Confirmation */}
      {showDelete && (
        <Modal isOpen={!!showDelete} onClose={() => setShowDelete(null)} size="sm">
          <ModalHeader title="Delete Staff" onClose={() => setShowDelete(null)} />
          <ModalBody className="py-4 text-center">
            <p className="text-sm text-surface-600 dark:text-surface-400">
              Are you sure you want to remove <strong>{showDelete.name}</strong>? This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowDelete(null)}>Cancel</Button>
            <Button variant="danger" loading={loading} onClick={async () => {
              setLoading(true); 
              try {
                await adminAPI.deleteUser(showDelete._id);
                setStaff(p => p.filter(s => s._id !== showDelete._id));
                setShowDelete(null); 
                toast.success('Staff removed');
              } catch(e) {
                toast.error('Failed to remove');
              } finally {
                setLoading(false);
              }
            }}>Delete</Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
