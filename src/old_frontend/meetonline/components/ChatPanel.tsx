import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

interface ChatMessage {
  _id: string;
  senderName: string;
  role: string;
  content: string;
  createdAt: string;
}

interface ChatPanelProps {
  roomCode: string;
  socket: Socket;
  userRole: string;
  commentsEnabled: boolean;
}

export default function ChatPanel({ roomCode, socket, userRole, commentsEnabled }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // 1. Fetch historical messages
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/rooms/${roomCode}/messages`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (res.ok) {
          setMessages(data);
        }
      } catch (err) {
        console.error('Error fetching chat history:', err);
      }
    };

    fetchHistory();

    // 2. Setup socket listener for new messages
    const handleNewMessage = (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    };

    socket.on('chat-message', handleNewMessage);

    return () => {
      socket.off('chat-message', handleNewMessage);
    };
  }, [roomCode, socket]);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    socket.emit('chat-message', {
      roomCode,
      message: inputMessage.trim()
    });

    setInputMessage('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white/40 backdrop-blur-md">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase">Classroom Chat</h3>
        
        {userRole === 'teacher' && (
          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {commentsEnabled ? 'Chat ON' : 'Chat OFF'}
            </span>
            <div className="relative">
              <input
                type="checkbox"
                checked={commentsEnabled}
                onChange={(e) => {
                  socket.emit('toggle-comments', { roomCode, enabled: e.target.checked });
                }}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-brand-600"></div>
            </div>
          </label>
        )}
      </div>

      {/* Chat Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isTeacher = msg.role === 'teacher';
          return (
            <div key={msg._id} className="flex flex-col space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-600">{msg.senderName}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  isTeacher 
                    ? 'bg-brand-500/10 text-brand-600 border border-brand-500/20' 
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {msg.role}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-sm text-slate-800 bg-white border border-slate-200/60 rounded-xl px-4 py-2.5 max-w-[90%] inline-block break-words shadow-sm">
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Send Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white/60">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={inputMessage}
            disabled={userRole !== 'teacher' && !commentsEnabled}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={
              userRole !== 'teacher' && !commentsEnabled
                ? '🔒 Comments disabled by teacher'
                : 'Type a message...'
            }
            className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={userRole !== 'teacher' && !commentsEnabled}
            className="px-4 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-semibold text-sm transition shadow-md shadow-brand-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
