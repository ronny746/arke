import { useState, useEffect } from 'react';
import { Send, MessageSquare, Bell, Users, Search, Plus } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card, Avatar } from '../../../components/ui/index.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/modals/index.jsx';
import { FormField, Input, Textarea, Select } from '../../../components/forms/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';

import { teacherAPI } from '../../../api/teacher.js';
import { adminAPI } from '../../../api/index.js';
import { useAuthStore } from '../../../store/index.js';
import { cn, formatDate } from '../../../utils/helpers.js';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'chats', label: 'Chats', icon: MessageSquare },
  { id: 'announcements', label: 'Announcements', icon: Bell },
];

export default function Communication() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('chats');
  const [selectedChat, setSelectedChat] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  
  const [announcements, setAnnouncements] = useState([]);
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [activeClassId, setActiveClassId] = useState('all');
  const [classes, setClasses] = useState([]);
  
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatClass, setNewChatClass] = useState('');
  const [studentsList, setStudentsList] = useState([]);
  const [selectedRecipientType, setSelectedRecipientType] = useState('STUDENT'); // 'STUDENT' | 'PARENT' | 'GROUP'
  const [selectedUser, setSelectedUser] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [fetchingMsgs, setFetchingMsgs] = useState(false);

  useEffect(() => {
    fetchRooms();
    fetchClasses();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await teacherAPI.getChatRooms();
      setRooms(res.data?.data || []);
      return res.data?.data || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await adminAPI.getAcademicClasses();
      setClasses(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const selectRoom = async (room) => {
    setSelectedChat(room);
    setFetchingMsgs(true);
    try {
      const res = await teacherAPI.getChatMessages(room._id || room.id);
      setMessages(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingMsgs(false);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedChat) return;
    try {
      const res = await teacherAPI.sendMessage(selectedChat._id || selectedChat.id, { content: messageText });
      setMessages(prev => [...prev, res.data?.data || { _id: Date.now(), senderId: user, content: messageText, createdAt: new Date().toISOString() }]);
      setMessageText('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to send message');
    }
  };

  const getChatName = (room) => {
    if (room.type === 'GROUP') return room.name;
    const otherParticipant = room.participants?.find(p => typeof p === 'object' && p !== null && (p._id || p.id) !== (user?._id || user?.id));
    return otherParticipant && otherParticipant.firstName ? `${otherParticipant.firstName || ''} ${otherParticipant.lastName || ''}` : 'Direct Message';
  };

  const loadStudentsForNewChat = async (classId) => {
    setNewChatClass(classId);
    if (!classId) return setStudentsList([]);
    try {
      const selectedCls = classes.find(c => (c._id || c.id) === classId);
      if (selectedCls && selectedCls.students) {
        setStudentsList(selectedCls.students);
      } else {
        const res = await adminAPI.getUsers({ role: 'student', classId });
        const allStudents = Array.isArray(res.data?.data) ? res.data.data : (res.data?.data?.users || []);
        setStudentsList(allStudents);
      }
      setSelectedUser('');
    } catch (err) {
      console.error(err);
    }
  };

  const loadParentsForNewChat = async (classId) => {
    setNewChatClass(classId);
    if (!classId) return setStudentsList([]);
    try {
      const studentRes = await adminAPI.getUsers({ role: 'student', classId });
      const classStudents = Array.isArray(studentRes.data?.data) ? studentRes.data.data : (studentRes.data?.data?.users || []);
      const classStudentIds = classStudents.map(s => String(s._id || s.id));

      const res = await adminAPI.getUsers({ role: 'parent' });
      const allParents = Array.isArray(res.data?.data) ? res.data.data : (res.data?.data?.users || []);
      
      const relevantParents = allParents.filter(p => p.childrenIds?.some(childId => classStudentIds.includes(String(childId))));
      setStudentsList(relevantParents); 
      setSelectedUser('');
    } catch (err) {
      console.error(err);
    }
  };

  const createChat = async () => {
    if (selectedRecipientType !== 'GROUP' && !selectedUser) return toast.error('Please select a user');
    if (selectedRecipientType === 'GROUP' && !newChatClass) return toast.error('Please select a class');
    
    setLoading(true);
    try {
      let payload;
      if (selectedRecipientType === 'GROUP') {
        const selectedCls = classes.find(c => (c._id || c.id) === newChatClass);
        const participantIds = studentsList.map(s => s._id || s.id);
        payload = {
          type: 'GROUP',
          name: `${selectedCls?.name || 'Class'} ${selectedCls?.section || ''} Group`,
          participantIds
        };
      } else {
        payload = {
          type: 'DIRECT',
          participantIds: [selectedUser]
        };
      }

      const res = await teacherAPI.createChatRoom(payload);
      toast.success('Chat created!');
      setShowNewChat(false);
      setSelectedUser('');
      setNewChatName('');
      const updatedRooms = await fetchRooms();
      const newRoomId = res.data?.data?._id || res.data?.data?.id;
      const populatedRoom = updatedRooms.find(r => (r._id || r.id) === newRoomId);
      if (populatedRoom) selectRoom(populatedRoom);
      else if (res.data?.data) selectRoom(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to create chat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Communication" subtitle="Chat with students and parents, send announcements" breadcrumbs={['Home', 'Communication']} />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-surface-200 dark:border-surface-700">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn('flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px', activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-surface-500 dark:text-surface-400')}>
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'chats' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
          {/* Contact List */}
          <Card className="p-0 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-surface-100 dark:border-surface-700 flex items-center justify-between">
              <div className="relative flex-1 mr-2">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input placeholder="Search contacts..." className="form-input pl-9 text-sm h-9 w-full" />
              </div>
              <Button variant="ghost" size="sm" icon={Plus} onClick={() => setShowNewChat(true)} />
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-surface-100 dark:divide-surface-700">
              {rooms.map(room => (
                <div key={room._id || room.id} onClick={() => selectRoom(room)} className={cn('flex items-center gap-3 p-3 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors', selectedChat && (selectedChat._id || selectedChat.id) === (room._id || room.id) && 'bg-primary-50 dark:bg-primary-900/10')}>
                  <div className="relative">
                    <Avatar name={getChatName(room)} size="sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium text-surface-800 dark:text-white truncate">{getChatName(room)}</p>
                      <span className="text-xs text-surface-400">{room.updatedAt ? formatDate(room.updatedAt) : ''}</span>
                    </div>
                    <p className="text-xs text-surface-400 truncate mt-0.5">{room.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Chat Window */}
          <Card className="lg:col-span-2 p-0 overflow-hidden flex flex-col">
            {selectedChat ? (
              <>
                <div className="flex items-center gap-3 p-4 border-b border-surface-100 dark:border-surface-700 bg-surface-50 dark:bg-surface-800">
                  <Avatar name={getChatName(selectedChat)} size="sm" />
                  <div>
                    <p className="font-semibold text-surface-800 dark:text-white text-sm">{getChatName(selectedChat)}</p>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {fetchingMsgs ? <p className="text-center text-surface-400">Loading messages...</p> : messages.map(msg => {
                    const isMe = msg.senderId?._id === user?._id || msg.senderId === user?._id;
                    return (
                      <div key={msg._id || msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                        <div className={cn('max-w-xs px-4 py-2.5 rounded-2xl text-sm', isMe ? 'bg-primary text-white rounded-br-sm' : 'bg-surface-100 dark:bg-surface-700 text-surface-800 dark:text-surface-100 rounded-bl-sm')}>
                          {!isMe && selectedChat.type === 'GROUP' && <p className="text-[10px] opacity-70 mb-1">{msg.senderId?.firstName}</p>}
                          <p>{msg.content}</p>
                          <p className={cn('text-xs mt-1', isMe ? 'text-primary-200' : 'text-surface-400')}>{formatDate(msg.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="p-4 border-t border-surface-100 dark:border-surface-700 flex gap-3">
                  <input value={messageText} onChange={e => setMessageText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." className="form-input flex-1" />
                  <Button variant="primary" icon={Send} onClick={sendMessage} />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <MessageSquare size={48} className="mx-auto mb-4 text-surface-300 dark:text-surface-600" />
                  <p className="text-surface-500 dark:text-surface-400">Select a conversation to start chatting</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold text-surface-700 dark:text-surface-200 mb-4">Send Announcement</h3>
            <div className="space-y-3">
              <FormField label="Announcement Title"><Input value={annTitle} onChange={e => setAnnTitle(e.target.value)} placeholder="e.g. Homework Reminder" /></FormField>
              <FormField label="Message"><Textarea value={annMessage} onChange={e => setAnnMessage(e.target.value)} placeholder="Write your announcement..." rows={3} /></FormField>
              <FormField label="Target Audience">
                <select className="form-select w-full" value={activeClassId} onChange={e => setActiveClassId(e.target.value)}>
                  <option value="all">All My Students</option>
                  {classes.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name} {c.section}</option>)}
                </select>
              </FormField>
              <Button variant="gradient" icon={Send} loading={loading} onClick={async () => {
                if (!annTitle || !annMessage) { toast.error('Fill in all fields'); return; }
                setLoading(true);
                try {
                  const params = { role: 'student' };
                  if (activeClassId !== 'all') params.classId = activeClassId;
                  
                  const res = await adminAPI.getUsers(params);
                  const usersToNotify = res.data?.data || [];
                  
                  if (usersToNotify.length === 0) {
                    toast.error('No students found to notify.');
                    return;
                  }

                  const promises = usersToNotify.map(u => teacherAPI.sendNotification({
                    userId: u._id || u.id,
                    title: annTitle,
                    message: annMessage,
                    type: 'INFO'
                  }));
                  
                  await Promise.all(promises);
                  
                  setAnnouncements(p => [{ id: Date.now(), title: annTitle, message: annMessage, priority: 'normal', target: activeClassId === 'all' ? 'All Students' : classes.find(c => (c._id || c.id) === activeClassId)?.name || 'Class', date: new Date().toISOString() }, ...p]);
                  setAnnTitle(''); setAnnMessage(''); toast.success(`Announcement sent to ${usersToNotify.length} students!`);
                } catch (err) {
                  console.error(err);
                  toast.error('Failed to send announcement');
                } finally {
                  setLoading(false);
                }
              }}>Send Announcement</Button>
            </div>
          </Card>
          {announcements.map(ann => (
            <Card key={ann.id} className="p-5">
              <div className="flex items-start gap-3">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', ann.priority === 'high' ? 'bg-danger-100 dark:bg-danger-900/30 text-danger-600' : 'bg-surface-100 dark:bg-surface-700 text-surface-500')}>
                  <Bell size={16} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-surface-800 dark:text-white">{ann.title}</p>
                  <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">{ann.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-surface-400">{ann.date.includes('T') ? new Date(ann.date).toLocaleDateString() : ann.date}</span>
                    <span className="badge badge-surface capitalize">{ann.target}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showNewChat} onClose={() => setShowNewChat(false)} size="sm">
        <ModalHeader title="Start New Chat" onClose={() => setShowNewChat(false)} />
        <ModalBody className="space-y-4">
          <FormField label="Chat Type">
            <Select value={selectedRecipientType} onChange={e => { setSelectedRecipientType(e.target.value); setSelectedUser(''); setStudentsList([]); setNewChatClass(''); }}>
              <option value="STUDENT">Direct Message - Student</option>
              <option value="PARENT">Direct Message - Parent</option>
              <option value="GROUP">Group Chat - Class</option>
            </Select>
          </FormField>
          
          <FormField label="Select Class">
            <Select value={newChatClass} onChange={e => {
              if (selectedRecipientType === 'PARENT') loadParentsForNewChat(e.target.value);
              else loadStudentsForNewChat(e.target.value);
            }}>
              <option value="">-- Choose Class --</option>
              {classes.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name} {c.section}</option>)}
            </Select>
          </FormField>
          
          {newChatClass && selectedRecipientType !== 'GROUP' && (
            <FormField label={selectedRecipientType === 'STUDENT' ? 'Select Student' : 'Select Parent'}>
              <Select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
                <option value="">-- Choose User --</option>
                {studentsList.map(s => <option key={s._id || s.id} value={s._id || s.id}>{s.firstName} {s.lastName}</option>)}
              </Select>
            </FormField>
          )}
          {newChatClass && selectedRecipientType === 'GROUP' && (
            <div className="p-3 bg-primary-50 dark:bg-primary-900/10 rounded-lg text-sm text-primary-700 dark:text-primary-300">
              A group chat will be created with you and all {studentsList.length} students of this class.
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowNewChat(false)}>Cancel</Button>
          <Button variant="gradient" loading={loading} onClick={createChat}>Start Chat</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
