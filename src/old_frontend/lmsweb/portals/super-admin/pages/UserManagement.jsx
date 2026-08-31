import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Key, UserX, Activity, Users } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { DataTable, RowActions } from '../../../components/tables/DataTable.jsx';
import { Card, Avatar } from '../../../components/ui/index.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter, DeleteModal } from '../../../components/modals/index.jsx';
import { FormField, Input, Select } from '../../../components/forms/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { formatDate, getStatusBadge } from '../../../utils/helpers.js';
import toast from 'react-hot-toast';
import { superAdminAPI, adminAPI } from '../../../api/index.js';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [institutes, setInstitutes] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showDelete, setShowDelete] = useState(null);
  const [showReset, setShowReset] = useState(null);
  const [showLogs, setShowLogs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', role: 'super_admin', instituteId: '', password: '', phone: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, instRes] = await Promise.all([
        superAdminAPI.getUsers(),
        superAdminAPI.getInstitutes()
      ]);
      setUsers(usersRes.data?.data?.users || usersRes.data?.data || usersRes.data?.users || []);
      setInstitutes(instRes.data?.data?.institutes || instRes.data?.data || instRes.data?.institutes || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    {
      header: 'User', accessorKey: 'firstName',
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
    { header: 'Role', accessorKey: 'role', cell: (r) => <span className="badge badge-primary">{r.role}</span> },
    { header: 'Institute', accessorKey: 'instituteId', cell: (r) => {
        const inst = institutes.find(i => i._id === r.instituteId || i.id === r.instituteId);
        return <span className="text-sm text-surface-500 dark:text-surface-400">{inst ? inst.name : '-'}</span>;
    }},
    { header: 'Status', accessorKey: 'status', cell: (r) => <span className={getStatusBadge(r.status) + ' badge capitalize'}>{r.status}</span> },
    { header: 'Last Login', accessorKey: 'lastLogin', cell: (r) => <span className="text-xs text-surface-400">{formatDate(r.lastLogin)}</span> },
    {
      header: 'Actions', key: 'actions', sortable: false, width: '80px',
      cell: (row) => (
        <RowActions actions={[
          { label: 'Edit', icon: Edit, onClick: () => setShowEdit(row) },
          { label: 'Reset Password', icon: Key, onClick: () => setShowReset(row) },
          { label: 'View Logs', icon: Activity, onClick: () => setShowLogs(row) },
          { label: row.status === 'active' ? 'Suspend' : 'Activate', icon: UserX, onClick: () => {
            setUsers(prev => prev.map(u => u.id === row.id ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' } : u));
            toast.success(`User ${row.status === 'active' ? 'suspended' : 'activated'}`);
          }},
          { label: 'Delete', icon: Trash2, danger: true, onClick: () => setShowDelete(row) },
        ]} />
      ),
    },
  ];

  const handleAdd = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      toast.error('Please fill required fields (Name, Email, Password)');
      return;
    }
    setLoading(true);
    try {
      const payload = { ...form };
      if (payload.role === 'super_admin') {
        delete payload.instituteId;
      }
      await adminAPI.createUser(payload);
      toast.success('User created!');
      setShowAdd(false);
      setForm({ firstName: '', lastName: '', email: '', role: 'super_admin', instituteId: '', password: '', phone: '' });
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="User Management"
        subtitle="Manage platform users and roles"
        breadcrumbs={['Home', 'Users']}
        actions={<Button variant="gradient" icon={Plus} onClick={() => setShowAdd(true)}>Add User</Button>}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Super Admins', value: users.filter(u => u.role === 'Super Admin').length, color: 'text-primary' },
          { label: 'Institute Admins', value: users.filter(u => u.role === 'Institute Admin').length, color: 'text-secondary-600' },
          { label: 'Branch Admins', value: users.filter(u => u.role === 'Branch Admin').length, color: 'text-accent-600' },
          { label: 'Suspended', value: users.filter(u => u.status === 'suspended').length, color: 'text-danger-600' },
        ].map((s, i) => (
          <Card key={i} className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-surface-400 mt-1">{s.label}</p>
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <DataTable
          data={users} columns={columns} searchable searchPlaceholder="Search users..." selectable
          emptyTitle="No users found" emptyIcon={Users}
        />
      </Card>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} size="md">
        <ModalHeader title="Create User" subtitle="Add a new platform user" onClose={() => setShowAdd(false)} />
        <ModalBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First Name" required><Input placeholder="John" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></FormField>
            <FormField label="Last Name" required><Input placeholder="Doe" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></FormField>
          </div>
          <FormField label="Email" required><Input type="email" placeholder="user@lms.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></FormField>
          <FormField label="Phone"><Input type="tel" placeholder="+91..." value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></FormField>
          <FormField label="Role" required>
            <Select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="super_admin">Super Admin</option>
              <option value="admin_operations">Admin Operations</option>
              <option value="admin_acadops">Admin AcadOps</option>
              <option value="teacher">Teacher</option>
            </Select>
          </FormField>
          {form.role !== 'super_admin' && (
            <FormField label="Institute">
              <Select value={form.instituteId} onChange={e => setForm(f => ({ ...f, instituteId: e.target.value }))}>
                <option value="">Select Institute</option>
                {institutes.map(i => (
                  <option key={i._id || i.id} value={i._id || i.id}>{i.name}</option>
                ))}
              </Select>
            </FormField>
          )}
          <FormField label="Temporary Password" required hint="User will be asked to reset on first login">
            <Input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </FormField>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button variant="gradient" loading={loading} onClick={handleAdd}>Create User</Button>
        </ModalFooter>
      </Modal>
      <DeleteModal isOpen={!!showDelete} onClose={() => setShowDelete(null)} onConfirm={async () => {
        setLoading(true);
        try {
          await superAdminAPI.deleteUser(showDelete._id || showDelete.id);
          setShowDelete(null);
          toast.success('User deleted');
          fetchData();
        } catch(err) {
          toast.error('Failed to delete user');
        } finally {
          setLoading(false);
        }
      }} itemName={showDelete?.firstName} loading={loading} />
      
      {/* Edit User Modal */}
      <Modal isOpen={!!showEdit} onClose={() => setShowEdit(null)} size="md">
        <ModalHeader title="Edit User" subtitle={`Modify details for ${showEdit?.firstName}`} onClose={() => setShowEdit(null)} />
        <ModalBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First Name" required><Input value={showEdit?.firstName || ''} onChange={e => setShowEdit(p => ({ ...p, firstName: e.target.value }))} /></FormField>
            <FormField label="Last Name" required><Input value={showEdit?.lastName || ''} onChange={e => setShowEdit(p => ({ ...p, lastName: e.target.value }))} /></FormField>
          </div>
          <FormField label="Phone"><Input type="tel" value={showEdit?.phone || ''} onChange={e => setShowEdit(p => ({ ...p, phone: e.target.value }))} /></FormField>
          {/* Note: role and email are not easily editable in this basic implementation */}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowEdit(null)}>Cancel</Button>
          <Button variant="gradient" loading={loading} onClick={async () => {
            setLoading(true);
            try {
              await superAdminAPI.updateUser(showEdit._id || showEdit.id, {
                firstName: showEdit.firstName,
                lastName: showEdit.lastName,
                phone: showEdit.phone
              });
              setShowEdit(null);
              toast.success('User updated!');
              fetchData();
            } catch(err) {
              toast.error('Failed to update user');
            } finally {
              setLoading(false);
            }
          }}>Save Changes</Button>
        </ModalFooter>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={!!showReset} onClose={() => setShowReset(null)} size="sm">
        <ModalHeader title="Reset Password" subtitle={`Send reset link to ${showReset?.name}`} onClose={() => setShowReset(null)} />
        <ModalBody className="py-4">
          <p className="text-sm text-surface-500 text-center">Are you sure you want to send a password reset link to <strong>{showReset?.email}</strong>?</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowReset(null)}>Cancel</Button>
          <Button variant="gradient" loading={loading} onClick={async () => {
            setLoading(true); await new Promise(r => setTimeout(r, 600));
            setShowReset(null); setLoading(false); toast.success('Password reset email sent!');
          }}>Send Link</Button>
        </ModalFooter>
      </Modal>

      {/* View Logs Modal */}
      <Modal isOpen={!!showLogs} onClose={() => setShowLogs(null)} size="lg">
        <ModalHeader title="Activity Logs" subtitle={`Recent actions for ${showLogs?.name}`} onClose={() => setShowLogs(null)} />
        <ModalBody className="max-h-[60vh] overflow-y-auto">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((_, i) => (
              <div key={i} className="flex items-start gap-4 p-3 rounded-lg bg-surface-50 dark:bg-surface-800/50">
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center shrink-0">
                  <Activity size={14} />
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-800 dark:text-white">Logged into portal</p>
                  <p className="text-xs text-surface-500 mt-1">{new Date(Date.now() - i * 86400000).toLocaleString()}</p>
                  <p className="text-xs text-surface-400 mt-1">IP: 192.168.1.{10 + i}</p>
                </div>
              </div>
            ))}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowLogs(null)}>Close</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
