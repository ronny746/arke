import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface NotesPanelProps {
  roomCode: string;
  socket: Socket;
  token: string;
}

export default function NotesPanel({ roomCode, socket, token }: NotesPanelProps) {
  const [content, setContent] = useState('');
  const [syncState, setSyncState] = useState<'saved' | 'saving' | 'synced'>('synced');

  useEffect(() => {
    // 1. Fetch initial note state
    const fetchNotes = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomCode}/notes`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (res.ok) {
          setContent(data.content || '');
        }
      } catch (err) {
        console.error('Error fetching room notes:', err);
      }
    };

    fetchNotes();

    // 2. Listen for socket real-time updates
    const handleNotesUpdate = ({ content: newContent }: { content: string }) => {
      setContent(newContent);
      setSyncState('synced');
    };

    socket.on('notes-update', handleNotesUpdate);

    return () => {
      socket.off('notes-update', handleNotesUpdate);
    };
  }, [roomCode, socket, token]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    setSyncState('saving');

    // Emit changes to Socket.io server
    socket.emit('notes-update', {
      roomCode,
      content: val
    });

    // Reset indicator to saved after a brief timeout
    setTimeout(() => {
      setSyncState('saved');
    }, 800);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white/40 backdrop-blur-md">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase">Classroom Notes</h3>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
          syncState === 'synced' ? 'bg-green-50 text-green-700 border border-green-200' :
          syncState === 'saving' ? 'bg-amber-50 text-amber-750 border border-amber-200' :
          'bg-brand-50 text-brand-700 border border-brand-200'
        }`}>
          {syncState}
        </span>
      </div>

      {/* Collaborating Editor Textarea */}
      <div className="flex-1 p-4 flex flex-col">
        <textarea
          value={content}
          onChange={handleChange}
          placeholder="Start writing class notes together..."
          className="flex-1 w-full bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500/60 resize-none font-mono shadow-sm"
        />
      </div>
    </div>
  );
}
