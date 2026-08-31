import { useState, useEffect } from 'react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { DataTable, RowActions } from '../../../components/tables/DataTable.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/modals/index.jsx';
import { FormField, Select } from '../../../components/forms/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Edit2, History, Calendar, UserPlus } from 'lucide-react';
import { formatDate } from '../../../utils/helpers.js';
import toast from 'react-hot-toast';
import api from '../../../api/axiosInstance.js';

export default function MyLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showTimeline, setShowTimeline] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [statusForm, setStatusForm] = useState({ status: '', remark: '' });

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await api.get('/leads/my-leads');
      setLeads(res.data.data);
    } catch (error) {
      toast.error('Failed to load your leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'New': return 'badge-info';
      case 'In-Progress': return 'badge-warning';
      case 'Converted': return 'badge-success';
      case 'Dead': return 'badge-danger';
      default: return 'badge-surface';
    }
  };

  const columns = [
    { header: 'Student Name', accessorKey: 'studentName' },
    { header: 'Mobile', accessorKey: 'mobileNumber' },
    { header: 'Class', accessorKey: 'studentClass' },
    { header: 'Inquiry For', accessorKey: 'inquiryFor' },
    { 
      header: 'Status', 
      accessorKey: 'status',
      cell: (r) => <span className={`badge ${getStatusBadge(r.status)}`}>{r.status}</span>
    },
    { header: 'Claimed On', accessorKey: 'claimedAt', cell: (r) => formatDate(r.claimedAt) },
    {
      header: 'Actions',
      key: 'actions',
      sortable: false,
      cell: (row) => (
        <RowActions actions={[
          { 
            label: 'Update Status & Remark', 
            icon: Edit2, 
            onClick: () => {
              setSelectedLead(row);
              setStatusForm({ status: row.status, remark: '' });
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

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="My Leads"
        subtitle="Leads currently assigned to you."
        breadcrumbs={['Home', 'My Leads']} 
      />

      <Card className="p-5">
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
          </div>
          <DataTable 
            data={leads.filter(l => statusFilter === 'All' || l.status === statusFilter)} 
            columns={columns} 
            isLoading={loading}
            searchable 
            searchPlaceholder="Search leads..." 
          />
        </div>
      </Card>

      {/* Update Status Modal */}
      {selectedLead && (
        <Modal isOpen={!!selectedLead} onClose={() => setSelectedLead(null)} size="md">
          <ModalHeader title={`Update Lead: ${selectedLead.studentName}`} onClose={() => setSelectedLead(null)} />
          <ModalBody className="space-y-4">
            <FormField label="Status" required>
              <Select 
                value={statusForm.status} 
                onChange={(e) => setStatusForm(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="New">New</option>
                <option value="In-Progress">In-Progress</option>
                <option value="Converted">Converted</option>
                <option value="Dead">Dead</option>
              </Select>
            </FormField>
            
            <FormField label="Remark / Follow-up Note" required>
              <textarea 
                className="input min-h-[100px] w-full p-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-y text-surface-800 dark:text-white"
                placeholder="Add notes about your call, next follow-up date, etc..."
                value={statusForm.remark}
                onChange={(e) => setStatusForm(prev => ({ ...prev, remark: e.target.value }))}
              />
            </FormField>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setSelectedLead(null)}>Cancel</Button>
            <Button variant="gradient" onClick={async () => {
              if (!statusForm.remark) {
                toast.error('Please add a remark');
                return;
              }
              try {
                await api.patch(`/leads/${selectedLead._id}/status`, statusForm);
                toast.success('Lead updated successfully!');
                setSelectedLead(null);
                fetchLeads();
              } catch (error) {
                toast.error('Failed to update lead');
              }
            }}>Save Update</Button>
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
                  <p className="text-xs text-surface-500">Mobile</p>
                  <p className="font-medium mt-1">{showTimeline.mobileNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-surface-500">City</p>
                  <p className="font-medium mt-1">{showTimeline.city || '-'}</p>
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
                            isPast ? 'border-success bg-success text-white' : 'border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 text-surface-400'}`}
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
