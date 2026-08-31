import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Send, MessageSquare, Lock, Smile, Sparkles, Heart } from 'lucide-react';

interface ChatMessage {
  _id: string;
  senderName: string;
  role: string;
  content: string;
  createdAt: string;
  likes?: number;
}

interface ChatPanelProps {
  roomCode: string;
  socket: Socket;
  userRole: string;
  commentsEnabled: boolean;
}

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '😂', '🎉', '👏', '🙋‍♂️', '💡'];

const getRoleColor = (role: string) => {
  if (role === 'teacher') return 'from-violet-600 to-purple-700';
  if (role === 'super_admin' || role === 'admin') return 'from-amber-500 to-orange-600';
  return 'from-sky-500 to-blue-600';
};

export default function ChatPanel({ roomCode, socket, userRole, commentsEnabled }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [messageLikes, setMessageLikes] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/rooms/${roomCode}/messages`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) setMessages(data);
      } catch (err) {
        console.error('Error fetching chat history:', err);
      }
    };
    fetchHistory();

    const handleNewMessage = (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    };
    socket.on('chat-message', handleNewMessage);
    return () => { socket.off('chat-message', handleNewMessage); };
  }, [roomCode, socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    socket.emit('chat-message', { roomCode, message: inputMessage.trim() });
    setInputMessage('');
  };

  const handleQuickReaction = (emoji: string) => {
    socket.emit('reaction', { roomCode, emoji });
    // Also send as quick message if user desires
    socket.emit('chat-message', { roomCode, message: emoji });
  };

  const handleLikeMessage = (msgId: string) => {
    setMessageLikes(prev => ({
      ...prev,
      [msgId]: (prev[msgId] || 0) + 1
    }));
    socket.emit('reaction', { roomCode, emoji: '❤️' });
  };

  const canChat = userRole === 'teacher' || commentsEnabled;

  return (
    <div className="flex flex-col h-full text-inherit" style={{ background: 'transparent' }}>
      {/* Teacher toggle */}
      {userRole === 'teacher' && (
        <div className="px-4 py-2 border-b flex items-center justify-between" style={{ borderColor: 'var(--cr-border)' }}>
          <span className="text-xs font-medium" style={{ color: 'var(--cr-muted)' }}>Student chat</span>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${commentsEnabled ? 'text-green-500' : 'text-red-500'}`}>
              {commentsEnabled ? 'ON' : 'OFF'}
            </span>
            <div className="relative">
              <input
                type="checkbox"
                checked={commentsEnabled}
                onChange={(e) => { socket.emit('toggle-comments', { roomCode, enabled: e.target.checked }); }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600" />
            </div>
          </label>
        </div>
      )}

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-white/10">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-8 text-center" style={{ color: 'var(--cr-muted)' }}>
            <MessageSquare className="w-8 h-8 opacity-40" />
            <p className="text-xs">No messages yet in this live class.<br />Be the first to say hi! 👋</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isTeacher = msg.role === 'teacher' || msg.role === 'admin' || msg.role === 'super_admin';
            const initials = (msg.senderName || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            const likesCount = messageLikes[msg._id] || 0;

            return (
              <div key={msg._id} className="flex items-start gap-2.5 group">
                <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${getRoleColor(msg.role)} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5 shadow-sm`}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[11px] font-bold truncate max-w-[120px]">{msg.senderName}</span>
                    {isTeacher && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-300 font-bold uppercase tracking-wider border border-violet-500/20">
                        {msg.role === 'teacher' ? 'Teacher' : 'Admin'}
                      </span>
                    )}
                    <span className="text-[9px] ml-auto font-mono" style={{ color: 'var(--cr-muted)' }}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="relative inline-block max-w-full">
                    <div
                      className={`px-3 py-2 rounded-2xl rounded-tl-sm text-xs md:text-sm break-words shadow-sm border ${
                        isTeacher
                          ? 'bg-violet-500/10 dark:bg-violet-600/20 border-violet-500/30 text-violet-950 dark:text-violet-100 font-medium'
                          : 'bg-white dark:bg-white/5 border-slate-200/80 dark:border-white/5 text-slate-800 dark:text-white/90'
                      }`}
                    >
                      {msg.content}
                    </div>

                    {/* Like button & count */}
                    <div className="flex items-center gap-1 mt-1">
                      <button
                        onClick={() => handleLikeMessage(msg._id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] flex items-center gap-0.5 hover:text-red-500"
                        style={{ color: 'var(--cr-muted)' }}
                        title="React with Heart"
                      >
                        <Heart className="w-3 h-3" />
                      </button>
                      {likesCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-semibold">
                          ❤️ {likesCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Emoji Bar */}
      {canChat && (
        <div className="px-3 pt-2 pb-1 flex items-center gap-1.5 overflow-x-auto border-t" style={{ borderColor: 'var(--cr-border)' }}>
          <span className="text-[10px] font-semibold uppercase tracking-wider flex-shrink-0" style={{ color: 'var(--cr-muted)' }}>
            Quick:
          </span>
          {QUICK_EMOJIS.map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleQuickReaction(emoji)}
              className="text-base w-7 h-7 flex items-center justify-center rounded-lg hover:scale-125 transition-transform flex-shrink-0 active:scale-95"
              style={{ background: 'var(--cr-subtle)' }}
              title={`Send ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="p-3">
        {!canChat ? (
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl text-xs border" style={{ background: 'var(--cr-subtle)', borderColor: 'var(--cr-border)', color: 'var(--cr-muted)' }}>
            <Lock className="w-3.5 h-3.5 flex-shrink-0" />
            Chat has been temporarily disabled by teacher
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask a question or say something..."
              className="flex-1 px-4 py-2.5 rounded-2xl text-xs md:text-sm focus:outline-none border transition-all"
              style={{
                background: 'var(--cr-subtle)',
                borderColor: 'var(--cr-border)',
                color: 'inherit'
              }}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all active:scale-95 flex-shrink-0 shadow-md shadow-violet-600/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
