import { useState, useEffect } from 'react';
import { CalendarDays, Clock, Users } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card, StatCard } from '../../../components/ui/index.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { adminAPI } from '../../../api/index.js';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function PTMBooking() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bookings');
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);

  const fetchPTMData = async () => {
    try {
      setLoading(true);
      const [slotsRes, bookingsRes] = await Promise.all([
        adminAPI.getPtmSlots(),
        adminAPI.getPtmBookings()
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
    fetchPTMData();
  }, []);

  const bookingColumns = [
    { 
      header: 'Date & Time', 
      cell: (row) => row.slotId ? `${format(new Date(row.slotId.startTime), 'MMM dd, yyyy')} | ${format(new Date(row.slotId.startTime), 'hh:mm a')} - ${format(new Date(row.slotId.endTime), 'hh:mm a')}` : 'N/A'
    },
    { 
      header: 'Teacher', 
      cell: (row) => row.slotId?.teacherId ? `${row.slotId.teacherId.firstName} ${row.slotId.teacherId.lastName}` : 'N/A'
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
      header: 'Status', 
      accessorKey: 'status',
      cell: (row) => (
        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-500">
          {row.status}
        </span>
      )
    },
  ];

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
      header: 'Teacher', 
      cell: (row) => row.teacherId ? `${row.teacherId.firstName} ${row.teacherId.lastName}` : 'N/A'
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

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Parent-Teacher Meetings"
        subtitle="Monitor all PTM sessions across the institute"
        breadcrumbs={['Home', 'PTM Booking']}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Available Slots" value={slots.length} icon={CalendarDays} color="primary" />
        <StatCard title="Total Bookings" value={bookings.length} icon={Users} color="success" />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-surface-200 dark:border-surface-700">
          <nav className="flex gap-4 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'bookings'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300 dark:text-surface-400 dark:hover:text-surface-300'
              }`}
            >
              <Users size={18} />
              All Bookings
            </button>
            <button
              onClick={() => setActiveTab('slots')}
              className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'slots'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300 dark:text-surface-400 dark:hover:text-surface-300'
              }`}
            >
              <Clock size={18} />
              Published Slots
            </button>
          </nav>
        </div>

        <div className="p-5 sm:p-6">
          {activeTab === 'bookings' ? (
            <DataTable
              columns={bookingColumns}
              data={bookings}
              loading={loading}
              searchPlaceholder="Search bookings..."
              emptyIcon={Users}
              emptyTitle="No Bookings Found"
              emptyDescription="No PTM bookings have been made yet."
            />
          ) : (
            <DataTable
              columns={slotColumns}
              data={slots}
              loading={loading}
              searchPlaceholder="Search slots..."
              emptyIcon={CalendarDays}
              emptyTitle="No Slots Found"
              emptyDescription="No teachers have published availability yet."
            />
          )}
        </div>
      </Card>
    </div>
  );
}
