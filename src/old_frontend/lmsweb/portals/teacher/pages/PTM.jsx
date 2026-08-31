import { useState, useEffect } from 'react';
import { CalendarDays, Plus, Clock, Save, Users } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card, StatCard } from '../../../components/ui/index.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/modals/index.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { FormField, Input } from '../../../components/forms/index.jsx';
import { teacherAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function PTM() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('slots');
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    durationMinutes: 15
  });

  const fetchPTM = async () => {
    try {
      setLoading(true);
      const [slotsRes, bookingsRes] = await Promise.all([
        teacherAPI.getPtmSlots(),
        teacherAPI.getPtmBookings()
      ]);
      setSlots(Array.isArray(slotsRes.data?.data) ? slotsRes.data.data : []);
      setBookings(Array.isArray(bookingsRes.data?.data) ? bookingsRes.data.data : []);
    } catch (error) {
      toast.error('Failed to load PTM sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPTM();
  }, []);

  const handleCreate = async () => {
    if (!formData.date || !formData.startTime || !formData.endTime) {
      toast.error('Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      await teacherAPI.createPtmSlot({
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        durationMinutes: parseInt(formData.durationMinutes, 10)
      });
      toast.success('PTM Slots created successfully!');
      setIsModalOpen(false);
      fetchPTM();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create PTM slots');
    } finally {
      setSaving(false);
    }
  };

  const slotColumns = [
    { 
      header: 'Date', 
      accessorKey: 'startTime',
      cell: (row) => format(new Date(row.startTime), 'MMM dd, yyyy')
    },
    { 
      header: 'Timing', 
      cell: (row) => `${format(new Date(row.startTime), 'hh:mm a')} - ${format(new Date(row.endTime), 'hh:mm a')}` 
    },
    { 
      header: 'Status', 
      accessorKey: 'isBooked',
      cell: (row) => (
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
          row.isBooked ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-500' : 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-500'
        }`}>
          {row.isBooked ? 'Booked' : 'Available'}
        </span>
      )
    },
  ];

  const bookingColumns = [
    { 
      header: 'Date & Time', 
      cell: (row) => row.slotId ? `${format(new Date(row.slotId.startTime), 'MMM dd, yyyy')} | ${format(new Date(row.slotId.startTime), 'hh:mm a')} - ${format(new Date(row.slotId.endTime), 'hh:mm a')}` : 'N/A'
    },
    { 
      header: 'Parent', 
      cell: (row) => row.parentId ? `${row.parentId.firstName} ${row.parentId.lastName}` : 'N/A'
    },
    { 
      header: 'Student', 
      cell: (row) => row.studentId ? `${row.studentId.firstName} ${row.studentId.lastName}` : 'N/A'
    },
    { 
      header: 'Meeting Link', 
      cell: (row) => row.meetingLink ? (
        <a href={row.meetingLink} target="_blank" rel="noreferrer" className="text-primary hover:underline">Join Meeting</a>
      ) : 'In-Person / TBD'
    },
    { 
      header: 'Status', 
      accessorKey: 'status',
      cell: (row) => (
        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-500">
          {row.status}
        </span>
      )
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Parent-Teacher Meetings"
        subtitle="Manage your PTM availability and confirmed meetings"
        breadcrumbs={['Home', 'PTM Booking']}
        actions={
          <Button variant="gradient" icon={Plus} onClick={() => setIsModalOpen(true)}>
            Create Availability
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Available Slots" value={slots.length} icon={CalendarDays} color="primary" />
        <StatCard title="Confirmed Bookings" value={bookings.length} icon={Users} color="success" />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-surface-200 dark:border-surface-700">
          <nav className="flex gap-4 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('slots')}
              className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'slots'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300 dark:text-surface-400 dark:hover:text-surface-300'
              }`}
            >
              <Clock size={18} />
              Available Slots
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'bookings'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300 dark:text-surface-400 dark:hover:text-surface-300'
              }`}
            >
              <Users size={18} />
              My Bookings
            </button>
          </nav>
        </div>

        <div className="p-5 sm:p-6">
          {activeTab === 'slots' ? (
            <DataTable
              columns={slotColumns}
              data={slots}
              loading={loading}
              searchPlaceholder="Search slots..."
            />
          ) : (
            <DataTable
              columns={bookingColumns}
              data={bookings}
              loading={loading}
              searchPlaceholder="Search bookings..."
              emptyIcon={Users}
              emptyTitle="No Bookings Yet"
              emptyDescription="You will see confirmed PTM bookings here."
            />
          )}
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="md"
      >
        <ModalHeader title="Create PTM Availability" onClose={() => setIsModalOpen(false)} />
        <ModalBody className="space-y-4 pt-4">
          <FormField label="Date" required>
            <Input 
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </FormField>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Time" required>
              <Input 
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </FormField>
            <FormField label="End Time" required>
              <Input 
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </FormField>
          </div>

          <FormField label="Duration per Slot (minutes)" required hint="We will automatically split the time range into multiple slots of this duration.">
            <Input 
              type="number"
              min="5"
              max="60"
              value={formData.durationMinutes}
              onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
            />
          </FormField>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="gradient" onClick={handleCreate} loading={saving} icon={Save}>
            Create Slots
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
