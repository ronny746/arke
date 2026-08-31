import { useState, useEffect } from 'react';
import { Send, MessageSquare, Plus, Search } from 'lucide-react';
import { PageHeader } from '../../../components/layout/index.jsx';
import { Card, Avatar } from '../../../components/ui/index.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/modals/index.jsx';
import { FormField, Select } from '../../../components/forms/index.jsx';
import { Button } from '../../../components/ui/Button.jsx';

import { adminAPI } from '../../../api/index.js';
import { useAuthStore } from '../../../store/index.js';
import { cn, formatDate } from '../../../utils/helpers.js';
import toast from 'react-hot-toast';

export default function Communication() {
  const { user } = useAuthStore();
  const [selectedChat, setSelectedChat] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  
  const [showNewChat, setShowNewChat] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [fetchingMsgs, setFetchingMsgs] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await adminAPI.getChatRooms();
      setRooms(res.data?.data || []);
      return res.data?.data || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const selectRoom = async (room) => {
    setSelectedChat(room);
    setFetchingMsgs(true);
    try {
      const res = await adminAPI.getChatMessages(room._id || room.id);
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
      const res = await adminAPI.sendMessage(selectedChat._id || selectedChat.id, { content: messageText });
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
    return otherParticipant && otherParticipant.firstName ? `${otherParticipant.firstName || ''} ${otherParticipant.lastName || ''} (${otherParticipant.role})` : 'Direct Message';
  };

  const loadUsersForRole = async (role) => {
    setSelectedRole(role);
    if (!role) return setUsersList([]);
    try {
      const res = await adminAPI.getUsers({ role });
      const allUsers = Array.isArray(res.data?.data) ? res.data.data : (res.data?.data?.users || []);
      setUsersList(allUsers);
      setSelectedUser('');
    } catch (err) {
      console.error(err);
    }
  };

  const createChat = async () => {
    if (!selectedUser) return toast.error('Please select a user');
    setLoading(true);
    try {
      const res = await adminAPI.createChatRoom({
        type: 'DIRECT',
        participantIds: [selectedUser]
      });
      toast.success('Chat created!');
      setShowNewChat(false);
      setSelectedRole('');
      setSelectedUser('');
      setUsersList([]);
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
      <PageHeader title="Messages" subtitle="Chat with teachers, students and parents" breadcrumbs={['Home', 'Messages']} />

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
            {rooms.length === 0 && <p className="p-4 text-center text-sm text-surface-500">No chats found.</p>}
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

      <Modal isOpen={showNewChat} onClose={() => setShowNewChat(false)} size="sm">
        <ModalHeader title="Start New Chat" onClose={() => setShowNewChat(false)} />
        <ModalBody className="space-y-4">
          <FormField label="Select Role">
            <Select value={selectedRole} onChange={e => loadUsersForRole(e.target.value)}>
              <option value="">-- Choose Role --</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
              <option value="parent">Parent</option>
            </Select>
          </FormField>
          {selectedRole && (
            <FormField label={`Select ${selectedRole}`}>
              <Select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
                <option value="">-- Choose User --</option>
                {usersList.map(u => <option key={u._id || u.id} value={u._id || u.id}>{u.firstName} {u.lastName} ({u.email})</option>)}
              </Select>
            </FormField>
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
