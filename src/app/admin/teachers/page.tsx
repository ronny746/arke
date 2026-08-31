"use client";

import { useState, useEffect } from 'react';
import { Users, Plus, Upload, Trash, Briefcase } from 'lucide-react';
import { useDeveloperStore } from '@/store';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card } from '@/components/ui/index.jsx';
import { DataTable, RowActions } from '@/components/tables/DataTable.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { adminAPI } from '@/api/index.js';
import toast from 'react-hot-toast';

export default function TeachersPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [showDelete, setShowDelete] = useState(null);
  const { isDeveloperMode } = useDeveloperStore();
  const [formLoading, setFormLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Teacher Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    role: 'teacher'
  });

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getUsers({ role: 'teacher' });
      setData(res.data?.data || []);
    } catch (error) {
      toast.error('Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to move this teacher to the Recycle Bin?")) return;
    try {
      await adminAPI.deleteUser(id);
      toast.success("Teacher moved to Recycle Bin");
      fetchTeachers();
    } catch (err) {
      toast.error("Failed to delete teacher");
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setFormLoading(true);
      await adminAPI.createUser(formData);
      toast.success("Teacher created successfully!");
      setShowCreateModal(false);
      setFormData({ firstName: '', lastName: '', email: '', password: '', phone: '', role: 'teacher' });
      fetchTeachers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create teacher");
    } finally {
      setFormLoading(false);
    }
  };

  const columns = [
    { header: 'Name', cell: (row) => `${row.firstName} ${row.lastName}` },
    { header: 'Email', accessorKey: 'email' },
    { header: 'Phone', accessorKey: 'phone' },
    {
      header: 'Actions',
      cell: (row) => {
        const baseActions = [];
          
        baseActions.push({ 
          label: 'Move to Recycle Bin', 
          icon: Trash, 
          danger: true, 
          onClick: () => handleDelete(row._id) 
        });
          
        return <RowActions actions={baseActions} />;
      }
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Teachers Management"
        subtitle="Manage and organize your teaching staff"
        breadcrumbs={['Home', 'Teachers']}
        actions={
          <div className="flex gap-2">
            <Button variant="gradient" icon={Plus} onClick={() => setShowCreateModal(true)}>
              Add Teacher
            </Button>
          </div>
        }
      />

      <Card className="p-5">
        <DataTable
          data={data}
          columns={columns}
          searchable
          emptyTitle="No teachers found"
          emptyDescription="Start by adding teachers to the system."
          emptyIcon={Briefcase}
        />
      </Card>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Add Teacher</h2>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name</label>
                  <input required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full p-2 border rounded-lg bg-surface-50 dark:bg-surface-900 border-surface-200 dark:border-surface-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name</label>
                  <input required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full p-2 border rounded-lg bg-surface-50 dark:bg-surface-900 border-surface-200 dark:border-surface-700" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2 border rounded-lg bg-surface-50 dark:bg-surface-900 border-surface-200 dark:border-surface-700" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-2 border rounded-lg bg-surface-50 dark:bg-surface-900 border-surface-200 dark:border-surface-700" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-2 border rounded-lg bg-surface-50 dark:bg-surface-900 border-surface-200 dark:border-surface-700" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
