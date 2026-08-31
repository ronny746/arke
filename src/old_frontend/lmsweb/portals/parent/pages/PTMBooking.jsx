import { useState, useEffect } from 'react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card, StatCard } from '../../../components/ui/index.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/modals/index.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Calendar, Clock, Users, CalendarCheck, HelpCircle } from 'lucide-react';
import { parentAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function PTMBooking() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('slots');
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  
  // Modal State
  const [slotToBook, setSlotToBook] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  const fetchPTMData = async () => {
    try {
      setLoading(true);
      const [dashRes, slotsRes, bookingsRes] = await Promise.all([
        parentAPI.getDashboard(),
        parentAPI.getPtmSlots(),
        parentAPI.getPtmBookings()
      ]);
      
      const dashboardChildren = dashRes.data?.data?.children || [];
      setChildren(dashboardChildren);
      if (dashboardChildren.length > 0 && !selectedChildId) {
        setSelectedChildId(dashboardChildren[0]._id || dashboardChildren[0].id);
      }

      setSlots(Array.isArray(slotsRes.data?.data) ? slotsRes.data.data : []);
      setBookings(Array.isArray(bookingsRes.data?.data) ? bookingsRes.data.data : []);
    } catch (err) {
      toast.error('Failed to load PTM data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPTMData();
  }, []);

  const initiateBooking = (slot) => {
    if (!selectedChildId) {
      toast.error('Please select a student first');
      return;
    }
    setSlotToBook(slot);
  };

  const confirmBooking = async () => {
    if (!slotToBook || !selectedChildId) return;
    
    setBookingLoading(true);
    try {
      await parentAPI.bookPtmSlot(slotToBook._id || slotToBook.id, { studentId: selectedChildId });
      toast.success('PTM Slot booked successfully!');
      setSlotToBook(null);
      fetchPTMData(); // Refresh both slots and bookings
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to book slot');
    } finally {
      setBookingLoading(false);
    }
  };

  const slotColumns = [
    { 
      header: 'Date', 
      accessorKey: 'startTime',
      cell: (r) => format(new Date(r.startTime), 'MMM dd, yyyy')
    },
    { 
      header: 'Time', 
      cell: (r) => `${format(new Date(r.startTime), 'hh:mm a')} - ${format(new Date(r.endTime), 'hh:mm a')}` 
    },
    { 
      header: 'Teacher', 
      cell: (r) => r.teacherId ? `${r.teacherId.firstName} ${r.teacherId.lastName}` : 'N/A' 
    },
    {
      header: 'Actions',
      cell: (r) => (
        <Button variant="gradient" size="sm" onClick={() => initiateBooking(r)}>
          Book Slot
        </Button>
      )
    }
  ];

  const bookingColumns = [
    { 
      header: 'Date & Time', 
      cell: (r) => r.slotId ? `${format(new Date(r.slotId.startTime), 'MMM dd, yyyy')} | ${format(new Date(r.slotId.startTime), 'hh:mm a')} - ${format(new Date(r.slotId.endTime), 'hh:mm a')}` : 'N/A'
    },
    { 
      header: 'Teacher', 
      cell: (r) => r.slotId?.teacherId ? `${r.slotId.teacherId.firstName} ${r.slotId.teacherId.lastName}` : 'N/A' 
    },
    { 
      header: 'Student', 
      cell: (r) => r.studentId ? `${r.studentId.firstName} ${r.studentId.lastName}` : 'N/A' 
    },
    { 
      header: 'Meeting Link', 
      cell: (row) => row.meetingLink ? (
        <a href={row.meetingLink} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">Join Meeting</a>
      ) : 'In-Person / TBD'
    },
    { 
      header: 'Status', 
      accessorKey: 'status',
      cell: (r) => (
        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-500">
          {r.status}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="PTM Booking" 
        subtitle="Book appointments with teachers and view confirmed meetings" 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard title="Available Slots" value={slots.length} icon={Calendar} color="primary" />
        <StatCard title="My Bookings" value={bookings.length} icon={Users} color="success" />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-surface-200 dark:border-surface-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6">
          <nav className="flex gap-4" aria-label="Tabs">
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
          
          {/* Student Selector for booking */}
          {activeTab === 'slots' && (
            <div className="flex items-center gap-2 pb-4 sm:pb-0">
              <span className="text-sm font-medium text-surface-600 dark:text-surface-300">Booking for:</span>
              {children.length > 0 ? (
                <select
                  value={selectedChildId}
                  onChange={(e) => setSelectedChildId(e.target.value)}
                  className="input-field py-1.5 px-3 text-sm"
                >
                  {children.map(child => (
                    <option key={child._id || child.id} value={child._id || child.id}>
                      {child.firstName} {child.lastName}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm text-danger-500 font-medium">No children linked to your account.</span>
              )}
            </div>
          )}
        </div>

        <div className="p-5 sm:p-6">
          {activeTab === 'slots' ? (
            <DataTable
              columns={slotColumns}
              data={slots}
              loading={loading}
              searchPlaceholder="Search slots..."
              emptyIcon={Calendar}
              emptyTitle="No PTM slots available"
            />
          ) : (
            <DataTable
              columns={bookingColumns}
              data={bookings}
              loading={loading}
              searchPlaceholder="Search bookings..."
              emptyIcon={Users}
              emptyTitle="No Bookings"
              emptyDescription="You have not booked any PTM slots yet."
            />
          )}
        </div>
      </Card>

      {/* Modern Confirmation Modal */}
      <Modal isOpen={!!slotToBook} onClose={() => setSlotToBook(null)} size="sm">
        <ModalHeader title="Confirm Appointment" onClose={() => setSlotToBook(null)} />
        <ModalBody className="py-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mb-4">
            <CalendarCheck className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-surface-800 dark:text-surface-100 mb-2">Book PTM Slot?</h3>
          {slotToBook && (
            <div className="bg-surface-50 dark:bg-surface-800/50 rounded-xl p-4 w-full text-sm space-y-2 border border-surface-100 dark:border-surface-700">
              <div className="flex justify-between items-center">
                <span className="text-surface-500 font-medium">Date</span>
                <span className="text-surface-800 dark:text-surface-200 font-semibold">{format(new Date(slotToBook.startTime), 'MMM dd, yyyy')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-surface-500 font-medium">Time</span>
                <span className="text-surface-800 dark:text-surface-200 font-semibold">{format(new Date(slotToBook.startTime), 'hh:mm a')} - {format(new Date(slotToBook.endTime), 'hh:mm a')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-surface-500 font-medium">Teacher</span>
                <span className="text-surface-800 dark:text-surface-200 font-semibold">{slotToBook.teacherId ? `${slotToBook.teacherId.firstName} ${slotToBook.teacherId.lastName}` : 'N/A'}</span>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setSlotToBook(null)} disabled={bookingLoading} className="flex-1">
            Cancel
          </Button>
          <Button variant="gradient" onClick={confirmBooking} loading={bookingLoading} className="flex-1">
            Confirm Booking
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
