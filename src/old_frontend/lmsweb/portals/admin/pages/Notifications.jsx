import { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, Plus, Send, Clock, Inbox } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card } from '../../../components/ui/index.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/modals/index.jsx';
import { FormField, Input, Select, Textarea, Switch } from '../../../components/forms/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { adminAPI } from '../../../api/index.js';
import { cn, formatDate } from '../../../utils/helpers.js';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'compose', label: 'Send Notification', icon: Send },
  { id: 'announcements', label: 'Announcements', icon: Bell },
  { id: 'history', label: 'Sent History', icon: Clock },
];

const channels = [
  { id: 'push', label: 'Push Notification', icon: Bell, enabled: true },
  { id: 'email', label: 'Email', icon: Mail, enabled: true },
  { id: 'sms', label: 'SMS', icon: MessageSquare, enabled: false },
];

export default function Notifications() {
  const [activeTab, setActiveTab] = useState('compose');
  const [channelStates, setChannelStates] = useState({ push: true, email: true, sms: false });
  const [loading, setLoading] = useState(false);
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (activeTab === 'history' || activeTab === 'announcements') {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    setFetching(true);
    try {
      const res = await adminAPI.getNotifications();
      setNotifications(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const handleSend = async () => {
    if (!title || !message) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    try {
      // Fetch users based on audience
      let params = {};
      if (audience === 'students') params.role = 'student';
      if (audience === 'teachers') params.role = 'teacher';
      if (audience === 'parents') params.role = 'parent';
      
      const res = await adminAPI.getUsers(params);
      const users = res.data?.data || [];
      if (users.length === 0) {
        toast.error('No users found for this audience.');
        setLoading(false);
        return;
      }

      // Send to all fetched users
      const promises = users.map(u => adminAPI.sendNotification({
        userId: u._id || u.id,
        title,
        message,
        type: 'INFO'
      }));
      await Promise.all(promises);

      toast.success(`Notification sent to ${users.length} users!`);
      setTitle(''); setMessage('');
      setActiveTab('history');
    } catch (err) {
      console.error(err);
      toast.error('Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Notification Center"
        subtitle="Send and manage notifications to students, teachers, and parents"
        breadcrumbs={['Home', 'Notifications']}
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-surface-200 dark:border-surface-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn('flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px', activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200')}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 space-y-5">
            <h3 className="font-semibold text-surface-800 dark:text-white">Compose Notification</h3>
            <FormField label="Title" required>
              <Input placeholder="Notification title" value={title} onChange={e => setTitle(e.target.value)} />
            </FormField>
            <FormField label="Message" required>
              <Textarea placeholder="Write your message here..." value={message} onChange={e => setMessage(e.target.value)} rows={5} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Send To">
                <Select value={audience} onChange={e => setAudience(e.target.value)}>
                  <option value="all">All Users</option>
                  <option value="students">Students Only</option>
                  <option value="parents">Parents Only</option>
                  <option value="teachers">Teachers Only</option>
                </Select>
              </FormField>
              <FormField label="Class Filter">
                <Select disabled><option>All Classes</option></Select>
              </FormField>
            </div>
            <div className="flex items-center gap-3 p-4 bg-surface-50 dark:bg-surface-700/50 rounded-xl">
              <Switch checked={false} onChange={() => {}} label="Schedule for later" />
              <Input type="datetime-local" className="ml-4 text-sm" disabled />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline">Save Draft</Button>
              <Button variant="gradient" icon={Send} loading={loading} onClick={handleSend}>Send Now</Button>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="font-semibold text-surface-800 dark:text-white mb-4">Channels</h3>
              <div className="space-y-4">
                {channels.map(ch => (
                  <div key={ch.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', channelStates[ch.id] ? 'bg-primary-100 dark:bg-primary-900/30 text-primary' : 'bg-surface-100 dark:bg-surface-700 text-surface-400')}>
                        <ch.icon size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-surface-700 dark:text-surface-200">{ch.label}</p>
                        <p className="text-xs text-surface-400">{channelStates[ch.id] ? 'Enabled' : 'Disabled'}</p>
                      </div>
                    </div>
                    <Switch checked={channelStates[ch.id]} onChange={() => setChannelStates(s => ({ ...s, [ch.id]: !s[ch.id] }))} size="sm" />
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold text-surface-800 dark:text-white mb-3">Quick Templates</h3>
              <div className="space-y-2">
                {['Fee Reminder', 'Attendance Alert', 'Holiday Notice', 'PTM Reminder', 'Exam Schedule'].map(t => (
                  <button key={t} onClick={() => { setTitle(t); setMessage(`Dear Parent/Student, this is a reminder about: ${t}. Please take necessary action.`); toast.success('Template applied'); }}
                    className="w-full text-left text-sm px-3 py-2 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/20 text-surface-600 dark:text-surface-400 hover:text-primary transition-colors">
                    {t}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="gradient" icon={Plus} onClick={() => setShowAddAnnouncement(true)}>New Announcement</Button>
          </div>
          <Card className="p-12 text-center text-surface-500">
            <Inbox size={48} className="mx-auto mb-4 opacity-50" />
            <p>No announcements found.</p>
          </Card>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {fetching ? (
            <p className="text-center p-6">Loading...</p>
          ) : notifications.length === 0 ? (
            <Card className="p-12 text-center text-surface-500">
              <Inbox size={48} className="mx-auto mb-4 opacity-50" />
              <p>No notification history found.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map(n => (
                <Card key={n._id || n.id} className="p-4 flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary-100 text-primary flex items-center justify-center shrink-0">
                    <Bell size={18} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-surface-800 dark:text-white">{n.title}</h4>
                    <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">{n.message}</p>
                    <p className="text-xs text-surface-400 mt-2">{formatDate(n.createdAt)}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Announcement Modal */}
      {showAddAnnouncement && (
        <Modal isOpen={showAddAnnouncement} onClose={() => setShowAddAnnouncement(false)} size="md">
          <ModalHeader title="Create Announcement" onClose={() => setShowAddAnnouncement(false)} />
          <ModalBody className="space-y-4">
            <FormField label="Title" required>
              <Input placeholder="Announcement Title" />
            </FormField>
            <FormField label="Message" required>
              <Textarea placeholder="Details about the announcement..." rows={4} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Priority">
                <Select>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
              </FormField>
              <FormField label="Target Audience">
                <Select>
                  <option>All Users</option>
                  <option>Students</option>
                  <option>Teachers</option>
                  <option>Parents</option>
                </Select>
              </FormField>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowAddAnnouncement(false)}>Cancel</Button>
            <Button variant="gradient" loading={loading} onClick={async () => {
              setLoading(true); await new Promise(r => setTimeout(r, 600));
              setShowAddAnnouncement(false); setLoading(false); toast.success('Announcement published!');
            }}>Publish</Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
