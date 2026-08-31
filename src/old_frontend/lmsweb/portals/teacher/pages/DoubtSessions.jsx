import { useState, useEffect } from 'react';
import { Plus, Clock, Video, HelpCircle, CalendarPlus } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/modals/index.jsx';
import { FormField, Input, Select, Textarea } from '../../../components/forms/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { teacherAPI } from '../../../api/teacher.js';
import { cn, formatDate } from '../../../utils/helpers.js';
import toast from 'react-hot-toast';

export default function DoubtSessions() {
  const [sessions, setSessions] = useState([]);
  const [showSchedule, setShowSchedule] = useState(null);
  const [showResolve, setShowResolve] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [scheduleForm, setScheduleForm] = useState({ date: '', time: '', meetingLink: '' });
  const [resolveForm, setResolveForm] = useState({ resolutionNotes: '' });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await teacherAPI.getDoubtSessions();
      setSessions(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load doubt sessions');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Doubt Sessions"
        subtitle="Manage student doubt requests and schedule sessions"
        breadcrumbs={['Home', 'Doubt Sessions']}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Requests', value: sessions.length, color: 'text-primary' },
          { label: 'Pending', value: sessions.filter(s => s.status === 'REQUESTED').length, color: 'text-warning-600' },
          { label: 'Scheduled', value: sessions.filter(s => s.status === 'SCHEDULED').length, color: 'text-accent-600' },
        ].map((s, i) => (
          <Card key={i} className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-surface-400 mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.map(session => (
          <Card key={session._id || session.id} className="p-5 flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary flex items-center justify-center">
                <HelpCircle size={18} />
              </div>
              <span className={cn('badge capitalize text-xs', session.status === 'REQUESTED' ? 'badge-warning' : session.status === 'SCHEDULED' ? 'badge-accent' : 'badge-success')}>{session.status}</span>
            </div>
            <h3 className="font-semibold text-surface-800 dark:text-white mb-1">{session.topic}</h3>
            <p className="text-xs text-surface-400 mb-3">Student: {session.studentId?.firstName || 'Unknown'} {session.studentId?.lastName || ''}</p>
            {session.description && <p className="text-sm text-surface-600 dark:text-surface-300 mb-4 flex-1">{session.description}</p>}
            
            {session.scheduledAt && (
              <div className="space-y-2 text-xs text-surface-500 dark:text-surface-400 mb-4 bg-surface-50 dark:bg-surface-800 p-3 rounded-lg">
                <div className="flex items-center gap-2"><CalendarPlus size={12} />{formatDate(session.scheduledAt)}</div>
              </div>
            )}
            
            <div className="mt-auto pt-4 flex gap-2">
              {session.status === 'REQUESTED' && (
                <Button variant="gradient" size="sm" onClick={() => setShowSchedule(session)}>Schedule</Button>
              )}
              {session.status === 'SCHEDULED' && (
                <>
                  {session.meetingLink && <Button variant="primary" size="sm" icon={Video} onClick={() => window.open(session.meetingLink, '_blank')}>Join</Button>}
                  <Button variant="outline" size="sm" onClick={() => setShowResolve(session)}>Resolve</Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Schedule Modal */}
      {showSchedule && (
        <Modal isOpen={!!showSchedule} onClose={() => setShowSchedule(null)} size="md">
          <ModalHeader title="Schedule Session" onClose={() => setShowSchedule(null)} />
          <ModalBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Date" required><Input type="date" value={scheduleForm.date} onChange={e => setScheduleForm(f => ({ ...f, date: e.target.value }))} /></FormField>
              <FormField label="Time" required><Input type="time" value={scheduleForm.time} onChange={e => setScheduleForm(f => ({ ...f, time: e.target.value }))} /></FormField>
            </div>
            <FormField label="Meeting Link (Optional)"><Input type="url" placeholder="https://meet.google.com/..." value={scheduleForm.meetingLink} onChange={e => setScheduleForm(f => ({ ...f, meetingLink: e.target.value }))} /></FormField>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowSchedule(null)}>Cancel</Button>
            <Button variant="gradient" loading={loading} onClick={async () => {
              if (!scheduleForm.date || !scheduleForm.time) return toast.error('Date and time are required');
              setLoading(true);
              try {
                const scheduledAt = new Date(`${scheduleForm.date}T${scheduleForm.time}`).toISOString();
                await teacherAPI.scheduleDoubtSession(showSchedule._id || showSchedule.id, {
                  scheduledAt,
                  meetingLink: scheduleForm.meetingLink || undefined
                });
                toast.success('Session scheduled!');
                setShowSchedule(null);
                setScheduleForm({ date: '', time: '', meetingLink: '' });
                fetchSessions();
              } catch (err) {
                console.error(err);
                toast.error('Failed to schedule session');
              } finally {
                setLoading(false);
              }
            }}>Schedule Session</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Resolve Modal */}
      {showResolve && (
        <Modal isOpen={!!showResolve} onClose={() => setShowResolve(null)} size="md">
          <ModalHeader title="Resolve Session" subtitle={showResolve.topic} onClose={() => setShowResolve(null)} />
          <ModalBody className="space-y-4">
            <FormField label="Resolution Notes" required>
              <Textarea placeholder="How was the doubt resolved?" value={resolveForm.resolutionNotes} onChange={e => setResolveForm(f => ({ ...f, resolutionNotes: e.target.value }))} rows={5} />
            </FormField>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowResolve(null)}>Cancel</Button>
            <Button variant="gradient" loading={loading} onClick={async () => {
              if (!resolveForm.resolutionNotes) return toast.error('Notes are required');
              setLoading(true);
              try {
                await teacherAPI.resolveDoubtSession(showResolve._id || showResolve.id, {
                  resolutionNotes: resolveForm.resolutionNotes
                });
                toast.success('Session resolved!');
                setShowResolve(null);
                setResolveForm({ resolutionNotes: '' });
                fetchSessions();
              } catch (err) {
                console.error(err);
                toast.error('Failed to resolve session');
              } finally {
                setLoading(false);
              }
            }}>Mark Resolved</Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
