import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Power, PowerOff, Building2, MapPin, Mail, Phone } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { DataTable, RowActions } from '../../../components/tables/DataTable.jsx';
import { Card, Badge, Avatar, StatCard } from '../../../components/ui/index.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter, DeleteModal, Drawer } from '../../../components/modals/index.jsx';
import { FormField, Input, Select, FileUpload } from '../../../components/forms/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';

import { formatDate, getStatusBadge } from '../../../utils/helpers.js';
import toast from 'react-hot-toast';
import { superAdminAPI } from '../../../api/index.js';

export default function Institutes() {
  const [institutes, setInstitutes] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showDelete, setShowDelete] = useState(null);
  const [showView, setShowView] = useState(null);
  const [showEdit, setShowEdit] = useState(null);
  const [form, setForm] = useState({ 
    name: '', subdomain: '', contactEmail: '', contactPhone: '', address: '', planType: 'basic', domain: '',
    adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const fetchInstitutes = async () => {
    try {
      setLoading(true);
      const res = await superAdminAPI.getInstitutes();
      
      // Extract array properly depending on backend response structure
      let dataList = [];
      if (Array.isArray(res.data)) dataList = res.data;
      else if (Array.isArray(res.data?.data)) dataList = res.data.data;
      else if (Array.isArray(res.data?.message)) dataList = res.data.message;
      else if (res.data?.data?.institutes) dataList = res.data.data.institutes;
      else if (res.data?.message?.institutes) dataList = res.data.message.institutes;
      else if (res.data?.institutes) dataList = res.data.institutes;

      setInstitutes(dataList);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch institutes');
      setInstitutes([]); // Fallback to empty array
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutes();
  }, []);

  const stats = [
    { label: 'Total', value: institutes.length, color: 'text-primary' },
    { label: 'Active', value: institutes.filter(i => i.isActive).length, color: 'text-success-600' },
    { label: 'Suspended', value: institutes.filter(i => !i.isActive).length, color: 'text-danger-600' },
  ];

  const columns = [
    {
      header: 'Institute',
      accessorKey: 'name',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.name} size="sm" />
          <div>
            <p className="font-medium text-surface-800 dark:text-white text-sm">{row.name}</p>
            <p className="text-xs text-surface-400">{row.contactEmail || 'No email'}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Location',
      accessorKey: 'address',
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-surface-600 dark:text-surface-400">
          <MapPin size={12} className="flex-shrink-0" />
          {row.address || 'N/A'}
        </div>
      ),
    },
    {
      header: 'Plan',
      accessorKey: 'planType',
      cell: (row) => <span className={getStatusBadge(row.planType || 'free') + ' badge capitalize'}>{row.planType || 'free'}</span>,
    },
    {
      header: 'Status',
      accessorKey: 'isActive',
      cell: (row) => <span className={getStatusBadge(row.isActive ? 'ACTIVE' : 'SUSPENDED') + ' badge capitalize'}>{row.isActive ? 'Active' : 'Inactive'}</span>,
    },
    {
      header: 'Students',
      accessorKey: 'students',
      cell: (row) => <span className="font-medium">{row.students?.toLocaleString()}</span>,
    },
    {
      header: 'Expiry',
      accessorKey: 'expiryDate',
      cell: (row) => {
        const expired = new Date(row.expiryDate) < new Date();
        return <span className={expired ? 'text-danger-500 text-xs' : 'text-xs text-surface-500 dark:text-surface-400'}>{formatDate(row.expiryDate)}</span>;
      },
    },
    {
      header: 'Actions',
      key: 'actions',
      sortable: false,
      width: '80px',
      cell: (row) => (
        <RowActions actions={[
          { label: 'View Details', icon: Eye, onClick: () => setShowView(row) },
          { label: 'Edit', icon: Edit, onClick: () => setShowEdit(row) },
          { label: row.isActive ? 'Suspend' : 'Activate', icon: row.isActive ? PowerOff : Power, onClick: () => {
            setInstitutes(prev => prev.map(i => (i._id || i.id) === (row._id || row.id) ? { ...i, isActive: !i.isActive } : i));
            toast.success(`Institute ${row.isActive ? 'suspended' : 'activated'}`);
          }},
          { label: 'Delete', icon: Trash2, danger: true, onClick: () => setShowDelete(row) },
        ]} />
      ),
    },
  ];

  const handleAdd = async () => {
    if (!form.name || !form.subdomain || !form.contactEmail || !form.adminFirstName || !form.adminLastName || !form.adminEmail || !form.adminPassword) {
      toast.error('Please enter all required fields for Institute and Admin');
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        subdomain: form.subdomain,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        address: form.address,
        planType: form.planType,
        domain: form.domain,
        adminFirstName: form.adminFirstName,
        adminLastName: form.adminLastName,
        adminEmail: form.adminEmail,
        adminPassword: form.adminPassword
      };
      
      await superAdminAPI.createInstitute(payload);
      toast.success('Institute & Admin created successfully!');
      setShowAdd(false);
      setForm({ 
        name: '', subdomain: '', contactEmail: '', contactPhone: '', address: '', planType: 'basic', domain: '',
        adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: ''
      });
      fetchInstitutes(); // Refresh the list
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to create institute');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSave = async () => {
    setLoading(true);
    try {
      const payload = {
        name: showEdit.name,
        subdomain: showEdit.subdomain,
        contactEmail: showEdit.contactEmail,
        contactPhone: showEdit.contactPhone,
        address: showEdit.address,
        planType: showEdit.planType,
        domain: showEdit.domain
      };
      await superAdminAPI.updateInstitute(showEdit._id || showEdit.id, payload);
      toast.success('Institute updated successfully!');
      setShowEdit(null);
      fetchInstitutes();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to update institute');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await superAdminAPI.deleteInstitute(showDelete._id || showDelete.id);
      toast.success('Institute deleted');
      setShowDelete(null);
      fetchInstitutes();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to delete institute');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {!showAdd && !showEdit ? (
        <>
          <PageHeader
            title="Institute Management"
            subtitle="Manage all registered institutes on the platform"
            breadcrumbs={['Home', 'Institutes']}
            actions={
              <Button variant="gradient" icon={Plus} onClick={() => setShowAdd(true)}>Add Institute</Button>
            }
          />

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((s, i) => (
              <Card key={i} className="p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-surface-400 mt-1">{s.label}</p>
              </Card>
            ))}
          </div>

          {/* Table */}
          <Card className="p-5">
            <DataTable
              data={institutes}
              columns={columns}
              searchable
              searchPlaceholder="Search institutes..."
              selectable
              bulkActions={[
                { label: 'Suspend Selected', variant: 'warning', onClick: (ids) => { toast.success(`Suspended ${ids.length} institutes`); } },
                { label: 'Delete Selected', variant: 'danger', onClick: (ids) => { toast.success(`Deleted ${ids.length} institutes`); } },
              ]}
              actions={
                <Button variant="outline" size="sm">
                  Export CSV
                </Button>
              }
              emptyTitle="No institutes found"
              emptyDescription="Create your first institute to get started."
              emptyIcon={Building2}
            />
          </Card>
        </>
      ) : (
        <>
          <PageHeader
            title={showEdit ? "Edit Institute" : "Create New Institute"}
            subtitle={showEdit ? `Updating details for ${showEdit.name}` : "Fill in the details below to add an institute"}
            breadcrumbs={['Home', 'Institutes', showEdit ? 'Edit' : 'Create']}
            actions={
              <Button variant="outline" onClick={() => showEdit ? setShowEdit(null) : setShowAdd(false)}>Back to List</Button>
            }
          />
          
          <Card className="p-6 md:p-8 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2">
                <h4 className="text-sm font-medium text-surface-500 mb-1">Institute Information</h4>
                <p className="text-xs text-surface-400 mb-4">Provide the basic details of the {showEdit ? "institute" : "new institute"}.</p>
              </div>
              <FormField label="Institute Name" required className="sm:col-span-2">
                <Input placeholder="e.g. Sunrise Academy" value={showEdit ? showEdit.name : form.name} onChange={e => showEdit ? setShowEdit(f => ({ ...f, name: e.target.value })) : setForm(f => ({ ...f, name: e.target.value }))} />
              </FormField>
              <FormField label="Subdomain" required>
                <Input placeholder="e.g. sunrise" value={showEdit ? showEdit.subdomain : form.subdomain} onChange={e => showEdit ? setShowEdit(f => ({ ...f, subdomain: e.target.value.toLowerCase() })) : setForm(f => ({ ...f, subdomain: e.target.value.toLowerCase() }))} />
              </FormField>
              <FormField label="Domain">
                <Input placeholder="e.g. sunrise.com" value={showEdit ? showEdit.domain : form.domain} onChange={e => showEdit ? setShowEdit(f => ({ ...f, domain: e.target.value })) : setForm(f => ({ ...f, domain: e.target.value }))} />
              </FormField>
              <FormField label="Contact Email" required>
                <Input type="email" placeholder="admin@sunrise.com" value={showEdit ? showEdit.contactEmail : form.contactEmail} onChange={e => showEdit ? setShowEdit(f => ({ ...f, contactEmail: e.target.value })) : setForm(f => ({ ...f, contactEmail: e.target.value }))} />
              </FormField>
              <FormField label="Contact Phone">
                <Input type="tel" placeholder="+91..." value={showEdit ? showEdit.contactPhone : form.contactPhone} onChange={e => showEdit ? setShowEdit(f => ({ ...f, contactPhone: e.target.value })) : setForm(f => ({ ...f, contactPhone: e.target.value }))} />
              </FormField>
              <FormField label="Address" className="sm:col-span-2">
                <Input placeholder="123 Main St..." value={showEdit ? showEdit.address : form.address} onChange={e => showEdit ? setShowEdit(f => ({ ...f, address: e.target.value })) : setForm(f => ({ ...f, address: e.target.value }))} />
              </FormField>
              <FormField label="Subscription Plan">
                <Select value={showEdit ? showEdit.planType : form.planType} onChange={e => showEdit ? setShowEdit(f => ({ ...f, planType: e.target.value })) : setForm(f => ({ ...f, planType: e.target.value }))}>
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="premium">Premium</option>
                  <option value="enterprise">Enterprise</option>
                </Select>
              </FormField>

              {!showEdit && (
                <>
                  <div className="sm:col-span-2 mt-4 pt-4 border-t border-surface-100 dark:border-surface-700">
                    <h4 className="text-sm font-medium text-surface-800 dark:text-white mb-1">Institute Owner (Super Admin)</h4>
                    <p className="text-xs text-surface-400 mb-4">These credentials will be used by the institute owner to log in.</p>
                  </div>
                  <FormField label="Admin First Name" required>
                    <Input placeholder="John" value={form.adminFirstName} onChange={e => setForm(f => ({ ...f, adminFirstName: e.target.value }))} />
                  </FormField>
                  <FormField label="Admin Last Name" required>
                    <Input placeholder="Doe" value={form.adminLastName} onChange={e => setForm(f => ({ ...f, adminLastName: e.target.value }))} />
                  </FormField>
                  <FormField label="Admin Login Email" required>
                    <Input type="email" placeholder="admin@institute.com" value={form.adminEmail} onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))} />
                  </FormField>
                  <FormField label="Admin Password" required>
                    <Input type="password" placeholder="********" value={form.adminPassword} onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))} />
                  </FormField>
                </>
              )}
            </div>
            
            <div className="flex items-center justify-end gap-3 pt-6 mt-8 border-t border-surface-100 dark:border-surface-700">
              <Button variant="outline" onClick={() => showEdit ? setShowEdit(null) : setShowAdd(false)}>Cancel</Button>
              <Button variant="gradient" loading={loading} onClick={showEdit ? handleEditSave : handleAdd}>
                {showEdit ? 'Save Changes' : 'Create Institute'}
              </Button>
            </div>
          </Card>
        </>
      )}



      {/* View Institute Impersonation Modal */}
      {showView && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-surface-50 dark:bg-surface-900 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-surface-800 border-b border-surface-100 dark:border-surface-700 shadow-sm z-10">
            <div className="flex items-center gap-4">
              <Avatar name={showView.name} size="md" />
              <div>
                <h2 className="text-lg font-bold text-surface-900 dark:text-white">
                  Viewing Institute: {showView.name}
                </h2>
                <p className="text-sm text-surface-500">
                  You are currently viewing this institute's portal as an Administrator.
                </p>
              </div>
            </div>
            <Button variant="danger" icon={PowerOff} onClick={() => setShowView(null)}>
              Exit View
            </Button>
          </div>
          <div className="flex-1 w-full bg-surface-100 dark:bg-surface-900 relative">
            <iframe
              src={`/admin/dashboard?impersonateId=${showView._id || showView.id}`}
              className="absolute inset-0 w-full h-full border-0"
              title="Institute Admin Portal"
            />
          </div>
        </div>
      )}

      <DeleteModal isOpen={!!showDelete} onClose={() => setShowDelete(null)} onConfirm={handleDelete} itemName={showDelete?.name} loading={loading} />
    </div>
  );
}
