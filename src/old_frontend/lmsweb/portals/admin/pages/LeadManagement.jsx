import { useState, useEffect } from 'react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { DataTable, RowActions } from '../../../components/tables/DataTable.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/modals/index.jsx';
import { FormField, Input, Select } from '../../../components/forms/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Plus, UserPlus, Users, BarChart, History, Calendar, FileText } from 'lucide-react';
import { formatDate } from '../../../utils/helpers.js';
import toast from 'react-hot-toast';
import api from '../../../api/axiosInstance.js';
import { adminAPI } from '../../../api/index.js';

export default function AdminLeadManagement() {
  const [leads, setLeads] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('leads'); // 'leads' or 'performance'
  
  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [showAssign, setShowAssign] = useState(null);
  const [showTimeline, setShowTimeline] = useState(null);
  const [showStaffLeads, setShowStaffLeads] = useState(null); // stores staff object when drilling down
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [staffFilter, setStaffFilter] = useState('All');
  const [staffLeadsStatusFilter, setStaffLeadsStatusFilter] = useState('All');
  
  // Forms
  const [form, setForm] = useState({ studentName: '', mobileNumber: '', city: '', inquiryFor: '', studentClass: '' });
  const [assignForm, setAssignForm] = useState({ assignedTo: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leadsRes, staffRes] = await Promise.all([
        api.get('/leads'),
        adminAPI.getUsers()
      ]);
      setLeads(leadsRes.data.data);
      
      const allUsers = Array.isArray(staffRes.data?.data) ? staffRes.data.data : (staffRes.data?.data?.users || []);
      const staffMembers = allUsers.filter(u => u.role === 'staff');
      setStaffList(staffMembers);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    try {
      await api.post('/leads', form);
      toast.success('Lead created successfully');
      setShowAdd(false);
      setForm({ studentName: '', mobileNumber: '', city: '', inquiryFor: '', studentClass: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create lead');
    }
  };

  const handleAssign = async () => {
    try {
      await api.patch(`/leads/${showAssign._id}/assign`, assignForm);
      toast.success('Lead assigned successfully');
      setShowAssign(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign lead');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'New': return 'badge-info';
      case 'In-Progress': return 'badge-warning';
      case 'Converted': return 'badge-success';
      case 'Dead': return 'badge-danger';
      default: return 'badge-surface';
    }
  };

  const leadsColumns = [
    { header: 'Student Name', accessorKey: 'studentName' },
    { header: 'Mobile', accessorKey: 'mobileNumber' },
    { header: 'City', accessorKey: 'city' },
    { 
      header: 'Assigned To', 
      accessorKey: 'assignedTo',
      cell: (r) => r.assignedTo ? (
        <div>
          <p className="font-medium text-sm">{r.assignedTo.firstName} {r.assignedTo.lastName}</p>
          <p className="text-xs text-surface-500">{r.assignedTo.metadata?.designation || 'Staff'}</p>
        </div>
      ) : (
        <span className="badge badge-surface">Unassigned (Pool)</span>
      )
    },
    { 
      header: 'Status', 
      accessorKey: 'status',
      cell: (r) => <span className={`badge ${getStatusBadge(r.status)}`}>{r.status}</span>
    },
    { header: 'Added On', accessorKey: 'createdAt', cell: (r) => formatDate(r.createdAt) },
    {
      header: 'Actions',
      key: 'actions',
      sortable: false,
      cell: (row) => (
        <RowActions actions={[
          { 
            label: 'Assign Staff', 
            icon: UserPlus, 
            onClick: () => {
              setShowAssign(row);
              setAssignForm({ assignedTo: row.assignedTo?._id || '' });
            } 
          },
          {
            label: 'View Timeline',
            icon: History,
            onClick: () => setShowTimeline(row)
          }
        ]} />
      )
    }
  ];

  const staffLeadsColumns = [
    { header: 'Student Name', accessorKey: 'studentName' },
    { header: 'Mobile', accessorKey: 'mobileNumber' },
    { header: 'City', accessorKey: 'city' },
    { 
      header: 'Status', 
      accessorKey: 'status',
      cell: (r) => <span className={`badge ${getStatusBadge(r.status)}`}>{r.status}</span>
    },
    { header: 'Added On', accessorKey: 'createdAt', cell: (r) => formatDate(r.createdAt) },
    {
      header: 'Actions',
      key: 'actions',
      sortable: false,
      cell: (row) => (
        <RowActions actions={[
          {
            label: 'View Timeline',
            icon: History,
            onClick: () => {
              setShowStaffLeads(null);
              setShowTimeline(row);
            }
          }
        ]} />
      )
    }
  ];

  const getStaffPerformance = () => {
    return staffList.map(staff => {
      const staffLeads = leads.filter(l => l.assignedTo?._id === staff._id);
      const metrics = {
        total: staffLeads.length,
        new: staffLeads.filter(l => l.status === 'New').length,
        inProgress: staffLeads.filter(l => l.status === 'In-Progress').length,
        converted: staffLeads.filter(l => l.status === 'Converted').length,
        dead: staffLeads.filter(l => l.status === 'Dead').length,
      };
      
      const conversionRate = metrics.total > 0 ? Math.round((metrics.converted / metrics.total) * 100) : 0;
      
      return {
        ...staff,
        ...metrics,
        conversionRate,
        leads: staffLeads // store leads for drill-down
      };
    });
  };

  const performanceColumns = [
    { 
      header: 'Staff Member', 
      accessorKey: 'firstName',
      cell: (r) => (
        <div>
          <p className="font-medium text-surface-800 dark:text-white">{r.firstName} {r.lastName}</p>
          <p className="text-xs text-surface-500">{r.metadata?.designation || 'Staff Member'}</p>
        </div>
      )
    },
    { header: 'Total Assigned', accessorKey: 'total' },
    { 
      header: 'New', 
      accessorKey: 'new',
      cell: (r) => <span className="text-info-600 dark:text-info-400 font-medium">{r.new}</span>
    },
    { 
      header: 'In Progress', 
      accessorKey: 'inProgress',
      cell: (r) => <span className="text-warning-600 dark:text-warning-400 font-medium">{r.inProgress}</span>
    },
    { 
      header: 'Converted', 
      accessorKey: 'converted',
      cell: (r) => <span className="text-success-600 dark:text-success-400 font-medium">{r.converted}</span>
    },
    { 
      header: 'Dead', 
      accessorKey: 'dead',
      cell: (r) => <span className="text-danger-600 dark:text-danger-400 font-medium">{r.dead}</span>
    },
    { 
      header: 'Conversion Rate', 
      accessorKey: 'conversionRate',
      cell: (r) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden w-24">
            <div className="h-full bg-success rounded-full" style={{ width: `${r.conversionRate}%` }} />
          </div>
          <span className="text-sm font-medium">{r.conversionRate}%</span>
        </div>
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      sortable: false,
      cell: (r) => (
        <Button variant="ghost" size="sm" onClick={() => setShowStaffLeads(r)}>
          View Leads
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Lead Management"
        subtitle="Manage leads and track staff assignment."
        breadcrumbs={['Home', 'Leads']} 
        actions={
          activeTab === 'leads' ? (
            <Button variant="gradient" icon={Plus} onClick={() => setShowAdd(true)}>New Lead</Button>
          ) : null
        }
      />

      <div className="flex bg-surface-100 dark:bg-surface-800/50 p-1 rounded-xl w-fit">
        <button
          onClick={() => {
            setActiveTab('leads');
            setShowStaffLeads(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'leads'
              ? 'bg-white dark:bg-surface-800 text-primary shadow-sm'
              : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
          }`}
        >
          <Users size={16} />
          All Leads
        </button>
        <button
          onClick={() => {
            setActiveTab('performance');
            setShowStaffLeads(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'performance'
              ? 'bg-white dark:bg-surface-800 text-primary shadow-sm'
              : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
          }`}
        >
          <BarChart size={16} />
          Staff Performance
        </button>
      </div>

      <Card className="p-5">
        {activeTab === 'leads' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 items-center mb-2">
              <div className="w-48">
                <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full">
                  <option value="All">All Statuses</option>
                  <option value="New">New</option>
                  <option value="In-Progress">In-Progress</option>
                  <option value="Converted">Converted</option>
                  <option value="Dead">Dead</option>
                </Select>
              </div>
              <div className="w-64">
                <Select value={staffFilter} onChange={e => setStaffFilter(e.target.value)} className="w-full">
                  <option value="All">All Staff (Including Unassigned)</option>
                  <option value="Unassigned">Unassigned Pool Only</option>
                  {staffList.map(s => (
                    <option key={s._id} value={s._id}>{s.firstName} {s.lastName}</option>
                  ))}
                </Select>
              </div>
            </div>
            <DataTable 
              data={leads.filter(l => {
                if (statusFilter !== 'All' && l.status !== statusFilter) return false;
                if (staffFilter === 'Unassigned' && l.assignedTo) return false;
                if (staffFilter !== 'All' && staffFilter !== 'Unassigned' && l.assignedTo?._id !== staffFilter) return false;
                return true;
              })} 
              columns={leadsColumns} 
              isLoading={loading}
              searchable 
              searchPlaceholder="Search leads by name, mobile, city..." 
            />
          </div>
        ) : showStaffLeads ? (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-wrap gap-4 items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setShowStaffLeads(null)}>
                  &larr; Back to Performance
                </Button>
                <h3 className="font-semibold text-surface-800 dark:text-white">
                  Leads assigned to {showStaffLeads.firstName}
                </h3>
              </div>
              <div className="w-48">
                <Select value={staffLeadsStatusFilter} onChange={e => setStaffLeadsStatusFilter(e.target.value)} className="w-full">
                  <option value="All">All Statuses</option>
                  <option value="New">New</option>
                  <option value="In-Progress">In-Progress</option>
                  <option value="Converted">Converted</option>
                  <option value="Dead">Dead</option>
                </Select>
              </div>
            </div>
            <DataTable 
              data={showStaffLeads.leads.filter(l => staffLeadsStatusFilter === 'All' || l.status === staffLeadsStatusFilter)} 
              columns={staffLeadsColumns} 
              searchable 
              searchPlaceholder="Search assigned leads..."
            />
          </div>
        ) : (
          <DataTable 
            data={getStaffPerformance()} 
            columns={performanceColumns} 
            isLoading={loading}
            searchable 
            searchPlaceholder="Search staff..." 
          />
        )}
      </Card>

      {/* Add Lead Modal */}
      {showAdd && (
        <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} size="md">
          <ModalHeader title="Create New Lead" onClose={() => setShowAdd(false)} />
          <ModalBody className="space-y-4">
            <FormField label="Student Name" required>
              <Input value={form.studentName} onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))} />
            </FormField>
            <FormField label="Mobile Number" required>
              <Input type="tel" value={form.mobileNumber} onChange={e => setForm(f => ({ ...f, mobileNumber: e.target.value }))} />
            </FormField>
            <FormField label="City">
              <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </FormField>
            <FormField label="Class">
              <Input value={form.studentClass} onChange={e => setForm(f => ({ ...f, studentClass: e.target.value }))} />
            </FormField>
            <FormField label="Inquiry For">
              <Input placeholder="e.g. JEE, NEET" value={form.inquiryFor} onChange={e => setForm(f => ({ ...f, inquiryFor: e.target.value }))} />
            </FormField>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button variant="gradient" onClick={handleCreate}>Create Lead</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Assign Lead Modal */}
      {showAssign && (
        <Modal isOpen={!!showAssign} onClose={() => setShowAssign(null)} size="md">
          <ModalHeader title="Assign Lead to Staff" onClose={() => setShowAssign(null)} />
          <ModalBody className="space-y-4">
            <p className="text-sm text-surface-500 mb-2">Assigning lead: <span className="font-semibold text-surface-800 dark:text-white">{showAssign.studentName}</span></p>
            <FormField label="Select Staff Member" required>
              <Select 
                value={assignForm.assignedTo} 
                onChange={e => setAssignForm({ assignedTo: e.target.value })}
              >
                <option value="">Move to Unassigned Pool</option>
                {staffList.map(staff => (
                  <option key={staff._id} value={staff._id}>
                    {staff.firstName} {staff.lastName} ({staff.metadata?.designation || staff.role})
                  </option>
                ))}
              </Select>
            </FormField>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowAssign(null)}>Cancel</Button>
            <Button variant="gradient" onClick={handleAssign}>Save Assignment</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Timeline Modal */}
      {showTimeline && (
        <Modal isOpen={!!showTimeline} onClose={() => setShowTimeline(null)} size="lg">
          <ModalHeader title={`Lead Timeline: ${showTimeline.studentName}`} onClose={() => setShowTimeline(null)} />
          <ModalBody>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-surface-50 dark:bg-surface-800/50 p-4 rounded-xl">
                <div>
                  <p className="text-xs text-surface-500">Current Status</p>
                  <p className="font-medium"><span className={`badge ${getStatusBadge(showTimeline.status)} mt-1`}>{showTimeline.status}</span></p>
                </div>
                <div>
                  <p className="text-xs text-surface-500">Assigned To</p>
                  <p className="font-medium mt-1">
                    {showTimeline.assignedTo 
                      ? `${showTimeline.assignedTo.firstName} ${showTimeline.assignedTo.lastName}`
                      : 'Unassigned'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-surface-500">Mobile</p>
                  <p className="font-medium mt-1">{showTimeline.mobileNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-surface-500">Inquiry For</p>
                  <p className="font-medium mt-1">{showTimeline.inquiryFor || '-'}</p>
                </div>
              </div>

              {/* Visual Status Pipeline */}
              <div className="py-6 px-4">
                <div className="relative flex justify-between items-center max-w-sm mx-auto">
                  {/* Background track */}
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-surface-200 dark:bg-surface-700 -translate-y-1/2 z-0 rounded-full" />
                  
                  {/* Active track */}
                  <div 
                    className={`absolute top-1/2 left-0 h-1 -translate-y-1/2 z-0 rounded-full transition-all duration-500 ${showTimeline.status === 'Dead' ? 'bg-danger' : 'bg-success'}`}
                    style={{
                      width: showTimeline.status === 'New' ? '0%' :
                             showTimeline.status === 'In-Progress' ? '50%' :
                             showTimeline.status === 'Converted' || showTimeline.status === 'Dead' ? '100%' : '0%'
                    }}
                  />

                  {['New', 'In-Progress', showTimeline.status === 'Dead' ? 'Dead' : 'Converted'].map((step, idx) => {
                    let isActive = false;
                    let isPast = false;
                    
                    if (showTimeline.status === 'Converted' || showTimeline.status === 'Dead') {
                      isPast = true;
                      isActive = (showTimeline.status === step);
                    } else if (showTimeline.status === 'In-Progress') {
                      isPast = (step === 'New' || step === 'In-Progress');
                      isActive = (step === 'In-Progress');
                    } else if (showTimeline.status === 'New') {
                      isPast = (step === 'New');
                      isActive = (step === 'New');
                    }

                    return (
                      <div key={step} className="relative z-10 flex flex-col items-center gap-2 bg-surface-50 dark:bg-surface-800 px-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold text-xs transition-colors
                          ${isActive ? (step === 'Dead' ? 'border-danger bg-danger text-white' : 'border-success bg-success text-white') : 
                            isPast ? 'border-success bg-success text-white' : 'border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-surface-400'}`}
                        >
                          {idx + 1}
                        </div>
                        <span className={`text-xs font-semibold ${isActive || isPast ? 'text-surface-800 dark:text-white' : 'text-surface-400'}`}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-4 text-surface-800 dark:text-white flex items-center gap-2">
                  <History size={18} /> Follow-up History
                </h4>
                {(!showTimeline.followUps || showTimeline.followUps.length === 0) ? (
                  <div className="text-center p-6 bg-surface-50 dark:bg-surface-800/30 rounded-xl border border-surface-200 dark:border-surface-700">
                    <p className="text-surface-500">No timeline history available for this lead.</p>
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:inset-y-0 before:left-[11px] before:w-0.5 before:bg-surface-200 dark:before:bg-surface-700">
                    {showTimeline.followUps.map((item, idx) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-6 w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/30 border-2 border-primary flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        </div>
                        <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl p-4 ml-4 shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <span className={`badge ${getStatusBadge(item.status)}`}>{item.status}</span>
                            <div className="flex items-center gap-1.5 text-xs text-surface-500">
                              <Calendar size={14} />
                              {formatDate(item.date)}
                            </div>
                          </div>
                          <p className="text-sm text-surface-600 dark:text-surface-300 mb-2">{item.remark}</p>
                          {item.updatedBy && (
                            <p className="text-xs font-medium text-surface-500 flex items-center gap-1">
                              <UserPlus size={12} />
                              Updated by: {item.updatedBy.firstName} {item.updatedBy.lastName}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ModalBody>
        </Modal>
      )}
    </div>
  );
}
